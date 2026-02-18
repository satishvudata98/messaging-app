import { useEffect, useState, useCallback } from 'react';
import { getSocket, onReceiveMessage, onUserOnline, onUserOffline } from '../services/socketIO';

export const useMessaging = () => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [error, setErrorState] = useState(null);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const setError = useCallback((err) => {
    console.error('Messaging error:', err);
    setErrorState(err);
  }, []);

  useEffect(() => {
    const unsubscribeMessage = onReceiveMessage((message) => {
      addMessage(message);
    });

    const unsubscribeOnline = onUserOnline((data) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    });

    const unsubscribeOffline = onUserOffline((data) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    return () => {
      unsubscribeMessage?.();
      unsubscribeOnline?.();
      unsubscribeOffline?.();
    };
  }, [addMessage]);

  return {
    messages,
    onlineUsers,
    error,
    addMessage,
    clearMessages,
    setError
  };
};
