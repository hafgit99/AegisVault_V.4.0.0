@echo off
cd /d %~dp0
set AEGIS_ENABLE_LOOPBACK_SYNC=1
set AEGIS_EXTENSION_PAIRING_SECRET=aegis-secure-pairing-secret-32chars-min
set AEGIS_EXTENSION_ID=iockeheicjcnfoegjjboooljndjcafae
set AEGIS_STRICT_ALLOWLIST_MODE=0
echo Starting Aegis Electron App with Loopback Sync...
echo.
echo Environment:
echo   AEGIS_ENABLE_LOOPBACK_SYNC=%AEGIS_ENABLE_LOOPBACK_SYNC%
echo   AEGIS_EXTENSION_PAIRING_SECRET length=%AEGIS_EXTENSION_PAIRING_SECRET:~0,10%...
echo   AEGIS_EXTENSION_ID=%AEGIS_EXTENSION_ID%
echo.
node -r dotenv/config ./node_modules/.bin/electron .
