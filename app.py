from flask import Flask, render_template, request, send_from_directory, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename
import socket
import os
import uuid

PORT = 5000

# Yahan hum Flask app initialize kar rahe hain, jo web server ka base hai
# Networking Layer 7 (Application Layer): Flask HTTP requests handle karta hai, jaise web pages serve karna
app = Flask(__name__)

# SocketIO ko initialize kar rahe hain for real-time communication
# Networking Layer 4 (Transport Layer): SocketIO WebSocket use karta hai, jo TCP par reliable connection provide karta hai
# Layer 7: WebSocket protocol application-level messaging ke liye use hota hai, jaise chat messages
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    ping_interval=25,
    ping_timeout=60
)

# Browser encrypts files before upload; allow a little multipart/ciphertext overhead
# while the client still enforces a 50 MB plaintext file limit.
MAX_UPLOAD_SIZE = 55 * 1024 * 1024
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_SIZE

# Users ka list maintain karne ke liye, taaki joined/left track kar sakein
users = {}

# Route for home page, jo React app serve karega
# Networking Layer 7: React app ko serve karna static files ke saath
@app.route('/')
def index():
    # Yahan hum React app ka main HTML template return kar rahe hain
    bundle_path = os.path.join(BASE_DIR, 'static', 'js', 'bundle.js')
    asset_version = int(os.path.getmtime(bundle_path)) if os.path.exists(bundle_path) else 1
    return render_template('index.html', asset_version=asset_version)

# Static files serve karne ke liye (CSS, JS, images)
# Networking Layer 7: Static assets deliver karna
@app.route('/static/<path:filename>')
def static_files(filename):
    response = send_from_directory(os.path.join(BASE_DIR, 'static'), filename)
    response.cache_control.no_cache = True
    response.cache_control.max_age = 0
    return response

@app.route('/health')
def health():
    return {'success': True, 'message': 'LAN Saturn is running'}

@app.route('/lan-info')
def lan_info():
    return {
        'success': True,
        'urls': get_lan_urls(),
        'port': PORT
    }

# File upload route (Networking Layer 7: HTTP POST for reliable large file transfer)
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return {'success': False, 'error': 'No file part'}, 400
    file = request.files['file']
    if file.filename == '':
        return {'success': False, 'error': 'No selected file'}, 400

    display_filename = secure_filename(file.filename)
    if not display_filename:
        return {'success': False, 'error': 'Invalid filename'}, 400

    ext = os.path.splitext(display_filename)[1]
    stored_filename = f'{uuid.uuid4()}{ext}'
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], stored_filename))

    return {
        'success': True,
        'fileUrl': f'/files/{stored_filename}',
        'filename': display_filename
    }

@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(error):
    return {
        'success': False,
        'error': 'File size too large. Maximum 50MB allowed.'
    }, 413

@app.route('/files/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Jab user connect karta hai, user list update karo
@socketio.on('connect')
def handle_connect():
    # User ka unique ID le rahe hain
    user_id = request.sid
    # Default username set kar rahe hain
    users[user_id] = 'Anonymous'
    # Sabko notify kar rahe hain ki naya user join hua
    emit('user_joined', {'username': users[user_id]}, broadcast=True)
    # User list update karo
    update_user_list()

# Jab user disconnect karta hai, user list update karo
@socketio.on('disconnect')
def handle_disconnect():
    # User ka ID le rahe hain
    user_id = request.sid
    # Username store kar rahe hain before remove
    username = users.get(user_id, 'Anonymous')
    # User ko list se remove kar rahe hain
    if user_id in users:
        del users[user_id]
    # Sabko notify kar rahe hain ki user left
    emit('user_left', {'username': username}, broadcast=True)
    # User list update karo
    update_user_list()

# Channel join karne ke liye event
# Networking Layer 7: Users ko specific channels mein add karna
@socketio.on('join_channel')
def handle_join_channel(data):
    channel = data.get('channel', 'general')
    username = data.get('username', 'Anonymous')

    # User ko channel room mein add karo
    room_name = f'channel_{channel}'
    join_room(room_name)

    # User ki username update karo
    user_id = request.sid
    users[user_id] = username

    # User list update karo
    update_user_list()

# Login system add kar rahe hain
# Networking Layer 7: User authentication
@socketio.on('login')
def handle_login(data):
    username = data.get('username', '').strip()
    password = data.get('password', '')

    # Simple authentication - in real app, use proper database
    if not username:
        emit('login_response', {'success': False, 'message': 'Username required'})
        return

    # Check if username already taken
    for sid, existing_user in users.items():
        if existing_user == username and sid != request.sid:
            emit('login_response', {'success': False, 'message': 'Username already taken'})
            return

    # Login successful
    user_id = request.sid
    users[user_id] = username

    emit('login_response', {
        'success': True,
        'username': username,
        'message': f'Welcome {username}!'
    })

    # Notify others
    emit('user_joined', {'username': username}, broadcast=True, include_self=False)
    update_user_list()

# SocketIO event for message send karne ke liye
# Networking Layer 7: Application protocol ke through message exchange
# Layer 4: Underlying TCP ensures message reliably deliver hota hai
@socketio.on('send_message')
def handle_message(data):
    # Data se username, message aur channel extract kar rahe hain
    username = data.get('username', 'Anonymous')
    message = data.get('message', '')
    channel = data.get('channel', 'general')
    timestamp = data.get('timestamp', '')
    encrypted = data.get('encrypted', False)
    encryption_version = data.get('encryptionVersion', '')
    salt = data.get('salt', '')
    nonce = data.get('nonce', '')

    # User ki username update kar rahe hain agar change hui ho
    user_id = request.sid
    users[user_id] = username

    # Channel-specific room banao
    room_name = f'channel_{channel}'

    # User ko channel room mein add karo
    join_room(room_name)

    # Message ko channel ke dusre users ko broadcast karo. Sender apni message locally dekh leta hai.
    emit('receive_message', {
        'username': username,
        'message': message,
        'channel': channel,
        'timestamp': timestamp,
        'encrypted': encrypted,
        'encryptionVersion': encryption_version,
        'salt': salt,
        'nonce': nonce
    }, room=room_name, include_self=False)

# Typing indicator events
# Networking Layer 7: Real-time typing status broadcast karna
@socketio.on('typing_start')
def handle_typing_start(data):
    username = data.get('username', 'Anonymous')
    # Sabko batao ki yeh user type kar raha hai
    emit('user_typing', {'username': username}, broadcast=True, include_self=False)

@socketio.on('typing_stop')
def handle_typing_stop(data):
    # Sabko batao ki typing stop ho gaya
    emit('user_stopped_typing', {}, broadcast=True, include_self=False)

# File sharing event
# Networking Layer 7: File data broadcast karna sab users ko
@socketio.on('file_share')
def handle_file_share(data):
    username = data.get('username', 'Anonymous')
    filename = data.get('filename', 'unknown')
    file_url = data.get('fileUrl', '')
    original_type = data.get('originalType', '')
    original_size = data.get('originalSize', 0)
    encrypted_file = data.get('encryptedFile', False)
    encryption_version = data.get('encryptionVersion', '')
    salt = data.get('salt', '')
    nonce = data.get('nonce', '')
    channel = data.get('channel', 'general')
    timestamp = data.get('timestamp', '')

    # Broadcast file notification to channel
    emit('file_shared', {
        'username': username,
        'filename': filename,
        'fileUrl': file_url,
        'originalType': original_type,
        'originalSize': original_size,
        'encryptedFile': encrypted_file,
        'encryptionVersion': encryption_version,
        'salt': salt,
        'nonce': nonce,
        'channel': channel,
        'timestamp': timestamp
    }, room=f'channel_{channel}', include_self=False)

# Message reactions
# Networking Layer 7: Reaction events handle karna
@socketio.on('add_reaction')
def handle_reaction(data):
    message_id = data.get('messageId', '')
    emoji = data.get('emoji', '')
    username = data.get('username', 'Anonymous')

    # Reaction ko sabko broadcast karo
    emit('reaction_added', {
        'messageId': message_id,
        'emoji': emoji,
        'username': username
    }, broadcast=True)

# Private messaging
# Networking Layer 7: Direct messages between specific users
@socketio.on('private_message')
def handle_private_message(data):
    target_user = data.get('to', '')
    message = data.get('message', '')
    from_user = data.get('from', 'Anonymous')
    timestamp = data.get('timestamp', '')
    encrypted = data.get('encrypted', False)
    encryption_version = data.get('encryptionVersion', '')
    salt = data.get('salt', '')
    nonce = data.get('nonce', '')

    # Find target user's socket ID
    target_sid = None
    for sid, username in users.items():
        if username == target_user:
            target_sid = sid
            break

    if target_sid:
        # Send to target user
        emit('private_message', {
            'from': from_user,
            'to': target_user,
            'message': message,
            'timestamp': timestamp,
            'encrypted': encrypted,
            'encryptionVersion': encryption_version,
            'salt': salt,
            'nonce': nonce
        }, room=target_sid)

        # Also send to sender (for their own display)
        # Sender already renders their own DM locally.

# User list ko update karne ka function
def update_user_list():
    # Current users ki list banao
    user_list = list(users.values())
    # Sabko updated list bhejo
    emit('user_list', {'users': user_list}, broadcast=True)

def get_lan_urls():
    urls = []
    try:
        hostname = socket.gethostname()
        candidates = socket.getaddrinfo(hostname, None, socket.AF_INET)
        for candidate in candidates:
            ip_address = candidate[4][0]
            if ip_address.startswith('127.'):
                continue
            url = f'http://{ip_address}:{PORT}'
            if url not in urls:
                urls.append(url)
    except socket.gaierror:
        pass

    hotspot_url = f'http://192.168.137.1:{PORT}'
    if hotspot_url not in urls:
        urls.append(hotspot_url)

    return urls

# Main function jo server start karega
# Networking Layer 4: TCP socket bind hota hai 0.0.0.0 par, taaki sab interfaces se accessible ho
# Layer 7: Flask app run karta hai HTTP server
if __name__ == '__main__':
    print('\nLAN Saturn is starting.')
    print('Open this laptop: http://127.0.0.1:5000')
    for url in get_lan_urls():
        print(f'Open from phone/hotspot device: {url}')
    print('If phone cannot open it, allow Python through Windows Firewall for Private networks.\n')
    # Server ko 0.0.0.0 par run kar rahe hain taaki mobile hotspot se access ho sake
    # Port 5000 use kar rahe hain, jo default hai
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True, allow_unsafe_werkzeug=True)
