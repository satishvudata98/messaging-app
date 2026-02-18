import io from 'socket.io-client';

let socket = null;

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const sendPrivateMessage = (receiverId, content) => {
  if (socket?.connected) {
    socket.emit('private-message', { receiverId, content });
  }
};

export const callUser = (receiverId, offer, callId) => {
  if (socket?.connected) {
    socket.emit('call-user', { receiverId, offer, callId });
  }
};

export const answerCall = (callId, answer, receiverId) => {
  if (socket?.connected) {
    socket.emit('answer-call', { callId, answer, receiverId });
  }
};

export const sendIceCandidate = (receiverId, candidate, callId) => {
  if (socket?.connected) {
    socket.emit('ice-candidate', { receiverId, candidate, callId });
  }
};

export const rejectCall = (callId, receiverId, reason) => {
  if (socket?.connected) {
    socket.emit('reject-call', { callId, receiverId, reason });
  }
};

export const endCall = (callId, receiverId) => {
  if (socket?.connected) {
    socket.emit('end-call', { callId, receiverId });
  }
};

export const onReceiveMessage = (callback) => {
  if (socket) {
    socket.on('receive-message', callback);
  }
};

export const onIncomingCall = (callback) => {
  if (socket) {
    socket.on('incoming-call', callback);
  }
};

export const onCallAnswered = (callback) => {
  if (socket) {
    socket.on('call-answered', callback);
  }
};

export const onICECandidate = (callback) => {
  if (socket) {
    socket.on('ice-candidate', callback);
  }
};

export const onCallRejected = (callback) => {
  if (socket) {
    socket.on('call-rejected', callback);
  }
};

export const onCallEnded = (callback) => {
  if (socket) {
    socket.on('call-ended', callback);
  }
};

export const onUserOnline = (callback) => {
  if (socket) {
    socket.on('user-online', callback);
  }
};

export const onUserOffline = (callback) => {
  if (socket) {
    socket.on('user-offline', callback);
  }
};

export const onMessageSent = (callback) => {
  if (socket) {
    socket.on('message-sent', callback);
  }
};

export const onMessageError = (callback) => {
  if (socket) {
    socket.on('message-error', callback);
  }
};
