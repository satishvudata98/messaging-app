require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const initializeDatabase = require('./database');
const setupSocketHandlers = require('./sockets/handlers');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const configRoutes = require('./routes/configRoutes');

const app = express();
// Trust reverse proxy (nginx) in production so req.ip and secure headers work
app.set('trust proxy', process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production');
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  pingInterval: parseInt(process.env.SOCKET_IO_PINGINTERVAL) || 25000,
  pingTimeout: parseInt(process.env.SOCKET_IO_PINGTIMEOUT) || 60000,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
