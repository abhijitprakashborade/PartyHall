@echo off
echo 🚀 Starting PartyHub SaaS Project Setup...

:: 1. Copy Backend .env if missing
if not exist "backend\.env" (
    echo 📄 Creating backend/.env from example...
    copy "backend\.env.example" "backend\.env"
) else (
    echo ✅ backend/.env already exists.
)

:: 2. Copy Frontend .env if missing
if not exist "party-hall-saas\.env.local" (
    echo 📄 Creating party-hall-saas/.env.local from example...
    copy "party-hall-saas\.env.example" "party-hall-saas\.env.local"
) else (
    echo ✅ party-hall-saas/.env.local already exists.
)

:: 3. Start Docker Compose
echo 🐳 Launching Docker containers...
docker-compose up

pause
