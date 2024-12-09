import './wasm.js';
import { stream } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import pako from 'pako';
import { useEffect, useRef, useState } from 'react';

// @ts-ignore
const go = new window.Go();

let igPromise;

async function getIG() {
  if (!igPromise) {
    const response = await fetch('/plugins/headlamp-ig/main.wasm.gz');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    // Step 2: Read the file as ArrayBuffer
    const gzippedData = await response.arrayBuffer();

    // Step 3: Decompress the gzipped data using pako
    const decompressedData = pako.inflate(gzippedData);

    // Step 4: Create a Response object from the decompressed data (for WebAssembly)
    const wasmResponse = new Response(decompressedData);

    // Step 5: Instantiate the WASM module using the Response object
    igPromise = wasmResponse
      .arrayBuffer()
      .then(buffer => WebAssembly.instantiate(buffer, go.importObject))
      .then(result => {
        go.run(result.instance);
        return result; // Return the instantiated result
      });
  }
  return igPromise;
}

const usePortForward = url => {
  const [isConnected, setIsConnected] = useState({});
  const streamRef = useRef({});
  const [ws, setWs] = useState({});
  const [ig, setIg] = useState({});

  async function prepareSocket(url) {
    return new Promise(resolve => {
      const intervalID = setInterval(() => {
        const socket = streamRef.current[url]?.getSocket();

        if (socket) {
          clearInterval(intervalID);
          resolve(socket);
        }
      }, 0);
    });
  }

  useEffect(() => {
    return () => {
      Object.values(ws).forEach(socket => {
        if (socket) {
          // @ts-ignore
          socket.close();
        }
      });
    };
  }, [ws]);

  useEffect(() => {
    if (!url) return;

    // @ts-ignore
    getIG().then(result => {
      console.log('IG is', result);
      (async function () {
        const additionalProtocols = [
          'v4.channel.k8s.io',
          'v3.channel.k8s.io',
          'v2.channel.k8s.io',
          'channel.k8s.io',
        ];
        streamRef.current[url] = await stream(url, () => {}, { additionalProtocols });

        const socket = await prepareSocket(url);
        setWs(prevWs => ({ ...prevWs, [url]: socket }));

        // @ts-ignore
        const igConnection = wrapWebSocket(socket, {
          onReady: () => {
            setIsConnected(prevState => ({ ...prevState, [url]: true }));
            setIg(prevIg => ({ ...prevIg, [url]: igConnection }));
          },
          onError: error => {
            console.error(`IG for ${url} error`, error);
          },
        });
      })();

      return () => {
        streamRef.current[url].cancel();
        delete streamRef.current[url];
      };
    });
  }, [url]);

  return { ig: ig[url], isConnected: isConnected[url] };
};

export default usePortForward;
