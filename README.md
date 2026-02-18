# Secure Custom Web Messaging and Calling App Setup

## Prerequisites

- Docker and Docker Compose installed
- Node.js v20+ (for local development without Docker)
- npm or yarn

## Quick Start with Docker (Recommended)

### 1. Clone or setup the project

```bash
cd /home/cocoro-satish/messaging-app
```

### 2. Create environment files

```bash
# Copy the example env file
cp .env.example .env

# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env.local
```

### 3. Update environment variables (Optional)

Edit `.env` to update sensitive values like `JWT_SECRET`, `JWT_REFRESH_SECRET`, and TURN server credentials. For production:

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

### 4. Build and start all services

```bash
docker-compose up --build
```

This will:
- Start PostgreSQL database
- Start Redis cache
- Start Coturn TURN server
- Start Node.js backend on port 5000
- Start React frontend on port 3000

### 5. Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Backend Health Check: http://localhost:5000/health

## Local Development (Without Docker)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and update .env file
cp .env.example .env

# Update DATABASE_URL in .env to use your local PostgreSQL
# Update other environment variables as needed

# Run database migrations (automatic on server start)
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and update .env.local
cp .env.example .env.local

# Update API URL if backend is not on localhost:5000
# REACT_APP_API_URL=http://localhost:5000/api
# REACT_APP_SOCKET_URL=http://localhost:5000

# Start development server
npm run dev
```

## Testing with ngrok

### 1. Install ngrok

```bash
# On macOS
brew install ngrok

# On Linux
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip
unzip ngrok-v3-stable-linux-amd64.zip
sudo mv ngrok /usr/local/bin
```

### 2. Expose backend to internet

```bash
# In a new terminal, while docker-compose is running
ngrok http 5000
```

This will give you a URL like `https://xxxx-xxx-xxx-xxx.ngrok.io`

### 3. Update frontend environment

```bash
# In frontend/.env.local
REACT_APP_API_URL=https://xxxx-xxx-xxx-xxx.ngrok.io/api
REACT_APP_SOCKET_URL=https://xxxx-xxx-xxx-xxx.ngrok.io
```

### 4. Rebuild and restart frontend

```bash
docker-compose restart frontend
```

Or for local development:
```bash
npm run dev
```

## AWS EC2 Deployment

### 1. Launch EC2 Instance

- Use Ubuntu 20.04 LTS AMI
- Open ports: 80, 443, 5000, 3000, 3478 (TCP/UDP)
- SSH into instance

### 2. Install Docker and Docker Compose

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
```

### 3. Clone repository

```bash
git clone <your-repo-url>
cd messaging-app
```

### 4. Setup SSL Certificate (recommended for production)

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com
```

### 5. Update environment variables

```bash
cp .env.example .env

# Edit .env with production values
nano .env

# Set secure JWT secrets
# Update CORS_ORIGIN to your domain
# Update TURN server credentials
```

### 6. Start services

```bash
docker-compose up -d
```

### 7. Setup nginx reverse proxy (optional)

Create nginx config:

```nginx
upstream backend {
    server backend:5000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "SecurePass123"
  }
  ```

- `POST /api/auth/logout` - Logout user

- `POST /api/auth/refresh` - Refresh access token

### Users

- `GET /api/users` - Get all users (requires authentication)
- `GET /api/users/:id` - Get user by ID (requires authentication)

### Messages

- `GET /api/messages` - Get all messages (requires authentication)
- `GET /api/messages/:userId` - Get messages between current user and specified user

## Socket.IO Events

### Client → Server

- `private-message` - Send a message
- `call-user` - Initiate a call
- `answer-call` - Answer an incoming call
- `ice-candidate` - Send ICE candidate
- `reject-call` - Reject a call
- `end-call` - End an active call

### Server → Client

- `receive-message` - Receive a message
- `incoming-call` - Receive call request
- `call-answered` - Call answered
- `ice-candidate` - Receive ICE candidate
- `call-rejected` - Call rejected
- `call-ended` - Call ended
- `user-online` - User came online
- `user-offline` - User went offline

## Security Features

✅ JWT token-based authentication with short-lived access tokens
✅ Refresh token mechanism with long-lived tokens stored in database
✅ Bcrypt password hashing (12 salt rounds)
✅ Input validation on all endpoints
✅ CORS protection
✅ Socket.IO authentication
✅ HTTP-only cookies for token storage (when available)
✅ parameterized queries to prevent SQL injection
✅ WebRTC signaling with authenticated users only
✅ TURN server support for NAT traversal

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Rebuild if needed
docker-compose down
docker-compose up --build
```

### Socket.IO Connection Issues

- Check browser console for errors
- Verify JWT_SECRET matches between backend and frontend
- Check CORS_ORIGIN setting
- For ngrok: ensure REACT_APP_SOCKET_URL uses https://

### WebRTC Issues

- Check browser camera/microphone permissions
- Verify TURN server is accessible (port 3478)
- Check browser console for ice candidate errors
- Ensure firewall allows UDP traffic on ports 3478

### Frontend build issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
docker-compose build frontend
```

## Monitoring and Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Follow only recent logs
docker-compose logs -f --tail=100
```

## Stopping Services

```bash
# Stop all services (keeps volumes)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

## Database

The application uses PostgreSQL with the following schema:

**users**
- id (UUID, primary key)
- username (string, unique)
- email (string, unique)
- password_hash (string)
- created_at (timestamp)

**messages**
- id (UUID, primary key)
- sender_id (UUID, foreign key)
- receiver_id (UUID, foreign key)
- content (text)
- created_at (timestamp)

**refresh_tokens**
- id (UUID, primary key)
- user_id (UUID, foreign key)
- token (text, unique)
- expires_at (timestamp)

## Performance Optimization

- Redis caching layer configured (expandable)
- Message pagination for large conversations
- Database indexing on frequently queried fields
- Connection pooling for database
- Socket.IO compression enabled

## Project Structure

```
/messaging-app
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, validation
│   │   ├── models/          # Database models
│   │   ├── services/        # Business logic
│   │   ├── sockets/         # Socket.IO handlers
│   │   ├── server.js        # Main server file
│   │   └── db.js            # Database connection
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API, Socket.IO, Auth
│   │   ├── hooks/           # Custom React hooks
│   │   ├── App.js           # Main component
│   │   └── index.js         # Entry point
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── coturn/
│   └── turnserver.conf      # TURN server config
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT License - Feel free to use this project for your own purposes.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console and server logs
3. Check environment variables are set correctly
4. Ensure all services are running: `docker-compose ps`

## Next Steps

1. Customize the UI with your branding
2. Add file sharing capabilities
3. Implement message encryption
4. Add group messaging
5. Setup monitoring with tools like Prometheus
6. Deploy with CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
