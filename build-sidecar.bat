@echo off
echo [1/2] Building the Flask backend into a standalone executable...
pyinstaller --onefile --name lan-saturn-server --add-data "app/static;app/static" --add-data "app/templates;app/templates" --collect-submodules eventlet --collect-submodules dns --hidden-import engineio.async_drivers.eventlet run.py

echo.
echo [2/2] Copying the sidecar into the Tauri binaries directory...
if not exist "src-tauri\binaries" mkdir src-tauri\binaries
copy /Y dist\lan-saturn-server.exe src-tauri\binaries\lan-saturn-server-x86_64-pc-windows-msvc.exe

echo.
echo Done! If you have Rust installed, you can now run "npm run tauri dev" to test the desktop app.
