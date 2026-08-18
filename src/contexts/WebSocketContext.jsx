import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (isAuthenticated && token) {
      wsService.connect(
        token,
        () => setIsConnected(true),
        () => setIsConnected(false)
      );
    } else {
      wsService.disconnect();
      setIsConnected(false);
    }

    return () => {
      wsService.disconnect();
    };
  }, [token, isAuthenticated]);

  return (
    <WebSocketContext.Provider value={{ isConnected, wsService }}>
      {children}
    </WebSocketContext.Provider>
  );
};
