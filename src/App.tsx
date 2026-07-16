import React, { useEffect, useMemo, useRef, useState } from 'react';
import sodium from 'libsodium-wrappers-sumo';
import MessageList from './components/Chat/MessageList';
import MessageComposer from './components/Chat/MessageComposer';
import Sidebar from './components/Layout/Sidebar/Sidebar';
import RightPanel from './components/Layout/RightPanel/RightPanel';
import Layout from './components/Layout/Layout';
import JoinChannelModal from './components/Modals/JoinChannelModal';
import ChatHeader from './components/Chat/ChatHeader';
import ThemeToggle from './components/ThemeToggle';
import SmartSearch from './components/SmartSearch';
import AnnouncementBanner from './components/AnnouncementBanner';
import { Poll, CreatePollModal } from './components/Poll';
import TaskList from './components/TaskList';
import SharedNotes from './components/SharedNotes';
import FileBrowser from './components/FileBrowser';
import TransferHistory from './components/TransferHistory';
import ClipboardSync from './components/ClipboardSync';
import SecurityPanel from './components/SecurityPanel';
import Calendar from './components/Calendar';
import useSocket from './hooks/useSocket';
import useChatMessages from './hooks/chat/useChatMessages';
import useSocketEvents from './hooks/socket/useSocketEvents';
import servers from './lib/servers';
import useEncryption from './hooks/encryption/useEncryption';
import { useAppStore, useUIStore, useChatStore, useSecurityStore } from './store/appStore';

function App() {
    const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('lanSaturn_username') || 'Anonymous');
    const { theme, setTheme, activeServerId, setActiveServerId, activeChannel, setActiveChannel, activeView, setActiveView, activeDmUser, setActiveDmUser } = useAppStore();
    const { searchQuery, setSearchQuery, showBroadcastInput, setShowBroadcastInput, showPollModal, setShowPollModal, showTransferHistory, setShowTransferHistory } = useUIStore();
    const { isTyping, setIsTyping, typingUser, setTypingUser, isUploading, setIsUploading, uploadStatus, setUploadStatus } = useChatStore();
    const { channelPasswords, setChannelPasswords, joiningChannel, setJoiningChannel, joinPassword, setJoinPassword, joinInvite, setJoinInvite } = useSecurityStore();
    const {
        encryptionPassphrase,
        setEncryptionPassphrase,
        encryptionPassphraseRef,
        isEncrypted,
        cryptoReady,
        encryptText,
        decryptText,
        encryptBytes,
        decryptBytes
    } = useEncryption();
    const [announcements, setAnnouncements] = useState([]);
    const [polls, setPolls] = useState([]);
    const [channelTasks, setChannelTasks] = useState([]);

    const messagesEndRef = useRef(null);
    const activeChannelRef = useRef(activeChannel);
    const typingTimeoutRef = useRef(null);

    const { socketRef, connectionStatus, users } = useSocket(activeChannel, currentUsername);

    const { 
        messages, 
        setMessages, 
        addMessage, 
        sendReaction, 
        sendMessage, 
        clearHistory 
    } = useChatMessages({
        socket: socketRef.current,
        encryption: {
            encryptionPassphrase,
            cryptoReady,
            encryptText,
            decryptText
        },
        activeChannel,
        currentUsername,
        activeView,
        activeDmUser
    });

    useSocketEvents({
        socket: socketRef.current,
        encryption: {
            encryptionPassphrase,
            decryptText
        },
        addMessage,
        setMessages,
        setTypingUser,
        setIsTyping,
        setAnnouncements,
        setPolls,
        setChannelTasks,
        setJoiningChannel,
        activeChannel,
        activeView,
        currentUsername,
        channelPasswords
    });

    const activeServer = useMemo(
        () => servers.find(server => server.id === activeServerId) || servers[0],
        [activeServerId]
    );

    const availableDmUsers = useMemo(
        () => users.filter(user => user !== currentUsername && user !== 'Anonymous'),
        [users, currentUsername]
    );

    const allDmUsers = useMemo(() => {
        const dmUsers = new Set();
        messages.forEach(msg => {
            if (msg.type === 'private' && msg.dmUser && msg.dmUser !== 'Anonymous' && msg.dmUser !== currentUsername) {
                dmUsers.add(msg.dmUser);
            }
        });
        availableDmUsers.forEach(user => dmUsers.add(user));
        return Array.from(dmUsers);
    }, [messages, availableDmUsers, currentUsername]);

    // --- Effects ---

    useEffect(() => {
        if (currentUsername) {
            localStorage.setItem('lanSaturn_username', currentUsername);
        }
    }, [currentUsername]);

    // Re-decrypt messages when passphrase changes
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
                    content: decryptText(message.encryptedPayload, encryptionPassphrase, message.salt, message.nonce)
                };
            } catch (error) {
                return { ...message, content: '[Decryption failed - wrong passphrase or damaged message]' };
            }
        }));
    }, [cryptoReady, encryptionPassphrase]);



    // Auto-scroll
    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [messages, activeChannel, activeDmUser, activeView]);

    // --- Handlers ---



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
            const encryptedFile = encryptBytes(plainBytes, encryptionPassphrase);
            const encryptedBlob = new Blob([encryptedFile.cipherBytes as unknown as BlobPart], { type: 'application/octet-stream' });
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
            const encryptedBytesData = new Uint8Array(await response.arrayBuffer());
            const plainBytes = decryptBytes(
                encryptedBytesData,
                encryptionPassphrase,
                message.salt,
                message.nonce
            );
            const blob = new Blob([plainBytes as unknown as BlobPart], {
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

    const handleTypingStop = () => {
        socketRef.current?.emit('typing_stop', { username: currentUsername });
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

    const broadcastAnnouncement = (text) => {
        if (!text.trim() || !socketRef.current) return;
        socketRef.current.emit('broadcast_announcement', {
            text: text.trim(),
            username: currentUsername
        });
        setShowBroadcastInput(false);
    };

    const dismissAnnouncement = (id) => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
    };

    const handleJoinConfirm = () => {
        if (!socketRef.current || !joiningChannel) return;
        socketRef.current.emit('join_channel', {
            channel: joiningChannel,
            username: currentUsername,
            password: joinPassword,
            inviteCode: joinInvite
        });
        if (joinPassword) {
            setChannelPasswords({ ...channelPasswords, [joiningChannel]: joinPassword });
        }
        setJoiningChannel(null);
        setJoinPassword('');
        setJoinInvite('');
    };

    // Poll handlers
    const createPoll = (question, options) => {
        if (!socketRef.current) return;
        socketRef.current.emit('create_poll', {
            question,
            options,
            channel: activeChannel,
            username: currentUsername,
            timestamp: new Date().toISOString()
        });
        setShowPollModal(false);
    };

    const votePoll = (pollId, optionIndex) => {
        if (!socketRef.current) return;
        socketRef.current.emit('vote_poll', {
            pollId,
            optionIndex,
            username: currentUsername
        });
    };

    const closePoll = (pollId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('close_poll', {
            pollId,
            username: currentUsername
        });
    };

    // Task handlers
    const createTask = (text) => {
        if (!socketRef.current) return;
        socketRef.current.emit('create_task', {
            text,
            channel: activeChannel,
            username: currentUsername
        });
    };

    const toggleTask = (taskId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('toggle_task', {
            taskId,
            channel: activeChannel
        });
    };

    const deleteTask = (taskId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('delete_task', {
            taskId,
            channel: activeChannel
        });
    };

    // --- Derived state ---

    const visibleMessages = messages.filter(message => {
        if (activeView === 'dm') {
            return message.type === 'private' && message.dmUser === activeDmUser;
        }
        if (message.type === 'private') return false;
        return (message.channel || 'general') === activeChannel;
    });

    const composerDisabled = activeView === 'dm' && !activeDmUser;
    const title = activeView === 'dm' ? `@${activeDmUser || 'direct-messages'}` : activeView === 'notes' ? '📝 Shared Notes' : activeView === 'filebrowser' ? '📂 Remote File Browser' : activeView === 'clipboardsync' ? '📋 Clipboard Sync' : activeView === 'security' ? '🛡️ Security Panel' : activeView === 'calendar' ? '📅 Shared Calendar' : `#${activeChannel}`;

    // --- Render ---

    return (
        <Layout theme={theme}>
            <Sidebar 
                activeChannel={activeChannel}
                setActiveChannel={setActiveChannel}
                activeView={activeView}
                setActiveView={setActiveView}
                connectionStatus={connectionStatus}
                currentUsername={currentUsername}
                setCurrentUsername={setCurrentUsername}
            />

            <main className="flex-1 flex flex-col min-w-0 bg-saturn-base relative">
                <ChatHeader 
                    activeView={activeView}
                    activeChannel={activeChannel}
                    title={title}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isEncrypted={isEncrypted}
                    cryptoReady={cryptoReady}
                />

                {activeView === 'notes' ? (
                    <SharedNotes socket={socketRef.current} channel={activeChannel} username={currentUsername} onClose={() => setActiveView('server')} />
                ) : activeView === 'filebrowser' ? (
                    <FileBrowser socket={socketRef.current} username={currentUsername} />
                ) : activeView === 'clipboardsync' ? (
                    <ClipboardSync socket={socketRef.current} username={currentUsername} />
                ) : activeView === 'security' ? (
                    <SecurityPanel socket={socketRef.current} channel={activeChannel} username={currentUsername} encryptionPassphrase={encryptionPassphrase} setEncryptionPassphrase={setEncryptionPassphrase} cryptoReady={cryptoReady} />
                ) : activeView === 'calendar' ? (
                    <Calendar socket={socketRef.current} channel={activeChannel} username={currentUsername} />
                ) : (
                    <>
                        <AnnouncementBanner announcements={announcements} onDismiss={dismissAnnouncement} />
                        <MessageList messages={visibleMessages} searchQuery={searchQuery} messagesEndRef={messagesEndRef} onDecryptFile={decryptFileMessage} onReact={sendReaction} currentUsername={currentUsername} />

                        {activeView === 'server' && polls.length > 0 && (
                            <div className="absolute right-4 top-20 w-80 space-y-4 max-h-[50vh] overflow-y-auto z-10 scrollbar-thin">
                                {polls.filter(p => !p.closed).map(poll => (
                                    <Poll key={poll.id} poll={poll} currentUsername={currentUsername} onVote={votePoll} onClose={closePoll} />
                                ))}
                            </div>
                        )}

                        {isTyping && (
                            <div className="px-6 py-2 text-sm text-gray-400 italic flex-none animate-pulse">
                                {typingUser} is typing...
                            </div>
                        )}

                        {composerDisabled ? (
                            <div className="p-6 text-center text-gray-400 italic bg-saturn-dark border-t border-saturn-light flex-none">
                                Choose an online user to start a DM.
                            </div>
                        ) : (
                            <div className="flex items-end gap-2 p-4 bg-saturn-base border-t border-saturn-light flex-none relative z-20">
                                <MessageComposer
                                    activeChannel={activeChannel}
                                    onSendMessage={sendMessage}
                                    onTyping={handleTyping}
                                    onTypingStop={handleTypingStop}
                                    onFileUpload={handleFileUpload}
                                    isUploading={isUploading}
                                    uploadStatus={uploadStatus}
                                />
                                {activeView === 'server' && (
                                    <button 
                                        className="h-12 w-12 bg-saturn-light hover:bg-saturn-accentHover text-xl rounded-lg transition-colors flex items-center justify-center shrink-0 border border-gray-600 shadow-md"
                                        onClick={() => setShowPollModal(true)} 
                                        title="Create Poll"
                                    >
                                        📊
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>

            <RightPanel 
                users={users}
                currentUsername={currentUsername}
                channelTasks={channelTasks}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                createTask={createTask}
                activeView={activeView}
            />

            {showPollModal && (
                <CreatePollModal onSubmit={createPoll} onCancel={() => setShowPollModal(false)} />
            )}

            {showTransferHistory && (
                <TransferHistory onClose={() => setShowTransferHistory(false)} />
            )}

            <JoinChannelModal 
                joiningChannel={joiningChannel}
                joinPassword={joinPassword}
                setJoinPassword={setJoinPassword}
                joinInvite={joinInvite}
                setJoinInvite={setJoinInvite}
                setJoiningChannel={setJoiningChannel}
                setActiveChannel={setActiveChannel}
                handleJoinConfirm={handleJoinConfirm}
            />
        </Layout>
    );
}

export default App;
