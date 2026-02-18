import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { userAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socketIO';
import ChatWindow from '../components/ChatWindow';
import UserList from '../components/UserList';
import './ChatPage.css';

export const ChatPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }

    // Connect Socket.IO
    connectSocket(token);

    // Fetch users
    const fetchUsers = async () => {
      try {
        const response = await userAPI.getAll();
        const filteredUsers = response.data.filter((u) => u.id !== user?.id);
        setUsers(filteredUsers);
      } catch (err) {
        setError('Failed to load users');
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      // Note: We don't disconnect here to keep messaging alive
    };
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      disconnectSocket();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return <div className="chat-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Messaging App</h1>
        <div className="user-info">
          <span>{user?.username}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="chat-content">
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />

        {selectedUser ? (
          <ChatWindow selectedUser={selectedUser} />
        ) : (
          <div className="no-user-selected">
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};
