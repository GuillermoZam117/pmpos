@echo off
setlocal enabledelayedexpansion

if "%SQLSERVER%"=="" set SQLSERVER=localhost\sambapos22
if "%SQLDB%"=="" set SQLDB=SambaPOS5
if "%SQLUSER%"=="" set SQLUSER=sa
if "%SQLPASS%"=="" set SQLPASS=sambapos

echo ==^> Inspecting SambaPOS schema on %SQLSERVER% DB=%SQLDB%

echo.
echo -- TOP 1 EntityScreens
sqlcmd -S %SQLSERVER% -d %SQLDB% -U %SQLUSER% -P %SQLPASS% -Q "SET NOCOUNT ON; SELECT TOP 1 * FROM EntityScreens"

echo.
echo -- TOP 1 EntityScreenItems
sqlcmd -S %SQLSERVER% -d %SQLDB% -U %SQLUSER% -P %SQLPASS% -Q "SET NOCOUNT ON; SELECT TOP 1 * FROM EntityScreenItems"

echo.
echo -- TOP 1 Entities
sqlcmd -S %SQLSERVER% -d %SQLDB% -U %SQLUSER% -P %SQLPASS% -Q "SET NOCOUNT ON; SELECT TOP 1 * FROM Entities"

echo.
echo -- TOP 1 EntityTypes
sqlcmd -S %SQLSERVER% -d %SQLDB% -U %SQLUSER% -P %SQLPASS% -Q "SET NOCOUNT ON; SELECT TOP 1 * FROM EntityTypes"

echo.
echo -- TOP 1 VistaTicketsEnriquecida (if exists)
sqlcmd -S %SQLSERVER% -d %SQLDB% -U %SQLUSER% -P %SQLPASS% -Q "SET NOCOUNT ON; IF OBJECT_ID('dbo.VistaTicketsEnriquecida','V') IS NOT NULL SELECT TOP 1 * FROM dbo.VistaTicketsEnriquecida ELSE SELECT 'VistaTicketsEnriquecida not found' AS Info"

echo.
echo -- COUNT Mesas in screen 'MESAS'
sqlcmd -S %SQLSERVER% -d %SQLDB% -U %SQLUSER% -P %SQLPASS% -Q "SET NOCOUNT ON; SELECT COUNT(*) AS MesasCount FROM EntityScreens s INNER JOIN EntityScreenItems si ON si.EntityScreenId=s.Id WHERE s.Name='MESAS'"

echo.
echo Done.

endlocal

