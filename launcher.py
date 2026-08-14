import threading
import urllib.request
import urllib.error
import webbrowser
import socket
import time
import sys
import os
import subprocess
from PIL import Image
import pystray

from app import create_app, socketio
from app.constants import PORT

app = create_app()

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def run_server():
    socketio.run(app, host='0.0.0.0', port=PORT, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)

def wait_for_server(health_url, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.urlopen(health_url, timeout=1)
            if req.status == 200:
                return True
        except Exception:
            time.sleep(0.2)
    return False

def on_open_browser(icon, item):
    webbrowser.open(f'http://127.0.0.1:{PORT}')

def on_copy_lan(icon, item):
    lan_ip = get_lan_ip()
    lan_url = f'http://{lan_ip}:{PORT}'
    try:
        subprocess.run(['clip.exe'], input=lan_url, text=True, check=True)
    except Exception as e:
        print(f'Error copying to clipboard: {e}')

def on_quit(icon, item):
    icon.stop()
    os._exit(0)

def main():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    health_url = f'http://127.0.0.1:{PORT}/health'
    server_ready = wait_for_server(health_url, timeout=15)

    webbrowser.open(f'http://127.0.0.1:{PORT}')

    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    icon_path = os.path.join(base_dir, 'assets', 'icon.png')
    if os.path.exists(icon_path):
        image = Image.open(icon_path)
    else:
        image = Image.new('RGB', (64, 64), color=(100, 108, 255))

    lan_ip = get_lan_ip()
    title = f'LAN Saturn (LAN: {lan_ip}:{PORT})'

    menu = pystray.Menu(
        pystray.MenuItem('Open in browser', on_open_browser),
        pystray.MenuItem('Copy LAN address', on_copy_lan),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem('Quit', on_quit)
    )

    icon = pystray.Icon('LAN Saturn', image, title, menu)
    icon.run()

    os._exit(0)

if __name__ == '__main__':
    main()
