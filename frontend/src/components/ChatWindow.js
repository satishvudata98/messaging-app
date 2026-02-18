import React, { useEffect, useState } from 'react';
import { sendPrivateMessage, getSocket } from '../services/socketIO';
import { messageAPI } from '../services/api';
import { useMessaging } from '../hooks/useMessaging';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import VideoCall from './VideoCall';
import './ChatWindow.css';

const ChatWindow = ({ selectedUser }) => {
  const { messages, addMessage } = useMessaging();
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);

  // Load message history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await messageAPI.getBetween(selectedUser.id);
        setChatMessages(response.data || []);
      } catch (error) {
        console.error('Error loading message history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [selectedUser]);

  // Listen for new messages for this user
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Only add message if it's from the currently selected user
      if (
        message.sender.id === selectedUser.id ||
        message.sender.id === socket.user?.id
      ) {
        setChatMessages((prev) => [...prev, message]);
      }
    };

    socket.on('receive-message', handleNewMessage);

    return () => {
      socket.off('receive-message', handleNewMessage);
    };
  }, [selectedUser]);

  const handleSendMessage = (content) => {
    sendPrivateMessage(selectedUser.id, content);

    // Add message to local state optimistically
    const socket = getSocket();
    if (socket?.user) {
      const optimisticMessage = {
        sender: {
          id: socket.user.id,
          username: socket.user.username,
        },
        content,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, optimisticMessage]);
    }
  };

  return (
    <div className="chat-window-container">
      <div className="chat-window-header">
        <h2>{selectedUser.username}</h2>
        <button
          className="video-call-button"
          onClick={() => setShowVideoCall(true)}
          title="Start video call"
        >
          📹
        </button>
      </div>

      {showVideoCall && (
        <VideoCall
          selectedUser={selectedUser}
          onClose={() => setShowVideoCall(false)}
        />
      )}

      <div className="chat-window-content">
        {loadingHistory ? (
          <div className="loading-messages">Loading messages...</div>
        ) : (
          <MessageList messages={chatMessages} />
        )}
      </div>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatWindow;
