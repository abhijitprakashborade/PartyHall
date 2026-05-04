@echo off
chcp 65001 >nul
echo.
echo  PartyHub - Dev Environment Setup
echo  ==================================
echo.

:: 1. Copy Backend .env if missing
if not exist "backend\.env" (
    echo  [1/3] Creating backend/.env from example...
    copy "backend\.env.example" "backend\.env" >nul
    echo        Done.
) else (
    echo  [1/3] backend/.env already exists. Skipping.
)

:: 2. Copy Frontend .env.local if missing
if not exist "party-hall-saas\.env.local" (
    echo  [2/3] Creating party-hall-saas/.env.local from example...
    copy "party-hall-saas\.env.example" "party-hall-saas\.env.local" >nul
    echo        Done.
) else (
    echo  [2/3] party-hall-saas/.env.local already exists. Skipping.
)

:: 3. Start Docker Compose
echo  [3/3] Starting Docker containers (db, redis, backend, frontend)...
echo.
docker-compose up
