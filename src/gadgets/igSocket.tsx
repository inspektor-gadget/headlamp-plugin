import './wasm.js';
import { useEffect, useRef, useState } from 'react';
import { stream } from '@kinvolk/headlamp-plugin/lib/ApiProxy';

// @ts-ignore
const go = new window.Go();

const usePortForward = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const streamRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [ig, setIg] = useState(null);
  async function prepareSocket() {
    return new Promise((resolve, reject) => {
      let intervalID = setInterval(() => {
        let socket = streamRef.current?.getSocket();

        if (socket) {
          clearInterval(intervalID);
          resolve(socket);
        }
      }, 0);
    });
  }
  
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    }
  }, [])

  useEffect(() => {
      // @ts-ignore
      WebAssembly.instantiateStreaming(fetch("/plugins/headlamp-ig/main.wasm"), go.importObject).then((result) => {
        go.run(result.instance);
        (async function() {
          let additionalProtocols = [
            'v4.channel.k8s.io',
            'v3.channel.k8s.io',
            'v2.channel.k8s.io',
            'channel.k8s.io',
          ]
          streamRef.current = await stream(url, () => {
        }, {
          additionalProtocols
        })
          console.log('stream is', streamRef.current);
          let socket = await prepareSocket();
          setWs(socket);
          console.log('socket is', socket);
          // @ts-ignore
          const ig = wrapWebSocket(socket, {});
          setTimeout(() => {
            setIsConnected(true);
            console.log('ig is', ig);
            setIg(ig);
          }, 1000)
        })()
        })
  }, [url]);

  return { ig, isConnected};
};

export default usePortForward;
