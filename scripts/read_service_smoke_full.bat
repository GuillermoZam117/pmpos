@echo off
setlocal enabledelayedexpansion

REM Config
if "%PORT%"=="" set PORT=4005
if "%HOST%"=="" set HOST=127.0.0.1
if "%INTERNAL_API_KEY%"=="" set INTERNAL_API_KEY=test-key-123
if "%ENTITY_SCREEN%"=="" set ENTITY_SCREEN=%SAMBAPOS_ENTITY_SCREEN%
set BASE=http://%HOST%:%PORT%

echo ==> Read-service full smoke against %BASE%
echo Using INTERNAL_API_KEY ending with: %INTERNAL_API_KEY:~-4%
if not "%ENTITY_SCREEN%"=="" echo Using ENTITY_SCREEN: %ENTITY_SCREEN%

set PS=powershell -NoProfile -Command
set H=@{'X-INTERNAL-API-KEY'='%INTERNAL_API_KEY%'}

echo.
echo -- GET /health
%PS% "try{$r=Invoke-WebRequest -UseBasicParsing '%BASE%/health'; Write-Host ('Status:'+$r.StatusCode)}catch{Write-Host 'ERR'; if ($_.Exception.Response){Write-Host $_.Exception.Response.StatusCode.Value__}}"

echo.
echo -- GET /internal-api/health WITH key
%PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/health'; Write-Host ('Status:'+$r.StatusCode)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"

echo.
echo -- GET /internal-api/active-tickets WITH key
%PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/active-tickets'; Write-Host ('Status:'+$r.StatusCode); $j=$r.Content | ConvertFrom-Json; Write-Host ('Items:' + ($j | Measure-Object).Count)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"

echo.
echo -- GET /internal-api/tables WITH key (screen if provided)
if "%ENTITY_SCREEN%"=="" (
  %PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/tables'; Write-Host ('Status:'+$r.StatusCode); $j=$r.Content | ConvertFrom-Json; Write-Host ('Items:' + ($j | Measure-Object).Count)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"
) else (
  %PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/tables?screen=%ENTITY_SCREEN%'; Write-Host ('Status:'+$r.StatusCode); $j=$r.Content | ConvertFrom-Json; Write-Host ('Items:' + ($j | Measure-Object).Count)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"
)

echo.
echo -- GET /internal-api/tickets (open, limit 20)
%PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/tickets?isClosed=false^&limit=20'; Write-Host ('Status:'+$r.StatusCode); $j=$r.Content | ConvertFrom-Json; Write-Host ('Items:' + ($j | Measure-Object).Count); if (($j | Measure-Object).Count -gt 0){$id=$j[0].TicketId; Write-Host ('SampleTicketId:'+$id)}}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"

if not "%TICKET_ID%"=="" (
  echo.
  echo -- GET /internal-api/tickets/%%TICKET_ID%%/details
  %PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/tickets/%TICKET_ID%/details'; Write-Host ('Status:'+$r.StatusCode)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"
)

echo.
echo -- GET /internal-api/entities?type=Mesas^&limit=10
%PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/entities?type=Mesas^&limit=10'; Write-Host ('Status:'+$r.StatusCode); $j=$r.Content | ConvertFrom-Json; Write-Host ('Items:' + ($j | Measure-Object).Count)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"

echo.
echo -- GET /internal-api/customers/search?term=test^&limit=5
%PS% "try{$r=Invoke-WebRequest -UseBasicParsing -Headers %H% '%BASE%/internal-api/customers/search?term=test^&limit=5'; Write-Host ('Status:'+$r.StatusCode); $j=$r.Content | ConvertFrom-Json; Write-Host ('Items:' + ($j | Measure-Object).Count)}catch{if ($_.Exception.Response){Write-Host 'Status:'+$_.Exception.Response.StatusCode.Value__} else {Write-Host 'ERR'}}"

echo.
echo Done.

endlocal
