import './wasm.js';
import { stream } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { useEffect, useRef, useState } from 'react';

// @ts-ignore
const go = new window.Go();

let igPromise;

async function getIG() {
  if (!igPromise) {
    igPromise = WebAssembly.instantiateStreaming(
      fetch('/plugins/headlamp-ig/main.wasm'),
      go.importObject
    ).then(result => {
      go.run(result.instance);
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
        console.log(`Stream for ${url} is`, streamRef.current[url]);

        const socket = await prepareSocket(url);
        setWs(prevWs => ({ ...prevWs, [url]: socket }));
        console.log(`Socket for ${url} is`, socket);

        // @ts-ignore
        const igConnection = wrapWebSocket(socket, {
          onReady: () => {
            setIsConnected(prevState => ({ ...prevState, [url]: true }));
            console.log(`IG for ${url} is`, igConnection);
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
