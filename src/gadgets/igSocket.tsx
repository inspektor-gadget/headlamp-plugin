import { useCallback, useEffect, useRef, useState } from 'react';

import { JsonStreamParser } from './helper';

const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const websocketRef = useRef(null);

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
    }}
  }, [])

  useEffect(() => {
    const ws = new WebSocket(url);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const text = event.data;
      

      const parser = new JsonStreamParser();
      parser.feed(text);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = useCallback(
    (message) => {
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(message);
      } else {
        console.log('WebSocket is not in OPEN state');
      }
    },
    []
  );

  return { sendMessage, isConnected, ws: websocketRef.current};
};

export default useWebSocket;
