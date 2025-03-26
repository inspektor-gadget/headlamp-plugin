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

/**
 * Initializes and returns the WebAssembly instance
 * Implements singleton pattern to ensure only one instance is created
 */
async function getIG(): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  if (!igPromise) {
    try {
      let response;
      if (isElectron() || isDockerDesktop()) {
        response = await fetch(getServerURL() + '/plugins/headlamp-ig/main.wasm.gz');
      } else {
        response = await fetch('/plugins/headlamp-ig/main.wasm.gz');
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.statusText}`);
      }

      const gzippedData = await response.arrayBuffer();
      const decompressedData = pako.inflate(gzippedData);
      const wasmResponse = new Response(decompressedData);

      igPromise = wasmResponse
        .arrayBuffer()
        .then(buffer => WebAssembly.instantiate(buffer, go.importObject))
        .then(result => {
          go.run(result.instance)
            .then(() => {
              // console.log('WebAssembly instance initialized successfully');
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
 * Custom hook for handling port forwarding connections
 * @param url - The URL to connect to, can be null if no connection is needed
 * @returns PortForwardState object containing connection status and IG instance
 */
const usePortForward = (url: string | null): PortForwardState => {
  // State for tracking connection status and IG instance
  const [state, setState] = useState<PortForwardState>({
    ig: null,
    isConnected: false,
  });

  // Refs for tracking active connections and component mounted status
  const streamRef = useRef<Record<string, StreamRef>>({});
  const socketRef = useRef<Record<string, WebSocket>>({});
  const mountedRef = useRef(true);

  /**
   * Cleans up resources for a specific URL
   */
  const cleanup = useCallback((targetUrl: string) => {
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

    // Update state if component is still mounted
    if (mountedRef.current) {
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
          setTimeout(checkSocket, 100);
        } else {
          clearTimeout(timeoutId);
          reject(new Error('Component unmounted while waiting for socket'));
        }
      };

      checkSocket();
    });
  }, []);

  /**
   * Handle component mounting/unmounting
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      // Cleanup all connections on unmount
      Object.keys(socketRef.current).forEach(cleanup);
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
      Object.keys(socketRef.current).forEach(cleanup);
      return;
    }

    let isCurrentRequest = true;

    const initConnection = async () => {
      try {
        await getIG();

        if (!isCurrentRequest || !mountedRef.current) {
          return;
        }

        const additionalProtocols = [
          'v4.channel.k8s.io',
          'v3.channel.k8s.io',
          'v2.channel.k8s.io',
          'channel.k8s.io',
        ];

        // Initialize stream
        streamRef.current[url] = await stream(url, () => {}, { additionalProtocols });

        // Get socket with timeout
        const socket = await prepareSocket(url);
        if (!isCurrentRequest || !mountedRef.current) {
          socket.close();
          return;
        }

        socketRef.current[url] = socket;

        // Initialize IG connection
        const igConnection = (window as any).wrapWebSocket(socket, {
          onReady: () => {
            if (isCurrentRequest && mountedRef.current) {
              setState({
                ig: igConnection,
                isConnected: true,
                error: undefined,
              });
            }
          },
          onError: (error: Error) => {
            console.error(`IG connection error for ${url}:`, error);
            if (mountedRef.current) {
              setState(prev => ({
                ...prev,
                error,
                isConnected: false,
                ig: null,
              }));
            }
            cleanup(url);
          },
          onClose: () => {
            if (mountedRef.current) {
              setState(prev => ({
                ...prev,
                isConnected: false,
                ig: null,
                error: new Error('Connection closed'),
              }));
              cleanup(url);
            }
          },
        });
      } catch (error) {
        console.error('Failed to initialize connection:', error);
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error : new Error(String(error)),
            isConnected: false,
            ig: null,
          }));
        }
        cleanup(url);
      }
    };

    // Start connection
    initConnection();

    // Cleanup on url change or unmount
    return () => {
      isCurrentRequest = false;
      cleanup(url);
    };
  }, [url, cleanup, prepareSocket]);

  return state;
};

export default usePortForward;
