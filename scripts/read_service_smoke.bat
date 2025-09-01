@echo off
setlocal enabledelayedexpansion

rem Basic config
if "%PORT%"=="" set PORT=4005
if "%HOST%"=="" set HOST=127.0.0.1
if "%INTERNAL_API_KEY%"=="" set INTERNAL_API_KEY=test-key-123
set BASE=http://%HOST%:%PORT%

echo ==> Read-service smoke test against %BASE%
echo Using INTERNAL_API_KEY ending with: %INTERNAL_API_KEY:~-4%

echo.
echo -- GET /health (expect 200)
powershell -NoProfile -Command "try{$r=Invoke-WebRequest -UseBasicParsing '%BASE%/health'; Write-Host ('Status:'+$r.StatusCode)}catch{Write-Host 'Error:' $_.Exception.Response.StatusCode.Value__}"

echo.
echo -- GET /internal-api/health WITHOUT key (expect 401)
powershell -NoProfile -Command "try{$r=Invoke-WebRequest -UseBasicParsing '%BASE%/internal-api/health'; Write-Host ('Status:'+$r.StatusCode)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'Error'; exit 1}}"

echo.
echo -- GET /internal-api/health WITH key (200 if DB ok, else 500)
powershell -NoProfile -Command "try{$h=@{'X-INTERNAL-API-KEY'='%INTERNAL_API_KEY%'}; $r=Invoke-WebRequest -UseBasicParsing -Headers $h '%BASE%/internal-api/health'; Write-Host ('Status:'+$r.StatusCode)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'Error'; exit 1}}"

echo.
echo -- GET /internal-api/tables WITHOUT key (expect 401)
powershell -NoProfile -Command "try{$r=Invoke-WebRequest -UseBasicParsing '%BASE%/internal-api/tables'; Write-Host ('Status:'+$r.StatusCode)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'Error'; exit 1}}"

echo.
echo -- GET /internal-api/tables WITH key (200 if DB ok, else 500)
powershell -NoProfile -Command "try{$h=@{'X-INTERNAL-API-KEY'='%INTERNAL_API_KEY%'}; $r=Invoke-WebRequest -UseBasicParsing -Headers $h '%BASE%/internal-api/tables'; Write-Host ('Status:'+$r.StatusCode)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'Error'; exit 1}}"

echo.
echo Done.

endlocal
