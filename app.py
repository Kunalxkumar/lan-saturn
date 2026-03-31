from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
import socket

# Yahan hum Flask app initialize kar rahe hain, jo web server ka base hai
# Networking Layer 7 (Application Layer): Flask HTTP requests handle karta hai, jaise web pages serve karna
app = Flask(__name__)

# SocketIO ko initialize kar rahe hain for real-time communication
# Networking Layer 4 (Transport Layer): SocketIO WebSocket use karta hai, jo TCP par reliable connection provide karta hai
# Layer 7: WebSocket protocol application-level messaging ke liye use hota hai, jaise chat messages
socketio = SocketIO(app, cors_allowed_origins="*")

# Users ka list maintain karne ke liye, taaki joined/left track kar sakein
users = {}

# Route for home page, jo React app serve karega
# Networking Layer 7: React app ko serve karna static files ke saath
@app.route('/')
def index():
    # Yahan hum React app ka main HTML template return kar rahe hain
    return render_template('index.html')

# Static files serve karne ke liye (CSS, JS, images)
# Networking Layer 7: Static assets deliver karna
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

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

# SocketIO event for message send karne ke liye
# Networking Layer 7: Application protocol ke through message exchange
# Layer 4: Underlying TCP ensures message reliably deliver hota hai
@socketio.on('send_message')
def handle_message(data):
    # Data se username aur message extract kar rahe hain
    username = data.get('username', 'Anonymous')
    message = data.get('message', '')
    timestamp = data.get('timestamp', '')
    # User ki username update kar rahe hain agar change hui ho
    user_id = request.sid
    users[user_id] = username
    # Message ko sabko broadcast kar rahe hain with timestamp
    emit('receive_message', {
        'username': username,
        'message': message,
        'timestamp': timestamp
    }, broadcast=True)

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
    file_data = data.get('data', '')
    timestamp = data.get('timestamp', '')

    # File ko sabko broadcast karo
    emit('file_shared', {
        'username': username,
        'filename': filename,
        'data': file_data,
        'timestamp': timestamp
    }, broadcast=True)

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
            'message': message,
            'timestamp': timestamp
        }, room=target_sid)

        # Also send to sender (for their own display)
        emit('private_message', {
            'from': from_user,
            'message': message,
            'timestamp': timestamp
        }, room=request.sid)

# User list ko update karne ka function
def update_user_list():
    # Current users ki list banao
    user_list = list(users.values())
    # Sabko updated list bhejo
    emit('user_list', {'users': user_list}, broadcast=True)

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

# Local Discovery Section:
# Apne laptop ka IPv4 address find karne ke liye:
# 1. Command Prompt open karo aur "ipconfig" type karo.
# 2. "Wireless LAN adapter Wi-Fi" ya "Ethernet adapter" ke under "IPv4 Address" dekho.
# 3. Agar hotspot use kar rahe ho, toh "Mobile Hotspot" adapter ka IP use karo.
# 4. Example: 192.168.137.1 ya 192.168.1.100
# 5. Friends ko yeh IP batao, aur port 5000 par access karo: http://<IP>:5000

# Main function jo server start karega
# Networking Layer 4: TCP socket bind hota hai 0.0.0.0 par, taaki sab interfaces se accessible ho
# Layer 7: Flask app run karta hai HTTP server
if __name__ == '__main__':
    # Server ko 0.0.0.0 par run kar rahe hain taaki mobile hotspot se access ho sake
    # Port 5000 use kar rahe hain, jo default hai
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)