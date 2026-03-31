#!/bin/bash

# Ensure setup script is run from project root
cd "$(dirname "$0")"

echo "🚀 Starting PartyHub SaaS Project Setup..."

# 1. Copy Backend .env if missing (no-clobber)
cp -n backend/.env.example backend/.env 2>/dev/null
if [ $? -eq 0 ]; then
    echo "📄 Created backend/.env from example."
else
    echo "✅ backend/.env already exists."
fi

# 2. Copy Frontend .env.local if missing (no-clobber)
cp -n party-hall-saas/.env.example party-hall-saas/.env.local 2>/dev/null
if [ $? -eq 0 ]; then
    echo "📄 Created party-hall-saas/.env.local from example."
else
    echo "✅ party-hall-saas/.env.local already exists."
fi

# 3. Start Docker Compose
echo "🐳 Launching Docker containers..."
docker-compose up --build
