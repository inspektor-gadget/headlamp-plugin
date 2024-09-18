import './wasm.js';
import { useEffect, useRef, useState } from 'react';
import { stream } from '@kinvolk/headlamp-plugin/lib/ApiProxy';

// @ts-ignore
const go = new window.Go();

const usePortForward = (url) => {
  const [isConnected, setIsConnected] = useState({});
  const streamRef = useRef({});
  const [ws, setWs] = useState({});
  const [ig, setIg] = useState({});
  
  async function prepareSocket(url) {
    return new Promise((resolve) => {
      let intervalID = setInterval(() => {
        let socket = streamRef.current[url]?.getSocket();

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
    WebAssembly.instantiateStreaming(fetch("/plugins/headlamp-ig/main.wasm"), go.importObject).then((result) => {
      go.run(result.instance);
      (async function() {
        let additionalProtocols = [
          'v4.channel.k8s.io',
          'v3.channel.k8s.io',
          'v2.channel.k8s.io',
          'channel.k8s.io',
        ];
        streamRef.current[url] = await stream(url, () => {}, { additionalProtocols });
        console.log(`Stream for ${url} is`, streamRef.current[url]);

        let socket = await prepareSocket(url);
        setWs(prevWs => ({ ...prevWs, [url]: socket }));

        // @ts-ignore
        const igConnection = wrapWebSocket(socket, {
          onReady: () =>{
            setIsConnected(prevState => ({ ...prevState, [url]: true }));
            console.log(`IG for ${url} is`, igConnection);
            setIg(prevIg => ({ ...prevIg, [url]: igConnection }));
          },
          onError: (error) => {
            console.error(`IG for ${url} error`, error);
          }
        });
      })();
    });
  }, [url]);

  return { ig: ig[url], isConnected: isConnected[url] };
};

export default usePortForward;
