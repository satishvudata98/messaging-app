import React, { useRef, useEffect } from 'react';
import './MessageList.css';

const MessageList = ({ messages = [] }) => {
  const messagesEndRef = useRef(null);
  const socket = require('../services/socketIO').getSocket();
  const currentUserId = socket?.user?.id;

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderMessage = (message, index) => {
    // Sender id may be under different properties depending on source
    const senderId = message?.sender?.id || message?.senderId || message?.sender_id;
    const isSent = !!(senderId && currentUserId && senderId === currentUserId);

    // Timestamp fallback
    const ts = message?.timestamp || message?.created_at || message?.createdAt || Date.now();
    let timeStr = '';
    try {
      timeStr = new Date(ts).toLocaleTimeString();
    } catch (e) {
      timeStr = '';
    }

    return (
      <div key={index} className={`message ${isSent ? 'sent' : 'received'}`}>
        <div className="message-content">{message?.content ?? ''}</div>
        <div className="message-timestamp">{timeStr}</div>
      </div>
    );
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        messages.map(renderMessage)
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
