#!/bin/bash

# Setup script for Messaging App

set -e

echo "🚀 Setting up Messaging App..."

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Create environment files
echo "📝 Creating environment files..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file (update with your secrets)"
else
    echo "ℹ️  .env file already exists"
fi

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env file"
else
    echo "ℹ️  backend/.env file already exists"
fi

if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo "✅ Created frontend/.env.local file"
else
    echo "ℹ️  frontend/.env.local file already exists"
fi

echo ""
echo "🔐 Generating secure JWT secrets..."

JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Update .env file with generated secrets
if grep -q "JWT_SECRET=your_super_secret" .env; then
    sed -i.bak "s|JWT_SECRET=your_super_secret.*|JWT_SECRET=$JWT_SECRET|" .env
    echo "✅ Updated JWT_SECRET in .env"
fi

if grep -q "JWT_REFRESH_SECRET=your_super_secret" .env; then
    sed -i.bak "s|JWT_REFRESH_SECRET=your_super_secret.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" .env
    echo "✅ Updated JWT_REFRESH_SECRET in .env"
fi

echo ""
echo "🏗️  Building Docker images..."
docker-compose build

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application, run:"
echo "   docker-compose up"
echo ""
echo "📱 Access the application at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Health:   http://localhost:5000/health"
echo ""
echo "📚 For more information, see:"
echo "   - QUICKSTART.md - Quick start guide"
echo "   - README.md - Full documentation"
echo "   - ARCHITECTURE.md - Architecture details"
echo ""
echo "⚠️  IMPORTANT: Update the secrets in .env file for production!"
