@echo off
echo ========================================================
echo Building LAN Saturn Frontend and Windows Standalone Exe
echo ========================================================

echo [1/3] Building React frontend via npm run build...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm run build failed!
    exit /b %ERRORLEVEL%
)

echo [2/3] Packaging Python launcher with PyInstaller...
pyinstaller --noconfirm --onefile --windowed --name LAN-Saturn --hidden-import engineio.async_drivers.threading --add-data "app/templates;app/templates" --add-data "app/static;app/static" --add-data "assets;assets" launcher.py
if %ERRORLEVEL% NEQ 0 (
    echo Error: PyInstaller build failed!
    exit /b %ERRORLEVEL%
)

echo [3/3] Copying executable to dist-release...
if not exist "dist-release" mkdir "dist-release"
copy /Y "dist\LAN-Saturn.exe" "dist-release\LAN-Saturn.exe"
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to copy executable to dist-release!
    exit /b %ERRORLEVEL%
)

echo.
echo Build complete! Executable is at: dist-release\LAN-Saturn.exe
echo ========================================================
