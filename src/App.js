import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import UserList from './components/UserList';
import PrivateMessage from './components/PrivateMessage';
import ThemeToggle from './components/ThemeToggle';
import SearchBar from './components/SearchBar';

// Yahan hum main App component bana rahe hain jo sabhi chat features ko manage karta hai
// Networking Layer 7: React state management aur SocketIO events handle karna
function App() {
    // State variables for chat functionality
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUsername, setCurrentUsername] = useState('Anonymous');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState('');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [searchQuery, setSearchQuery] = useState('');
    const [privateTarget, setPrivateTarget] = useState('');
    const [privateMessage, setPrivateMessage] = useState('');

    // Refs for DOM manipulation
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    // SocketIO connection initialize kar rahe hain
    // Networking Layer 4: TCP connection establish karna server se
    // Layer 7: WebSocket protocol ke through real-time communication
    useEffect(() => {
        // SocketIO client connect kar rahe hain
        socketRef.current = io();

        // Load message history from localStorage
        loadMessageHistory();

        // Socket event listeners setup kar rahe hain
        const socket = socketRef.current;

        // User joined event
        socket.on('user_joined', (data) => {
            const notification = {
                id: Date.now(),
                type: 'notification',
                content: `${data.username} joined the chat`,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, notification]);
        });

        // User left event
        socket.on('user_left', (data) => {
            const notification = {
                id: Date.now(),
                type: 'notification',
                content: `${data.username} left the chat`,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, notification]);
        });

        // Message receive event
        socket.on('receive_message', (data) => {
            const message = {
                id: `msg_${Date.now()}_${Math.random()}`,
                type: 'message',
                username: data.username,
                content: data.message,
                timestamp: data.timestamp,
                isOwn: false
            };
            setMessages(prev => [...prev, message]);
            saveMessageToHistory(message);
        });

        // Typing indicators
        socket.on('user_typing', (data) => {
            setTypingUser(data.username);
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 2000);
        });

        socket.on('user_stopped_typing', () => {
            setIsTyping(false);
        });

        // User list updates
        socket.on('user_list', (data) => {
            setUsers(data.users);
        });

        // File sharing
        socket.on('file_shared', (data) => {
            const fileMessage = {
                id: Date.now(),
                type: 'file',
                username: data.username,
                filename: data.filename,
                data: data.data,
                timestamp: data.timestamp,
                isOwn: false
            };
            setMessages(prev => [...prev, fileMessage]);
        });

        // Message reactions
        socket.on('reaction_added', (data) => {
            console.log(`${data.username} reacted with ${data.emoji} to message ${data.messageId}`);
        });

        // Private messages
        socket.on('private_message', (data) => {
            const privateMsg = {
                id: Date.now(),
                type: 'private',
                username: `Private from ${data.from}`,
                content: data.message,
                timestamp: data.timestamp,
                isOwn: false,
                isPrivate: true
            };
            setMessages(prev => [...prev, privateMsg]);
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, []);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load message history from localStorage
    const loadMessageHistory = () => {
        const saved = localStorage.getItem('lanSaturn_messages');
        if (saved) {
            const history = JSON.parse(saved);
            setMessages(history);
        }
    };

    // Save message to localStorage
    const saveMessageToHistory = (message) => {
        const updatedHistory = [...messages, message];
        // Keep only last 100 messages
        const trimmedHistory = updatedHistory.slice(-100);
        localStorage.setItem('lanSaturn_messages', JSON.stringify(trimmedHistory));
    };

    // Scroll to bottom function
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Send message function
    const sendMessage = (message) => {
        if (message.trim() && currentUsername) {
            const timestamp = new Date().toISOString();

            // Emit to server
            socketRef.current.emit('send_message', {
                username: currentUsername,
                message: message.trim(),
                timestamp: timestamp
            });

            // Add to local messages
            const newMessage = {
                id: `msg_${Date.now()}_${Math.random()}`,
                type: 'message',
                username: currentUsername,
                content: message.trim(),
                timestamp: timestamp,
                isOwn: true
            };

            setMessages(prev => [...prev, newMessage]);
            saveMessageToHistory(newMessage);

            // Stop typing indicator
            socketRef.current.emit('typing_stop', { username: currentUsername });
        }
    };

    // Send private message
    const sendPrivateMessage = () => {
        if (privateTarget && privateMessage.trim()) {
            socketRef.current.emit('private_message', {
                to: privateTarget,
                message: privateMessage.trim(),
                from: currentUsername,
                timestamp: new Date().toISOString()
            });

            // Display in own chat
            const privateMsg = {
                id: Date.now(),
                type: 'private',
                username: `Private to ${privateTarget}`,
                content: privateMessage.trim(),
                timestamp: new Date().toISOString(),
                isOwn: true,
                isPrivate: true
            };

            setMessages(prev => [...prev, privateMsg]);
            setPrivateMessage('');
        }
    };

    // Handle file upload
    const handleFileUpload = (file) => {
        if (file) {
            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size too large! Maximum 5MB allowed.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                socketRef.current.emit('file_share', {
                    filename: file.name,
                    data: e.target.result,
                    username: currentUsername,
                    timestamp: new Date().toISOString()
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle typing
    const handleTyping = () => {
        if (!isTyping) {
            socketRef.current.emit('typing_start', { username: currentUsername });
        }
    };

    // Toggle theme
    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <div className={`app ${theme}`}>
            <h1>LAN Saturn - Local Chat</h1>

            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <div className="chat-container">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onFileUpload={handleFileUpload}
                />

                <MessageList
                    messages={messages}
                    searchQuery={searchQuery}
                    messagesEndRef={messagesEndRef}
                />

                {isTyping && (
                    <div className="typing-indicator">
                        {typingUser} is typing...
                    </div>
                )}

                <PrivateMessage
                    users={users}
                    currentUsername={currentUsername}
                    privateTarget={privateTarget}
                    privateMessage={privateMessage}
                    onTargetChange={setPrivateTarget}
                    onMessageChange={setPrivateMessage}
                    onSend={sendPrivateMessage}
                />

                <MessageInput
                    currentUsername={currentUsername}
                    onUsernameChange={setCurrentUsername}
                    onSendMessage={sendMessage}
                    onTyping={handleTyping}
                />
            </div>

            <UserList users={users} currentUsername={currentUsername} />
        </div>
    );
}

export default App;