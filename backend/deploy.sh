#!/bin/bash

# Golf Tournament App Backend Deployment Script

echo "🚀 Starting deployment of Golf Tournament Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 process manager..."
    npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Stop existing PM2 process if running
echo "🛑 Stopping existing processes..."
pm2 stop golf-tournament-backend 2>/dev/null || true
pm2 delete golf-tournament-backend 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting application with PM2..."
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

echo "✅ Deployment complete!"
echo "📊 Application status:"
pm2 status

echo ""
echo "📝 Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs            - View application logs"
echo "  pm2 restart all     - Restart application"
echo "  pm2 stop all        - Stop application"