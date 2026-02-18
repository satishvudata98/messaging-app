const { verifyAccessToken } = require('../services/tokenService');
const Message = require('../models/Message');

const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  const user = verifyAccessToken(token);
  if (!user) {
    return next(new Error('Invalid token'));
  }

  socket.user = user;
  next();
};

const setupSocketHandlers = (io) => {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.id} connected with socket id ${socket.id}`);

    // Broadcast online status
    io.emit('user-online', {
      userId: socket.user.id,
      username: socket.user.username,
    });

    // Handle private message
    socket.on('private-message', async (data) => {
      const { receiverId, content } = data;
      const senderId = socket.user.id;

      try {
        // Save message to database
        const message = await Message.create(senderId, receiverId, content);

        // Send message to receiver
        io.to(`user-${receiverId}`).emit('receive-message', {
          id: message.id,
          sender: {
            id: socket.user.id,
            username: socket.user.username,
          },
          content: message.content,
          timestamp: message.created_at,
        });

        // Send confirmation to sender
        socket.emit('message-sent', {
          id: message.id,
          timestamp: message.created_at,
        });
      } catch (error) {
        console.error('Message error:', error.message);
        socket.emit('message-error', { error: error.message });
      }
    });

    // WebRTC: Call user
    socket.on('call-user', (data) => {
      const { receiverId, offer } = data;
      const senderId = socket.user.id;

      io.to(`user-${receiverId}`).emit('incoming-call', {
        from: {
          id: senderId,
          username: socket.user.username,
        },
        offer,
        callId: data.callId,
      });
    });

    // WebRTC: Answer call
    socket.on('answer-call', (data) => {
      const { callId, answer, receiverId } = data;

      io.to(`user-${receiverId}`).emit('call-answered', {
        from: {
          id: socket.user.id,
          username: socket.user.username,
        },
        answer,
        callId,
      });
    });

    // WebRTC: ICE candidate
    socket.on('ice-candidate', (data) => {
      const { receiverId, candidate, callId } = data;

      io.to(`user-${receiverId}`).emit('ice-candidate', {
        candidate,
        callId,
      });
    });

    // WebRTC: Reject call
    socket.on('reject-call', (data) => {
      const { receiverId, callId } = data;

      io.to(`user-${receiverId}`).emit('call-rejected', {
        callId,
        reason: data.reason || 'User declined the call',
      });
    });

    // WebRTC: End call
    socket.on('end-call', (data) => {
      const { receiverId, callId } = data;

      io.to(`user-${receiverId}`).emit('call-ended', {
        callId,
      });
    });

    // Join user room for targeted messages
    socket.join(`user-${socket.user.id}`);

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.id} disconnected`);

      io.emit('user-offline', {
        userId: socket.user.id,
      });
    });
  });
};

module.exports = setupSocketHandlers;
