import './wasm.js';
import { stream } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import pako from 'pako';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getServerURL, isDockerDesktop, isElectron } from './helper';

interface GadgetInfo {
  name: string;
  version: string;
  description?: string;
  // Add other gadget info properties as needed
}

interface GadgetParams {
  version: number;
  imageName: string;
  // Add other common parameters as needed
}

interface RunGadgetCallbacks {
  onDone: () => void;
  onError: (error: Error) => void;
  onGadgetInfo: (info: GadgetInfo) => void;
  onData: (dsID: string, data: unknown) => void;
  onReady: () => void;
}
interface RunGadgetParams extends GadgetParams {
  instanceId?: string;
  options?: Record<string, unknown>;
  paramValues: any;
}

// Type definitions
export interface IGConnection {
  getGadgetInfo: (
    params: any,
    onSuccess: (info: any) => void,
    onError: (error: Error) => void
  ) => void;
  createGadgetInstance: (
    params,
    onSuccess: (instance: any) => void,
    onError: (error: Error) => void
  ) => void;
  listGadgetInstances: (
    onSuccess: (instances: any[]) => void,
    onError: (error: Error) => void
  ) => void;
  deleteGadgetInstance: (
    id: string,
    onSuccess: () => void,
    onError: (error: Error) => void
  ) => void;
  attachGadgetInstance: ({ ...params }, { ...RunGadgetCallbacks }) => void;
  runGadget: (
    params: RunGadgetParams,
    callbacks: RunGadgetCallbacks,
    onSetupError: (error: Error) => void
  ) => void;
  // Add other IG methods as needed
}

interface PortForwardState {
  ig: IGConnection | null;
  isConnected: boolean;
  error?: Error;
}

interface StreamRef {
  cancel: () => void;
  getSocket: () => WebSocket | null;
}

// WebAssembly initialization
let igPromise: Promise<WebAssembly.WebAssemblyInstantiatedSource> | null = null;
const go = new (window as any).Go();
const PLUGIN_NAME = 'inspektor-gadget';
async function fetchWasmWithFallback(pluginName: string): Promise<Response> {
  // Headlamp serves plugins from different paths depending on how they were installed.
  // We try all possible prefixes to find the correct one.
  const prefixes = ['plugins', 'user-plugins', 'static-plugins'];
  const isDesktop = isElectron() || isDockerDesktop();
  const baseUrl = isDesktop ? getServerURL() : '';

  for (const prefix of prefixes) {
    const url = `${baseUrl}/${prefix}/${pluginName}/main.wasm.gz`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch (e) {
      // Ignore error and try the next prefix
    }
  }
  throw new Error(`Failed to fetch WASM for ${pluginName}. Checked paths: ${prefixes.join(', ')}`);
}

/**
 * Initializes and returns the WebAssembly instance
 * Implements singleton pattern to ensure only one instance is created
 */
async function getIG(): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  if (!igPromise) {
    try {
      const response = await fetchWasmWithFallback(PLUGIN_NAME);

      const gzippedData = await response.arrayBuffer();
      const decompressedData = pako.inflate(gzippedData);
      const wasmResponse = new Response(decompressedData);

      igPromise = wasmResponse
        .arrayBuffer()
        .then(buffer => WebAssembly.instantiate(buffer, go.importObject))
        .then(result => {
          go.run(result.instance)
            .then(() => {
              console.error('Something went wrong while running the WebAssembly instance');
            })
            .catch(err => {
              console.error('Error running WebAssembly instance:', err);
            });
          return result;
        })
        .catch(error => {
          igPromise = null;
          throw error;
        });
    } catch (error) {
      console.error('Failed to initialize WebAssembly:', error);
      igPromise = null;
      throw error;
    }
  }
  return igPromise;
}

/**
 * Custom hook for handling port forwarding connections with auto-reconnection
 * @param url - The URL to connect to, can be null if no connection is needed
 * @returns PortForwardState object containing connection status and IG instance
 */
const usePortForward = (url: string | null): PortForwardState => {
  // State for tracking connection status and IG instance
  const [state, setState] = useState<PortForwardState>({
    ig: null,
    isConnected: false,
  });

  // Refs for tracking active connections, retries, and component mounted status
  const streamRef = useRef<Record<string, StreamRef>>({});
  const socketRef = useRef<Record<string, WebSocket>>({});
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const retryCountRef = useRef<Record<string, number>>({});

  const MAX_RETRY_COUNT = 5;
  const INITIAL_RETRY_DELAY = 1000;

  /**
   * Cleans up resources for a specific URL
   */
  const cleanup = useCallback((targetUrl: string, isReconnecting = false) => {
    // Close and cleanup WebSocket
    if (socketRef.current[targetUrl]) {
      socketRef.current[targetUrl].close();
      delete socketRef.current[targetUrl];
    }

    // Cancel and cleanup stream
    if (streamRef.current[targetUrl]) {
      streamRef.current[targetUrl].cancel();
      delete streamRef.current[targetUrl];
    }

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current[targetUrl]) {
      clearTimeout(reconnectTimeoutRef.current[targetUrl]);
      delete reconnectTimeoutRef.current[targetUrl];
    }

    // Update state if component is still mounted and we're not just about to reconnect
    if (mountedRef.current && !isReconnecting) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        ig: null,
        error: undefined,
      }));
    }
  }, []);

  /**
   * Prepares WebSocket connection with timeout
   */
  const prepareSocket = useCallback(async (targetUrl: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Socket connection timeout after 10 seconds'));
      }, 10000); // 10 second timeout

      const checkSocket = () => {
        const socket = streamRef.current[targetUrl]?.getSocket();
        if (socket) {
          clearTimeout(timeoutId);
          resolve(socket);
        } else if (mountedRef.current) {
          setTimeout(checkSocket, 10);
        } else {
          clearTimeout(timeoutId);
          reject(new Error('Component unmounted while waiting for socket'));
        }
      };

      checkSocket();
    });
  }, []);

  /**
   * Main connection function that can be retried
   */
  const initConnection = useCallback(
    async (targetUrl: string) => {
      if (!targetUrl || !mountedRef.current) return;

      try {
        await getIG();

        if (!mountedRef.current) return;

        const additionalProtocols = [
          'v4.channel.k8s.io',
          'v3.channel.k8s.io',
          'v2.channel.k8s.io',
          'channel.k8s.io',
        ];

        // Initialize stream
        streamRef.current[targetUrl] = await stream(targetUrl, () => {}, { additionalProtocols });

        // Get socket with timeout
        const socket = await prepareSocket(targetUrl);
        if (!mountedRef.current) {
          socket.close();
          return;
        }

        socketRef.current[targetUrl] = socket;

        // Reset retry count on successful connection
        retryCountRef.current[targetUrl] = 0;

        // Initialize IG connection
        const igConnection = (window as any).wrapWebSocket(socket, {
          onReady: () => {
            if (mountedRef.current) {
              setState({
                ig: igConnection,
                isConnected: true,
                error: undefined,
              });
            }
          },
          onError: (error: Error) => {
            console.error(`IG connection error for ${targetUrl}:`, error);
            handleReconnect(targetUrl);
          },
          onClose: () => {
            console.warn(`IG connection closed for ${targetUrl}`);
            handleReconnect(targetUrl);
          },
        });
      } catch (error) {
        console.error('Failed to initialize connection:', error);
        handleReconnect(targetUrl);
      }
    },
    [cleanup, prepareSocket]
  );

  /**
   * Handles reconnection logic with exponential backoff
   */
  const handleReconnect = useCallback(
    (targetUrl: string) => {
      if (!mountedRef.current || !targetUrl) return;

      cleanup(targetUrl, true);

      const currentRetryCount = retryCountRef.current[targetUrl] || 0;
      if (currentRetryCount < MAX_RETRY_COUNT) {
        const nextRetryCount = currentRetryCount + 1;
        retryCountRef.current[targetUrl] = nextRetryCount;

        const delay = INITIAL_RETRY_DELAY * Math.pow(2, currentRetryCount);
        console.log(`Reconnecting to ${targetUrl} in ${delay}ms (attempt ${nextRetryCount})`);

        reconnectTimeoutRef.current[targetUrl] = setTimeout(() => {
          if (mountedRef.current) {
            initConnection(targetUrl);
          }
        }, delay);

        setState(prev => ({
          ...prev,
          isConnected: false,
          ig: null,
          error: new Error(`Connection lost. Retrying (attempt ${nextRetryCount})...`),
        }));
      } else {
        console.error(`Max reconnection attempts reached for ${targetUrl}`);
        setState(prev => ({
          ...prev,
          isConnected: false,
          ig: null,
          error: new Error('Maximum reconnection attempts reached. Please check your connection.'),
        }));
      }
    },
    [cleanup, initConnection]
  );

  /**
   * Handle component mounting/unmounting
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      // Cleanup all connections and timeouts on unmount
      Object.keys(socketRef.current).forEach(u => cleanup(u));
      Object.keys(reconnectTimeoutRef.current).forEach(u => {
        clearTimeout(reconnectTimeoutRef.current[u]);
        delete reconnectTimeoutRef.current[u];
      });
    };
  }, [cleanup]);

  /**
   * Main connection effect
   */
  useEffect(() => {
    if (!url) {
      // Reset state when url is null and cleanup any existing connections
      setState({
        ig: null,
        isConnected: false,
        error: undefined,
      });
      Object.keys(socketRef.current).forEach(u => cleanup(u));
      return;
    }

    // Reset retry count for new URL
    retryCountRef.current[url] = 0;
    initConnection(url);

    // Cleanup on url change
    return () => {
      cleanup(url);
    };
  }, [url, cleanup, initConnection]);

  return state;
};

export default usePortForward;
