#!/bin/bash

# Telegram Mini App Deployment Script

echo "🚀 Starting deployment process..."

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_FIREBASE_API_KEY" ]; then
    echo "⚠️  Warning: Firebase environment variables not set"
    echo "Please set up your .env.local file with Firebase configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Start the application
    echo "🌟 Starting application..."
    npm start
else
    echo "❌ Build failed!"
    exit 1
fi