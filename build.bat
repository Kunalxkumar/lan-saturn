@echo off
echo ========================================================
echo Building LAN Saturn Executable and Setup Installer
echo ========================================================

echo [1/4] Building React frontend via npm run build...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm run build failed!
    exit /b %ERRORLEVEL%
)

echo [2/4] Packaging Python launcher with PyInstaller...
pyinstaller --noconfirm --onefile --windowed --name LAN-Saturn --hidden-import engineio.async_drivers.threading --add-data "app/templates;app/templates" --add-data "app/static;app/static" --add-data "assets;assets" launcher.py
if %ERRORLEVEL% NEQ 0 (
    echo Error: PyInstaller build failed!
    exit /b %ERRORLEVEL%
)

echo [3/4] Copying executable to dist-release...
if not exist "dist-release" mkdir "dist-release"
copy /Y "dist\LAN-Saturn.exe" "dist-release\LAN-Saturn.exe"
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to copy executable to dist-release!
    exit /b %ERRORLEVEL%
)

echo [4/4] Compiling Windows Installer setup package (Inno Setup)...
if exist "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe" (
    "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe" installer.iss
) else if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
) else (
    echo Warning: ISCC.exe not found in standard paths. Skipping installer compilation.
)

echo.
echo ========================================================
echo Build complete!
echo Standalone Portable Exe: dist-release\LAN-Saturn.exe
echo Installer Setup Wizard:  dist-installer\LAN-Saturn-Setup.exe
echo ========================================================
