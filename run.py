import eventlet
eventlet.monkey_patch()

from app import create_app, socketio
from app.utils.network import get_lan_urls
from app.constants import PORT

app = create_app()

if __name__ == '__main__':
    print('\nLAN Saturn Server is starting natively...')
    print('Open this laptop: http://127.0.0.1:5000')
    for url in get_lan_urls():
        print(f'Open from phone/hotspot device: {url}')
    print('If phone cannot open it, allow Python through Windows Firewall for Private networks.\n')

    socketio.run(app, host='0.0.0.0', port=PORT, debug=False)
