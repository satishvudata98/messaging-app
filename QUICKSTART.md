# Quick Start Guide

## 30-Second Setup

```bash
# 1. Navigate to project
cd /home/cocoro-satish/messaging-app

# 2. Start everything
docker-compose up --build

# Done! Your app is running at http://localhost:3000
```

## Create Your First Account

1. Open http://localhost:3000
2. Click "Register here"
3. Fill in username, email, and password (password must have uppercase and number)
4. Click "Register"
5. Login with your credentials
6. Open second browser window/tab with http://localhost:3000
7. Create another test account or login with first account
8. Start messaging!

## Test Voice/Video Calls

1. Login on two different browser tabs/windows
2. Select a contact from the left sidebar
3. Click the 📹 video call button
4. Allow camera/microphone permissions
5. Call will connect automatically
6. Click "End Call" when done

## For Testing with ngrok

```bash
# Terminal 1: Start docker services
cd /home/cocoro-satish/messaging-app
docker-compose up --build

# Terminal 2: Expose backend
ngrok http 5000
# Note the ngrok URL: https://xxx-xxx-xxx-xxx.ngrok.io

# Update frontend environment
# In frontend/.env.local
REACT_APP_API_URL=https://xxx-xxx-xxx-xxx.ngrok.io/api
REACT_APP_SOCKET_URL=https://xxx-xxx-xxx-xxx.ngrok.io

# Terminal 3: Restart frontend
docker-compose restart frontend

# Now accessible from anywhere!
```

## Useful Docker Commands

```bash
# Start services
docker-compose up --build

# Stop services (keep data)
docker-compose down

# Stop and remove everything
docker-compose down -v

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Execute command in container
docker-compose exec backend npm run dev
```

## Troubleshooting

**Port already in use?**
```bash
# Change ports in docker-compose.yml or stop conflicting service
lsof -i :5000  # Check what's using port 5000
```

**Database connection fails?**
```bash
# Check if postgres is healthy
docker-compose ps
docker-compose logs postgres
```

**Frontend won't load?**
```bash
# Check if backend is running
curl http://localhost:5000/health

# Check frontend logs
docker-compose logs frontend
```

**WebRTC/Video calls not working?**
- Check browser dev console (F12)
- Verify camera permissions granted
- Check if TURN server is accessible
- Try disabling browser extensions

## Default Credentials

When testing, you can use:
- Email: test@example.com
- Password: TestPassword123

Register new accounts as needed since there's no accounts pre-populated.

## Next Steps

1. Read [README.md](./README.md) for complete setup
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design details
3. Check [backend/.env.example](./backend/.env.example) for all options
4. Update secrets for production deployment

## Support

Run into issues? Check:
1. Docker is running: `docker ps`
2. All containers healthy: `docker-compose ps`
3. Backend health: `curl http://localhost:5000/health`
4. Browser console for errors (F12)
5. Server logs: `docker-compose logs -f`
