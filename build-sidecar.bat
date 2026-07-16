@echo off
echo [1/2] Building the Flask backend into a standalone executable...
pyinstaller --onefile --name lan-saturn-server --add-data "app/static;app/static" --add-data "app/templates;app/templates" --hidden-import eventlet.hubs.epolls --hidden-import eventlet.hubs.kqueue --hidden-import eventlet.hubs.selects --hidden-import dns --hidden-import dns.dnssec --hidden-import dns.e164 --hidden-import dns.namedict --hidden-import dns.tsigkeyring --hidden-import engineio.async_drivers.eventlet run.py

echo.
echo [2/2] Copying the sidecar into the Tauri binaries directory...
if not exist "src-tauri\binaries" mkdir src-tauri\binaries
copy /Y dist\lan-saturn-server.exe src-tauri\binaries\lan-saturn-server-x86_64-pc-windows-msvc.exe

echo.
echo Done! If you have Rust installed, you can now run "npm run tauri dev" to test the desktop app.
