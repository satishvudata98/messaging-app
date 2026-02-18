# Messaging App - Project Documentation

## Overview

A production-grade, secure web messaging and calling application with WebRTC peer-to-peer communication support.

## Architecture

### Technology Stack

**Backend**
- Node.js v20+ with Express.js framework
- PostgreSQL for primary data storage
- Redis for session/cache (expandable)
- Socket.IO for real-time communication
- JWT for authentication
- bcryptjs for password hashing

**Frontend**
- React.js with modern hooks
- Socket.IO client for real-time updates
- WebRTC for P2P voice/video calls
- Responsive CSS design

**Infrastructure**
- Docker & Docker Compose for containerization
- Coturn TURN server for NAT traversal
- nginx for reverse proxy (optional)

## Key Features

### Authentication & Security
- Secure registration with email validation
- Password hashing with bcryptjs (12 salt rounds)
- JWT access tokens (15 min lifetime)
- Refresh tokens stored in database (7-day lifetime)
- HTTP-only cookies for token storage
- CORS protection

### Real-Time Messaging
- Instant private messaging via Socket.IO
- Message persistence in PostgreSQL
- Full message history loading
- Online/offline status tracking

### WebRTC Calling
- Peer-to-peer voice calling
- Peer-to-peer video calling
- ICE candidate exchange
- TURN server support
- Call negotiation via Socket.IO

### Database Schema
- Users table with secure password storage
- Messages table with timestamps
- Refresh tokens table with TTL support
- Optimized indexes for performance

## Security Considerations

1. **Password Security**
   - Never stored in plaintext
   - Bcryptjs with 12 salt rounds minimum
   - Validated during registration

2. **Token Security**
   - Access tokens: short-lived (15 min)
   - Refresh tokens: stored in database, validated
   - HTTP-only cookies preferred over localStorage
   - CORS validates origin

3. **Data Protection**
   - Parameterized database queries prevent SQL injection
   - Input validation on all endpoints
   - Socket.IO JWT authentication
   - WebRTC signaling by authenticated users only

4. **Network Security**
   - HTTPS support via reverse proxy
   - CORS-protected endpoints
   - TURN server for secure P2P connections

## File Structure Explained

### Backend Structure
```
backend/
├── src/
│   ├── controllers/        # Request handlers for routes
│   ├── routes/             # API endpoint definitions
│   ├── middleware/         # Auth & validation
│   ├── models/             # Database query functions
│   ├── services/           # Business logic (auth, tokens)
│   ├── sockets/            # Socket.IO event handlers
│   ├── server.js          # Express app setup
│   ├── db.js              # Database connection pool
│   └── database.js        # Schema initialization
├── Dockerfile             # Container image definition
├── package.json          # Dependencies
└── .env.example          # Environment template
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/            # Full-page components
│   ├── services/         # API, Socket.IO, Auth context
│   ├── hooks/            # Custom React hooks
│   ├── App.js            # Main router and layout
│   └── index.js          # React DOM render
├── public/               # Static assets
├── Dockerfile            # Container image definition
├── package.json         # Dependencies
└── .env.example         # Environment template
```

## Environment Variables Guide

### Backend (.env)
- `NODE_ENV`: development/production
- `PORT`: Server port (default: 5000)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for access tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `CORS_ORIGIN`: Frontend URL for CORS

### Frontend (.env.local)
- `REACT_APP_API_URL`: Backend API endpoint
- `REACT_APP_SOCKET_URL`: Socket.IO server URL
- `REACT_APP_TURN_SERVERS`: TURN server configuration JSON

## WebRTC Configuration

The application includes STUN (Google public) and TURN (Coturn) servers:

**STUN Servers** (for NAT traversal without relay):
- stun:stun.l.google.com:19302
- stun:stun1.l.google.com:19302

**TURN Server** (for relay when direct P2P fails):
- turn:coturn:3478 (UDP/TCP)
- Credentials: turnuser/turnpassword (configurable)

## Database Connection Pool

PostgreSQL connection pool configured with:
- Min connections: 2
- Max connections: 10
- Idle timeout: 30 seconds
- Auto-reconnect on error

## Socket.IO Configuration

- Ping interval: 25 seconds
- Ping timeout: 60 seconds
- Compression: enabled
- CORS: enabled (origin configurable)
- Authentication: JWT via handshake

## API Response Format

All API responses follow standardized format:

**Success (2xx)**
```json
{
  "data": {},
  "message": "Success description"
}
```

**Error (4xx/5xx)**
```json
{
  "error": "Error description"
}
```

## Deployment Considerations

### Development
- Use Docker Compose for local testing
- ngrok for external URL testing
- SQLite or local PostgreSQL supported

### Production
- Secure all environment secrets
- Enable HTTPS/TLS
- Use strong JWT secrets (openssl rand -base64 32)
- Configure proper TURN server
- Monitor logs and performance
- Setup automated backups
- Enable database replication
- Use AWS RDS for managed PostgreSQL
- Use AWS ElastiCache for Redis
- Configure CloudFront for CDN

## Performance Metrics

- Message delivery: < 100ms (local)
- Call setup: < 1 second
- Database queries: optimized with indexes
- Memory usage: minimal (Node.js gc enabled)

## Monitoring

Services to implement:
- Application logs (Winston/Morgan)
- Database monitoring (pgAdmin)
- Performance monitoring (PM2)
- Error tracking (Sentry)
- Uptime monitoring (StatusPage)

## Future Enhancements

1. File/image sharing
2. End-to-end encryption
3. Group messaging
4. Group video calls
5. User profiles
6. Search functionality
7. Message reactions
8. Typing indicators
9. Message read receipts
10. User presence/location
11. Push notifications
12. Two-factor authentication
13. Admin dashboard
14. Rate limiting
15. CDN integration
