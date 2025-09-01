@echo off
echo Starting read-service with full debug logging...

REM Set debug flags to enable all logging
set DEBUG=pmpos:*

REM Set port if not already set
if "%PORT%"=="" set PORT=4005
if "%INTERNAL_API_KEY%"=="" set INTERNAL_API_KEY=test-key-123

echo Debug flags: %DEBUG%
echo Port: %PORT%
echo API Key ending with: %INTERNAL_API_KEY:~-4%
echo.

cd /d "%~dp0..\server"
npm run dev