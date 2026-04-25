import React, { useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import sodium from 'libsodium-wrappers-sumo';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import ThemeToggle from './components/ThemeToggle';
import SearchBar from './components/SearchBar';

const servers = [
    {
        id: 'saturn',
        name: 'LAN Saturn',
        initials: 'LS',
        channels: ['general', 'random', 'study', 'files']
    },
    {
        id: 'lounge',
        name: 'Local Lounge',
        initials: 'LL',
        channels: ['chat', 'games', 'help']
    }
];

const CRYPTO_VERSION = 'sodium-xchacha20poly1305-v1';
const CRYPTO_CONTEXT = 'lan-saturn-e2ee-v1';

const e2ee = {
    toBase64(bytes) {
        return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
    },

    fromBase64(value) {
        return sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
    },

    deriveKey(passphrase, salt) {
        return sodium.crypto_pwhash(
            sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
            passphrase,
            salt,
            sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
            sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
            sodium.crypto_pwhash_ALG_ARGON2ID13
        );
    },

    encryptBytes(bytes, passphrase) {
        const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
        const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
        const key = this.deriveKey(passphrase, salt);
        const cipherBytes = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
            bytes,
            CRYPTO_CONTEXT,
            null,
            nonce,
            key
        );

        return {
            encrypted: true,
            encryptionVersion: CRYPTO_VERSION,
            salt: this.toBase64(salt),
            nonce: this.toBase64(nonce),
            cipherBytes
        };
    },

    decryptBytes(cipherBytes, passphrase, salt, nonce) {
        const key = this.deriveKey(passphrase, this.fromBase64(salt));
        return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            null,
            cipherBytes,
            CRYPTO_CONTEXT,
            this.fromBase64(nonce),
            key
        );
    },

    encryptText(message, passphrase) {
        const plainBytes = sodium.from_string(message);
        const encrypted = this.encryptBytes(plainBytes, passphrase);
        return {
            encrypted: true,
            encryptionVersion: encrypted.encryptionVersion,
            salt: encrypted.salt,
            nonce: encrypted.nonce,
            data: this.toBase64(encrypted.cipherBytes)
        };
    },

    decryptText(encryptedData, passphrase, salt, nonce) {
        const plainBytes = this.decryptBytes(this.fromBase64(encryptedData), passphrase, salt, nonce);
        return sodium.to_string(plainBytes);
    }
};

function App() {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUsername, setCurrentUsername] = useState('Anonymous');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [searchQuery, setSearchQuery] = useState('');
    const [encryptionPassphrase, setEncryptionPassphrase] = useState('');
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [cryptoReady, setCryptoReady] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [activeServerId, setActiveServerId] = useState('saturn');
    const [activeChannel, setActiveChannel] = useState('general');
    const [activeView, setActiveView] = useState('server');
    const [activeDmUser, setActiveDmUser] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const activeChannelRef = useRef(activeChannel);
    const encryptionPassphraseRef = useRef(encryptionPassphrase);

    const activeServer = useMemo(
        () => servers.find(server => server.id === activeServerId) || servers[0],
        [activeServerId]
    );

    const availableDmUsers = useMemo(
        () => users.filter(user => user !== currentUsername && user !== 'Anonymous'),
        [users, currentUsername]
    );

    useEffect(() => {
        encryptionPassphraseRef.current = encryptionPassphrase;
        if (!encryptionPassphrase) {
            setIsEncrypted(false);
        }
    }, [encryptionPassphrase]);

    useEffect(() => {
        sodium.ready.then(() => {
            setCryptoReady(true);
        });
    }, []);

    useEffect(() => {
        if (!cryptoReady || !encryptionPassphrase) return;

        setMessages(prev => prev.map(message => {
            if (!message.isEncrypted || !message.encryptedPayload || !message.salt || !message.nonce) {
                return message;
            }

            if (
                message.content &&
                !message.content.startsWith('[Encrypted message') &&
                !message.content.startsWith('[Decryption failed')
            ) {
                return message;
            }

            try {
                return {
                    ...message,
                    content: e2ee.decryptText(
                        message.encryptedPayload,
                        encryptionPassphrase,
                        message.salt,
                        message.nonce
                    )
                };
            } catch (error) {
                return {
                    ...message,
                    content: '[Decryption failed - wrong passphrase or damaged message]'
                };
            }
        }));
    }, [cryptoReady, encryptionPassphrase]);

    useEffect(() => {
        const saved = localStorage.getItem('lanSaturn_messages');
        if (saved) {
            setMessages(JSON.parse(saved));
        }

        socketRef.current = io({
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000
        });
        const socket = socketRef.current;

        socket.on('connect', () => {
            setConnectionStatus('connected');
            socket.emit('join_channel', {
                channel: activeChannelRef.current,
                username: currentUsername
            });
        });

        socket.on('disconnect', () => {
            setConnectionStatus('disconnected');
        });

        socket.on('connect_error', () => {
            setConnectionStatus('connection error');
        });

        socket.on('user_joined', (data) => {
            addMessage({
                id: `note_${Date.now()}_${Math.random()}`,
                type: 'notification',
                content: `${data.username} joined the chat`,
                channel: activeChannelRef.current,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('user_left', (data) => {
            addMessage({
                id: `note_${Date.now()}_${Math.random()}`,
                type: 'notification',
                content: `${data.username} left the chat`,
                channel: activeChannelRef.current,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('receive_message', async (data) => {
            let content = data.message;
            const currentPassphrase = encryptionPassphraseRef.current;

            if (data.encrypted && currentPassphrase) {
                try {
                    content = e2ee.decryptText(data.message, currentPassphrase, data.salt, data.nonce);
                } catch (error) {
                    console.error('Message decryption failed:', error);
                    content = '[Decryption failed - wrong passphrase or damaged message]';
                }
            } else if (data.encrypted) {
                content = '[Encrypted message - enter passphrase to view]';
            }

            addMessage({
                id: `msg_${Date.now()}_${Math.random()}`,
                type: 'message',
                username: data.username,
                content,
                channel: data.channel || 'general',
                timestamp: data.timestamp,
                isOwn: false,
                isEncrypted: data.encrypted || false,
                encryptedPayload: data.encrypted ? data.message : undefined,
                encryptionVersion: data.encryptionVersion,
                salt: data.salt,
                nonce: data.nonce
            });
        });

        socket.on('file_shared', (data) => {
            addMessage({
                id: `file_${Date.now()}_${Math.random()}`,
                type: 'file',
                username: data.username,
                filename: data.filename,
                fileUrl: data.fileUrl,
                originalType: data.originalType,
                originalSize: data.originalSize,
                encryptedFile: data.encryptedFile || false,
                encryptionVersion: data.encryptionVersion,
                salt: data.salt,
                nonce: data.nonce,
                channel: data.channel || 'general',
                timestamp: data.timestamp,
                isOwn: false
            });
        });

        socket.on('private_message', (data) => {
            let content = data.message;
            const currentPassphrase = encryptionPassphraseRef.current;

            if (data.encrypted && currentPassphrase) {
                try {
                    content = e2ee.decryptText(data.message, currentPassphrase, data.salt, data.nonce);
                } catch (error) {
                    console.error('Private message decryption failed:', error);
                    content = '[Decryption failed - wrong passphrase or damaged message]';
                }
            } else if (data.encrypted) {
                content = '[Encrypted message - enter passphrase to view]';
            }

            addMessage({
                id: `dm_${Date.now()}_${Math.random()}`,
                type: 'private',
                username: data.from,
                content,
                dmUser: data.from,
                timestamp: data.timestamp,
                isOwn: false,
                isPrivate: true,
                isEncrypted: data.encrypted || false,
                encryptedPayload: data.encrypted ? data.message : undefined,
                encryptionVersion: data.encryptionVersion,
                salt: data.salt,
                nonce: data.nonce
            });
        });

        socket.on('user_typing', (data) => {
            setTypingUser(data.username);
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 2000);
        });

        socket.on('user_stopped_typing', () => {
            setIsTyping(false);
        });

        socket.on('user_list', (data) => {
            setUsers(data.users);
        });

        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        activeChannelRef.current = activeChannel;
        if (activeView === 'server' && socketRef.current) {
            socketRef.current.emit('join_channel', {
                channel: activeChannel,
                username: currentUsername
            });
        }
    }, [activeChannel, activeView, currentUsername]);

    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [messages, activeChannel, activeDmUser, activeView]);

    const addMessage = (message) => {
        setMessages(prev => {
            const updated = [...prev, message].slice(-100);
            const savedMessages = updated.map(({ decryptedUrl, decryptedFilename, ...item }) => item);
            localStorage.setItem('lanSaturn_messages', JSON.stringify(savedMessages));
            return updated;
        });
    };

    const clearHistory = () => {
        const confirmed = window.confirm('Clear all saved chat history on this device?');
        if (!confirmed) {
            return;
        }

        messages.forEach(message => {
            if (message.decryptedUrl) {
                URL.revokeObjectURL(message.decryptedUrl);
            }
        });

        setMessages([]);
        localStorage.removeItem('lanSaturn_messages');
        setSearchQuery('');
        setUploadStatus('Chat history cleared from this device.');
        setTimeout(() => setUploadStatus(''), 3000);
    };

    const sendMessage = async (message) => {
        const cleanMessage = message.trim();
        if (!cleanMessage || !currentUsername) return;

        if (!encryptionPassphrase) {
            addMessage({
                id: `note_${Date.now()}_${Math.random()}`,
                type: 'notification',
                content: 'Enter the shared E2EE passphrase before sending messages.',
                channel: activeChannel,
                timestamp: new Date().toISOString()
            });
            return;
        }

        const timestamp = new Date().toISOString();

        if (activeView === 'dm' && activeDmUser) {
            let dmMessage = cleanMessage;
            let dmEncryptedData = null;

            if (encryptionPassphrase) {
                if (!cryptoReady) {
                    addMessage({
                        id: `note_${Date.now()}_${Math.random()}`,
                        type: 'notification',
                        content: 'Encryption is still loading. Try again in a moment.',
                        channel: activeChannel,
                        timestamp: new Date().toISOString()
                    });
                    return;
                }

                try {
                    dmEncryptedData = e2ee.encryptText(cleanMessage, encryptionPassphrase);
                    dmMessage = dmEncryptedData.data;
                    setIsEncrypted(true);
                } catch (error) {
                    console.error('DM encryption failed:', error);
                    addMessage({
                        id: `note_${Date.now()}_${Math.random()}`,
                        type: 'notification',
                        content: 'Encryption failed. Check the shared passphrase and try again.',
                        channel: activeChannel,
                        timestamp: new Date().toISOString()
                    });
                    return;
                }
            }

            socketRef.current.emit('private_message', {
                to: activeDmUser,
                message: dmMessage,
                from: currentUsername,
                timestamp,
                encrypted: !!dmEncryptedData,
                encryptionVersion: dmEncryptedData?.encryptionVersion,
                salt: dmEncryptedData?.salt,
                nonce: dmEncryptedData?.nonce
            });

            addMessage({
                id: `dm_${Date.now()}_${Math.random()}`,
                type: 'private',
                username: currentUsername,
                content: cleanMessage,
                dmUser: activeDmUser,
                timestamp,
                isOwn: true,
                isPrivate: true,
                isEncrypted: !!dmEncryptedData,
                encryptedPayload: dmEncryptedData?.data,
                encryptionVersion: dmEncryptedData?.encryptionVersion,
                salt: dmEncryptedData?.salt,
                nonce: dmEncryptedData?.nonce
            });
            return;
        }

        let finalMessage = cleanMessage;
        let encryptedData = null;

        if (encryptionPassphrase) {
            if (!cryptoReady) {
                addMessage({
                    id: `note_${Date.now()}_${Math.random()}`,
                    type: 'notification',
                    content: 'Encryption is still loading. Try again in a moment.',
                    channel: activeChannel,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            try {
                encryptedData = e2ee.encryptText(cleanMessage, encryptionPassphrase);
                finalMessage = encryptedData.data;
                setIsEncrypted(true);
            } catch (error) {
                console.error('Encryption failed:', error);
                addMessage({
                    id: `note_${Date.now()}_${Math.random()}`,
                    type: 'notification',
                    content: 'Encryption failed. Check the shared passphrase and try again.',
                    channel: activeChannel,
                    timestamp: new Date().toISOString()
                });
                return;
            }
        }

        socketRef.current.emit('send_message', {
            username: currentUsername,
            message: finalMessage,
            channel: activeChannel,
            timestamp,
            encrypted: !!encryptedData,
            encryptionVersion: encryptedData?.encryptionVersion,
            salt: encryptedData?.salt,
            nonce: encryptedData?.nonce
        });

        addMessage({
            id: `msg_${Date.now()}_${Math.random()}`,
            type: 'message',
            username: currentUsername,
            content: cleanMessage,
            channel: activeChannel,
            timestamp,
            isOwn: true,
            isEncrypted: !!encryptedData,
            encryptedPayload: encryptedData?.data,
            encryptionVersion: encryptedData?.encryptionVersion,
            salt: encryptedData?.salt,
            nonce: encryptedData?.nonce
        });

        socketRef.current.emit('typing_stop', { username: currentUsername });
    };

    const handleFileUpload = async (file) => {
        if (!file) return;

        if (activeView === 'dm') {
            setUploadStatus('File upload is available in server channels.');
            setTimeout(() => setUploadStatus(''), 3000);
            return;
        }

        if (!encryptionPassphrase) {
            setUploadStatus('Enter the shared E2EE passphrase before uploading files.');
            return;
        }

        if (!cryptoReady) {
            setUploadStatus('Encryption is still loading. Try again in a moment.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setUploadStatus('File is too large. Maximum size is 50 MB.');
            return;
        }

        setIsUploading(true);
        setUploadStatus(`Encrypting ${file.name}...`);

        try {
            const plainBytes = new Uint8Array(await file.arrayBuffer());
            const encryptedFile = e2ee.encryptBytes(plainBytes, encryptionPassphrase);
            const encryptedBlob = new Blob([encryptedFile.cipherBytes], { type: 'application/octet-stream' });
            const formData = new FormData();
            formData.append('file', encryptedBlob, `${file.name}.lsenc`);
            setUploadStatus(`Uploading encrypted ${file.name}...`);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (response.ok && result.success) {
                const timestamp = new Date().toISOString();

                socketRef.current.emit('file_share', {
                    filename: result.filename,
                    fileUrl: result.fileUrl,
                    originalType: file.type || 'application/octet-stream',
                    originalSize: file.size,
                    encryptedFile: true,
                    encryptionVersion: encryptedFile.encryptionVersion,
                    salt: encryptedFile.salt,
                    nonce: encryptedFile.nonce,
                    username: currentUsername,
                    channel: activeChannel,
                    timestamp
                });

                addMessage({
                    id: `file_${Date.now()}_${Math.random()}`,
                    type: 'file',
                    username: currentUsername,
                    filename: result.filename,
                    fileUrl: result.fileUrl,
                    originalType: file.type || 'application/octet-stream',
                    originalSize: file.size,
                    encryptedFile: true,
                    encryptionVersion: encryptedFile.encryptionVersion,
                    salt: encryptedFile.salt,
                    nonce: encryptedFile.nonce,
                    decryptedUrl: URL.createObjectURL(file),
                    decryptedFilename: file.name,
                    channel: activeChannel,
                    timestamp,
                    isOwn: true
                });

                setUploadStatus(`Encrypted and uploaded ${file.name}`);
                setTimeout(() => setUploadStatus(''), 3000);
            } else {
                setUploadStatus(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error encrypting/uploading file:', error);
            setUploadStatus('Encrypted upload failed. Check the passphrase and try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const decryptFileMessage = async (message) => {
        if (!message.encryptedFile) return;

        if (!encryptionPassphrase) {
            setUploadStatus('Enter the shared E2EE passphrase to decrypt this file.');
            return;
        }

        if (!cryptoReady) {
            setUploadStatus('Encryption is still loading. Try again in a moment.');
            return;
        }

        setUploadStatus(`Decrypting ${message.filename}...`);

        try {
            const response = await fetch(message.fileUrl);
            const encryptedBytes = new Uint8Array(await response.arrayBuffer());
            const plainBytes = e2ee.decryptBytes(
                encryptedBytes,
                encryptionPassphrase,
                message.salt,
                message.nonce
            );
            const blob = new Blob([plainBytes], {
                type: message.originalType || 'application/octet-stream'
            });
            const decryptedUrl = URL.createObjectURL(blob);
            const decryptedFilename = message.filename.replace(/\.lsenc$/i, '');

            setMessages(prev => prev.map(item => (
                item.id === message.id
                    ? { ...item, decryptedUrl, decryptedFilename }
                    : item
            )));
            setUploadStatus(`Decrypted ${decryptedFilename}`);
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error) {
            console.error('File decryption failed:', error);
            setUploadStatus('File decryption failed. Wrong passphrase or damaged file.');
        }
    };

    const handleTyping = () => {
        socketRef.current?.emit('typing_start', { username: currentUsername });
    };

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
    };

    const openServer = (serverId) => {
        const server = servers.find(item => item.id === serverId) || servers[0];
        setActiveServerId(server.id);
        setActiveChannel(server.channels[0]);
        setActiveView('server');
        setActiveDmUser('');
    };

    const openDm = (username) => {
        setActiveView('dm');
        setActiveDmUser(username);
    };

    const visibleMessages = messages.filter(message => {
        if (activeView === 'dm') {
            return message.type === 'private' && message.dmUser === activeDmUser;
        }

        if (message.type === 'private') return false;
        return (message.channel || 'general') === activeChannel;
    });

    const composerDisabled = activeView === 'dm' && !activeDmUser;
    const title = activeView === 'dm' ? `@${activeDmUser || 'direct-messages'}` : `#${activeChannel}`;

    return (
        <div className={`app discord-shell ${theme}`}>
            <aside className="server-rail">
                <button
                    className={`server-bubble home ${activeView === 'server' && activeServerId === 'saturn' ? 'active' : ''}`}
                    onClick={() => openServer('saturn')}
                    title="LAN Saturn"
                >
                    LS
                </button>
                <div className="server-divider" />
                {servers.filter(server => server.id !== 'saturn').map(server => (
                    <button
                        key={server.id}
                        className={`server-bubble ${activeView === 'server' && activeServerId === server.id ? 'active' : ''}`}
                        onClick={() => openServer(server.id)}
                        title={server.name}
                    >
                        {server.initials}
                    </button>
                ))}
                <button
                    className={`server-bubble dm-bubble ${activeView === 'dm' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveView('dm');
                        setActiveDmUser(availableDmUsers[0] || '');
                    }}
                    title="Direct Messages"
                >
                    DM
                </button>
            </aside>

            <aside className="sidebar-panel">
                <div className="sidebar-title">
                    <span>{activeView === 'dm' ? 'Direct Messages' : activeServer.name}</span>
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                </div>

                <div className={`connection-pill ${connectionStatus === 'connected' ? 'connected' : 'offline'}`}>
                    {connectionStatus === 'connected' ? 'Connected' : connectionStatus}
                </div>

                {activeView === 'server' ? (
                    <>
                        <div className="sidebar-section-label">Text Channels</div>
                        <nav className="channel-list">
                            {activeServer.channels.map(channel => (
                                <button
                                    key={channel}
                                    className={`channel-row ${activeChannel === channel ? 'active' : ''}`}
                                    onClick={() => setActiveChannel(channel)}
                                >
                                    <span>#</span>
                                    {channel}
                                </button>
                            ))}
                        </nav>
                    </>
                ) : (
                    <>
                        <div className="sidebar-section-label">Online DMs</div>
                        <nav className="channel-list">
                            {availableDmUsers.length === 0 ? (
                                <div className="empty-state">No one else is online</div>
                            ) : (
                                availableDmUsers.map(user => (
                                    <button
                                        key={user}
                                        className={`dm-row ${activeDmUser === user ? 'active' : ''}`}
                                        onClick={() => openDm(user)}
                                    >
                                        <span className="mini-avatar">{user.charAt(0).toUpperCase()}</span>
                                        {user}
                                    </button>
                                ))
                            )}
                        </nav>
                    </>
                )}

                <div className="account-card">
                    <div className="mini-avatar self">{currentUsername.charAt(0).toUpperCase()}</div>
                    <div>
                        <div className="account-name">{currentUsername}</div>
                        <div className="account-status">Online on LAN</div>
                    </div>
                </div>
            </aside>

            <main className="chat-main">
                <header className="chat-topbar">
                    <div>
                        <h1>{title}</h1>
                        <p>{activeView === 'dm' ? 'Private conversation' : `${activeServer.name} channel`}</p>
                    </div>
                    <div className="chat-topbar-actions">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} />
                        <button
                            type="button"
                            className="clear-history-button"
                            onClick={clearHistory}
                        >
                            Clear History
                        </button>
                    </div>
                </header>

                <div className="encryption-strip">
                    <input
                        type="password"
                        placeholder="Shared E2EE passphrase required"
                        value={encryptionPassphrase}
                        autoComplete="off"
                        onChange={(event) => setEncryptionPassphrase(event.target.value)}
                    />
                    {encryptionPassphrase && (
                        <span>{cryptoReady ? 'E2EE ready' : 'Loading encryption...'}</span>
                    )}
                    {isEncrypted && <span>Encrypted</span>}
                </div>

                <MessageList
                    messages={visibleMessages}
                    searchQuery={searchQuery}
                    messagesEndRef={messagesEndRef}
                    onDecryptFile={decryptFileMessage}
                />

                {isTyping && (
                    <div className="typing-indicator">
                        {typingUser} is typing...
                    </div>
                )}

                {composerDisabled ? (
                    <div className="empty-compose">Choose an online user to start a DM.</div>
                ) : (
                    <MessageInput
                        currentUsername={currentUsername}
                        onUsernameChange={setCurrentUsername}
                        onSendMessage={sendMessage}
                        onTyping={handleTyping}
                        onFileUpload={handleFileUpload}
                        isUploading={isUploading}
                        uploadStatus={uploadStatus}
                    />
                )}
            </main>

            <aside className="members-panel">
                <div className="members-title">Online - {users.length}</div>
                <div className="members-list">
                    {users.length === 0 ? (
                        <div className="empty-state">No users online</div>
                    ) : (
                        users.map((user, index) => (
                            <button
                                key={`${user}_${index}`}
                                className="member-row"
                                onClick={() => user !== currentUsername && openDm(user)}
                            >
                                <span className="mini-avatar">{user.charAt(0).toUpperCase()}</span>
                                <span>{user}</span>
                                {user === currentUsername && <small>You</small>}
                            </button>
                        ))
                    )}
                </div>
            </aside>
        </div>
    );
}

export default App;
