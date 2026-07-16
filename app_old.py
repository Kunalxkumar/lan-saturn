    from flask import Flask, render_template, request, send_from_directory, url_for
    from flask_socketio import SocketIO, emit, join_room, leave_room
    from werkzeug.exceptions import RequestEntityTooLarge
    from werkzeug.utils import secure_filename
    import socket
    import os
    import uuid
    import sys

    PORT = 5000

    if getattr(sys, 'frozen', False):
        BASE_DIR = sys._MEIPASS
    else:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    # Yahan hum Flask app initialize kar rahe hain, jo web server ka base hai
    # Networking Layer 7 (Application Layer): Flask HTTP requests handle karta hai, jaise web pages serve karna
    app = Flask(__name__, 
                static_folder=os.path.join(BASE_DIR, 'static'),
                template_folder=os.path.join(BASE_DIR, 'templates'))

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
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    NOTES_FOLDER = os.path.join(BASE_DIR, 'notes')
    os.makedirs(NOTES_FOLDER, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_SIZE

    # Users ka list maintain karne ke liye, taaki joined/left track kar sakein
    users = {}
    announcements = []  # In-memory announcement list (max 10, FIFO)
    polls = {}  # In-memory polls: {poll_id: {question, options, votes, creator, closed, channel}}
    tasks = {}  # In-memory tasks per channel: {channel: [{id, text, done, creator}]}
    transfer_history = []  # List of dicts for uploads/downloads
    shares = {}  # Active folder shares on LAN: {username: {ip, port, folderName}}
    shared_directory = None  # Local shared directory path for this instance
    clipboard_history = []  # List of last 20 shared clipboards on LAN

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
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)
        file.save(file_path)

        # Compute SHA-256 hash and record in transfer history
        import hashlib
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        file_hash = sha256.hexdigest()

        import time
        transfer_item = {
            'id': f'tx_{int(time.time() * 1000)}',
            'filename': display_filename,
            'size': os.path.getsize(file_path),
            'hash': file_hash,
            'timestamp': time.time(),
            'type': 'upload',
            'direction': 'sent'
        }
        transfer_history.append(transfer_item)

        return {
            'success': True,
            'fileUrl': f'/files/{stored_filename}',
            'filename': display_filename,
            'hash': file_hash
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

    # Transfer History
    @app.route('/api/transfer-history', methods=['GET'])
    def get_transfer_history():
        return {'success': True, 'history': transfer_history}

    # Zip Preview
    @app.route('/api/zip-preview/<filename>', methods=['GET'])
    def zip_preview(filename):
        import zipfile
        safe_filename = secure_filename(filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
        if not os.path.exists(file_path) or not zipfile.is_zipfile(file_path):
            return {'success': False, 'error': 'Not a valid zip file'}, 400
        try:
            with zipfile.ZipFile(file_path, 'r') as z:
                file_list = []
                for info in z.infolist():
                    file_list.append({
                        'name': info.filename,
                        'size': info.file_size,
                        'is_dir': info.is_dir()
                    })
                return {'success': True, 'files': file_list}
        except Exception as e:
            return {'success': False, 'error': str(e)}, 500

    # Shared Folder Remote File Browser Endpoints
    @app.route('/api/shared-directory/config', methods=['POST'])
    def set_shared_directory():
        global shared_directory
        data = request.json or {}
        path = data.get('path', '').strip()
        if not path:
            shared_directory = None
            return {'success': True, 'message': 'Sharing disabled'}
        if not os.path.isdir(path):
            return {'success': False, 'error': 'Invalid directory path'}, 400
        shared_directory = path
        return {'success': True, 'message': 'Shared directory updated'}

    @app.route('/api/shared-directory/config', methods=['GET'])
    def get_shared_directory_config():
        global shared_directory
        return {'success': True, 'path': shared_directory}

    @app.route('/api/shared-directory/files', methods=['GET'])
    def list_shared_directory_files():
        global shared_directory
        if not shared_directory:
            return {'success': False, 'error': 'Sharing not configured'}, 403
        subpath = request.args.get('path', '').strip()
        # Normalize path and prevent directory traversal
        target_dir = os.path.abspath(os.path.join(shared_directory, subpath))
        if not target_dir.startswith(os.path.abspath(shared_directory)):
            return {'success': False, 'error': 'Access denied'}, 403
        if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
            return {'success': False, 'error': 'Directory not found'}, 404
        try:
            items = []
            for entry in os.scandir(target_dir):
                stat = entry.stat()
                items.append({
                    'name': entry.name,
                    'is_dir': entry.is_dir(),
                    'size': stat.st_size if not entry.is_dir() else 0,
                    'mtime': stat.st_mtime
                })
            return {'success': True, 'files': items}
        except Exception as e:
            return {'success': False, 'error': str(e)}, 500

    @app.route('/api/shared-directory/download', methods=['GET'])
    def download_shared_file():
        global shared_directory
        if not shared_directory:
            return {'success': False, 'error': 'Sharing not configured'}, 403
        filepath = request.args.get('path', '').strip()
        target_file = os.path.abspath(os.path.join(shared_directory, filepath))
        if not target_file.startswith(os.path.abspath(shared_directory)):
            return {'success': False, 'error': 'Access denied'}, 403
        if not os.path.exists(target_file) or os.path.isdir(target_file):
            return {'success': False, 'error': 'File not found'}, 404
        dir_name = os.path.dirname(target_file)
        file_name = os.path.basename(target_file)
        import time
        transfer_item = {
            'id': f'tx_{int(time.time() * 1000)}',
            'filename': file_name,
            'size': os.path.getsize(target_file),
            'hash': 'N/A',
            'timestamp': time.time(),
            'type': 'download',
            'direction': 'received'
        }
        transfer_history.append(transfer_item)
        return send_from_directory(dir_name, file_name, as_attachment=True)

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

    # Share Folder announcements
    @socketio.on('announce_share')
    def handle_announce_share(data):
        username = data.get('username', 'Anonymous')
        # Use request.remote_addr to get local network IP of sender
        ip = request.remote_addr
        # Fallback to local loopback if running on same machine
        if ip == '127.0.0.1':
            # Let's try to get actual LAN IP if possible, but other machines will see correct remote_addr.
            pass
        port = data.get('port', 5000)
        folder_name = data.get('folderName', 'Shared Folder')
        shares[username] = {
            'ip': ip,
            'port': port,
            'folderName': folder_name
        }
        emit('shares_list', {'shares': shares}, broadcast=True)

    @socketio.on('get_shares')
    def handle_get_shares():
        emit('shares_list', {'shares': shares})

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
        # Remove user's share if they disconnect
        if username in shares:
            del shares[username]
            emit('shares_list', {'shares': shares}, broadcast=True)
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
        }, to=room_name, include_self=False)

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
        }, to=f'channel_{channel}', include_self=False)

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
            }, to=target_sid)

            # Also send to sender (for their own display)
            # Sender already renders their own DM locally.

    # Announcements
    @socketio.on('broadcast_announcement')
    def handle_broadcast_announcement(data):
        import time
        text = data.get('text', '')
        username = data.get('username', 'Anonymous')
        if not text.strip():
            return
        announcement = {
            'id': f'ann_{int(time.time() * 1000)}',
            'text': text.strip()[:500],
            'username': username,
            'timestamp': data.get('timestamp', '')
        }
        announcements.insert(0, announcement)
        # Keep only the last 10 announcements
        while len(announcements) > 10:
            announcements.pop()
        emit('announcement', announcement, broadcast=True)

    @socketio.on('get_announcements')
    def handle_get_announcements():
        emit('announcements_list', {'announcements': announcements})

    # Polls
    @socketio.on('create_poll')
    def handle_create_poll(data):
        import time
        poll_id = f'poll_{int(time.time() * 1000)}'
        question = data.get('question', '').strip()
        options = data.get('options', [])
        channel = data.get('channel', 'general')
        username = data.get('username', 'Anonymous')
        if not question or len(options) < 2:
            return
        poll = {
            'id': poll_id,
            'question': question[:200],
            'options': [opt.strip()[:100] for opt in options[:6]],
            'votes': {i: [] for i in range(len(options[:6]))},
            'creator': username,
            'closed': False,
            'channel': channel,
            'timestamp': data.get('timestamp', '')
        }
        polls[poll_id] = poll
        emit('poll_created', poll, to=f'channel_{channel}')

    @socketio.on('vote_poll')
    def handle_vote_poll(data):
        poll_id = data.get('pollId', '')
        option_index = data.get('optionIndex', -1)
        username = data.get('username', 'Anonymous')
        poll = polls.get(poll_id)
        if not poll or poll['closed']:
            return
        if option_index < 0 or option_index >= len(poll['options']):
            return
        # Remove previous vote by this user
        for idx in poll['votes']:
            poll['votes'][idx] = [u for u in poll['votes'][idx] if u != username]
        # Add new vote
        poll['votes'][option_index].append(username)
        emit('poll_updated', poll, to=f'channel_{poll["channel"]}')

    @socketio.on('close_poll')
    def handle_close_poll(data):
        poll_id = data.get('pollId', '')
        username = data.get('username', 'Anonymous')
        poll = polls.get(poll_id)
        if not poll:
            return
        # Only creator can close
        if poll['creator'] != username:
            return
        poll['closed'] = True
        emit('poll_updated', poll, to=f'channel_{poll["channel"]}')

    @socketio.on('get_polls')
    def handle_get_polls(data):
        channel = data.get('channel', 'general')
        channel_polls = [p for p in polls.values() if p['channel'] == channel]
        emit('polls_list', {'polls': channel_polls})

    # Tasks
    @socketio.on('create_task')
    def handle_create_task(data):
        import time
        channel = data.get('channel', 'general')
        text = data.get('text', '').strip()
        username = data.get('username', 'Anonymous')
        if not text:
            return
        task = {
            'id': f'task_{int(time.time() * 1000)}',
            'text': text[:300],
            'done': False,
            'creator': username
        }
        if channel not in tasks:
            tasks[channel] = []
        tasks[channel].append(task)
        emit('task_created', {'channel': channel, 'task': task}, to=f'channel_{channel}')

    @socketio.on('toggle_task')
    def handle_toggle_task(data):
        channel = data.get('channel', 'general')
        task_id = data.get('taskId', '')
        channel_tasks = tasks.get(channel, [])
        for task in channel_tasks:
            if task['id'] == task_id:
                task['done'] = not task['done']
                emit('task_updated', {'channel': channel, 'task': task}, to=f'channel_{channel}')
                break

    @socketio.on('delete_task')
    def handle_delete_task(data):
        channel = data.get('channel', 'general')
        task_id = data.get('taskId', '')
        if channel in tasks:
            tasks[channel] = [t for t in tasks[channel] if t['id'] != task_id]
            emit('task_deleted', {'channel': channel, 'taskId': task_id}, to=f'channel_{channel}')

    @socketio.on('get_tasks')
    def handle_get_tasks(data):
        channel = data.get('channel', 'general')
        emit('tasks_list', {'channel': channel, 'tasks': tasks.get(channel, [])})

    # Shared Notes
    @socketio.on('get_notes')
    def handle_get_notes(data):
        channel = data.get('channel', 'general')
        channel_dir = os.path.join(NOTES_FOLDER, secure_filename(channel))
        os.makedirs(channel_dir, exist_ok=True)
        try:
            files = [f[:-3] for f in os.listdir(channel_dir) if f.endswith('.md')]
        except Exception:
            files = []
        emit('notes_list', {'channel': channel, 'notes': files})

    @socketio.on('get_note_content')
    def handle_get_note_content(data):
        channel = data.get('channel', 'general')
        note_name = data.get('noteName', '').strip()
        if not note_name:
            return
        safe_note = secure_filename(note_name)
        note_path = os.path.join(NOTES_FOLDER, secure_filename(channel), f"{safe_note}.md")
        content = ""
        if os.path.exists(note_path):
            try:
                with open(note_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                print("Error reading note:", e)
        emit('note_content', {'channel': channel, 'noteName': note_name, 'content': content})

    @socketio.on('save_note')
    def handle_save_note(data):
        channel = data.get('channel', 'general')
        note_name = data.get('noteName', '').strip()
        content = data.get('content', '')
        username = data.get('username', 'Anonymous')
        if not note_name:
            return
        safe_channel = secure_filename(channel)
        safe_note = secure_filename(note_name)
        channel_dir = os.path.join(NOTES_FOLDER, safe_channel)
        os.makedirs(channel_dir, exist_ok=True)
        note_path = os.path.join(channel_dir, f"{safe_note}.md")
        try:
            with open(note_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            print("Error saving note:", e)
            return
        # Broadcast update to other users in same channel
        emit('note_updated', {
            'channel': channel,
            'noteName': note_name,
            'content': content,
            'username': username
        }, to=f"channel_{channel}", include_self=False)

    @socketio.on('create_note')
    def handle_create_note(data):
        channel = data.get('channel', 'general')
        note_name = data.get('noteName', '').strip()
        username = data.get('username', 'Anonymous')
        if not note_name:
            return
        safe_channel = secure_filename(channel)
        safe_note = secure_filename(note_name)
        channel_dir = os.path.join(NOTES_FOLDER, safe_channel)
        os.makedirs(channel_dir, exist_ok=True)
        note_path = os.path.join(channel_dir, f"{safe_note}.md")
        if not os.path.exists(note_path):
            try:
                with open(note_path, 'w', encoding='utf-8') as f:
                    f.write(f"# {note_name}\n\nStart typing notes here...")
            except Exception as e:
                print("Error creating note:", e)
                return
        try:
            files = [f[:-3] for f in os.listdir(channel_dir) if f.endswith('.md')]
        except Exception:
            files = []
        emit('notes_list', {'channel': channel, 'notes': files}, to=f"channel_{channel}")

    @socketio.on('delete_note')
    def handle_delete_note(data):
        channel = data.get('channel', 'general')
        note_name = data.get('noteName', '').strip()
        if not note_name:
            return
        safe_channel = secure_filename(channel)
        safe_note = secure_filename(note_name)
        note_path = os.path.join(NOTES_FOLDER, safe_channel, f"{safe_note}.md")
        if os.path.exists(note_path):
            try:
                os.remove(note_path)
            except Exception as e:
                print("Error deleting note:", e)
                return
        channel_dir = os.path.join(NOTES_FOLDER, safe_channel)
        try:
            files = [f[:-3] for f in os.listdir(channel_dir) if f.endswith('.md')]
        except Exception:
            files = []
        emit('notes_list', {'channel': channel, 'notes': files}, to=f"channel_{channel}")
        emit('note_deleted', {'channel': channel, 'noteName': note_name}, to=f"channel_{channel}")

    # Clipboard Sync
    @socketio.on('clipboard_sync')
    def handle_clipboard_sync(data):
        import time
        text = data.get('text', '').strip()
        username = data.get('username', 'Anonymous')
        if not text:
            return
        # Avoid duplicate sequential items
        if not clipboard_history or clipboard_history[0]['text'] != text:
            item = {
                'id': f'cb_{int(time.time() * 1000)}',
                'text': text,
                'username': username,
                'timestamp': time.time()
            }
            clipboard_history.insert(0, item)
            if len(clipboard_history) > 20:
                clipboard_history.pop()
        emit('clipboard_updated', {
            'text': text,
            'username': username
        }, broadcast=True, include_self=False)

    @socketio.on('get_clipboard_history')
    def handle_get_clipboard_history():
        emit('clipboard_history_list', {'history': clipboard_history})

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
