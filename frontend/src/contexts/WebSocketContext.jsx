import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { wsService } from '../services/websocket/stompClient';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  // Incremented on every successful STOMP connect (1 = first, 2+ = reconnect)
  const [connectCount, setConnectCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && token) {
      wsService.connect(
        token,
        // onConnect receives the running connectCount from stompClient
        (count) => {
          setIsConnected(true);
          setConnectCount(count);
        },
        () => setIsConnected(false)
      );
    } else {
      wsService.disconnect();
      setIsConnected(false);
      setConnectCount(0);
    }

    return () => {
      wsService.disconnect();
    };
  }, [token, isAuthenticated]);

  return (
    <WebSocketContext.Provider value={{ isConnected, connectCount, wsService }}>
      {children}
    </WebSocketContext.Provider>
  );
};
