import React from 'react';
import './UserList.css';

const UserList = ({ users, selectedUser, onSelectUser }) => {
  return (
    <div className="user-list-container">
      <h3>Contacts</h3>
      <div className="user-list">
        {users.length === 0 ? (
          <p className="no-users">No users available</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
              onClick={() => onSelectUser(user)}
            >
              <div className="user-avatar">{user.username[0].toUpperCase()}</div>
              <div className="user-details">
                <p className="user-name">{user.username}</p>
                <p className="user-email">{user.email}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;
