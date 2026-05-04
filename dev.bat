@echo off

:: Check Docker is running first
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Docker Desktop is not running.
    echo  Please start Docker Desktop and run this script again.
    echo.
    pause
    exit /b 1
)

:: Copy backend .env if missing
if not exist "backend\.env" (
    echo Creating backend\.env from example...
    copy "backend\.env.example" "backend\.env" >nul
)

:: Copy frontend .env.local if missing
if not exist "party-hall-saas\.env.local" (
    echo Creating party-hall-saas\.env.local from example...
    copy "party-hall-saas\.env.example" "party-hall-saas\.env.local" >nul
)

echo.
echo  PartyHub - Starting local dev environment
echo.
echo  Frontend  --  http://localhost:3000
echo  API       --  http://localhost:8000/api/
echo  API Docs  --  http://localhost:8000/api/docs/
echo  Admin     --  http://localhost:8000/django-admin/
echo.
echo  First run takes 30-60 seconds to compile.
echo  Press Ctrl+C to stop all containers.
echo.

docker-compose up
