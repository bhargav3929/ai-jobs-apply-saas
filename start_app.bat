@echo off
echo Starting Auto AI Job App...

REM Start Backend
start "Backend Server" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

REM Start Frontend
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo Both servers are starting...
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
