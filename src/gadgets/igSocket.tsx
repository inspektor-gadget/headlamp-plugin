import { useCallback, useEffect, useRef, useState } from 'react';
import { stream } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { JsonStreamParser } from './helper';

const usePortForward = (url) => {
  const decoder = new TextDecoder('utf-8');
  const [isConnected, setIsConnected] = useState(false);
  const streamRef = useRef(null);
  const [ws, setWs] = useState(null);
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
    if(!ws) {
      return;
    }

    ws.addEventListener('open', () => {
      setIsConnected(true);
    })

    ws.addEventListener('message', (event) => {
      const items = new Uint8Array(event.data);
        const text = decoder.decode(items.slice(1));
  
        if (items.length === 3) {
          console.log('channel:', items[0])
          console.log('port:', items[1] + items[2] * 256)
          return;
      }
        console.log("text is ", text)
        const parser = new JsonStreamParser();
        parser.feed(text);
    })
  }, [ws])

  useEffect(() => {
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
       let socket = await prepareSocket();
      setWs(socket);
      console.log('socket is', socket);
    }()
  )
  }, [url]);

  function runGadgetWithActionAndPayload(action, payload, extraParams = {}) {
    if(!ws) {
      return
    }
    console.log('action and payload', action, payload);
    ws.send('\0' + JSON.stringify({ action, payload, ...extraParams }) + '\n');
  }

  return { runGadgetWithActionAndPayload, isConnected, ws};
};

export default usePortForward;
