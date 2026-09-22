import React, { useEffect, useMemo, useRef, useState } from 'react';
import MessageList from './components/Chat/MessageList';
import MessageComposer from './components/Chat/MessageComposer';
import Sidebar from './components/Layout/Sidebar/Sidebar';
import RightPanel from './components/Layout/RightPanel/RightPanel';
import TopNavBar from './components/Layout/TopNavBar';
import GlobalSidebar from './components/Layout/GlobalSidebar';
import JoinChannelModal from './components/Modals/JoinChannelModal';
import ChatHeader from './components/Chat/ChatHeader';
import AnnouncementBanner from './components/AnnouncementBanner';
import { Poll, CreatePollModal } from './components/Poll';
import SharedNotes from './components/SharedNotes';
import FileBrowser from './components/FileBrowser';
import TransferHistory from './components/TransferHistory';
import ClipboardSync from './components/ClipboardSync';
import SecurityPanel from './components/SecurityPanel';
import Calendar from './components/Calendar';
import useSocket from './hooks/useSocket';
import useChatMessages from './hooks/chat/useChatMessages';
import useSocketEvents from './hooks/socket/useSocketEvents';
import useEncryption from './hooks/encryption/useEncryption';
import { useAppStore, useUIStore, useChatStore, useSecurityStore } from './store/appStore';
import { uploadFileInChunks, cancelChunkedUpload } from './lib/chunkedUpload';
import { decryptStreamFile, STREAM_CRYPTO_VERSION } from './lib/crypto';

function App() {
    const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('lanSaturn_username') || 'Anonymous');
    const { activeChannel, setActiveChannel, activeView, setActiveView, activeDmUser, setActiveDmUser } = useAppStore();
    const { searchQuery, setSearchQuery, showPollModal, setShowPollModal, showTransferHistory, setShowTransferHistory } = useUIStore();
    const { isTyping, setIsTyping, typingUser, setTypingUser, isUploading, setIsUploading, uploadStatus, setUploadStatus } = useChatStore();
    const { channelPasswords, setChannelPasswords, joiningChannel, setJoiningChannel, joinPassword, setJoinPassword, joinInvite, setJoinInvite } = useSecurityStore();
    const {
        encryptionPassphrase,
        setEncryptionPassphrase,
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

    const { socketRef, connectionStatus, users } = useSocket(activeChannel, currentUsername);

    const { 
        messages, 
        setMessages, 
        addMessage, 
        sendReaction, 
        sendMessage
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

    const availableDmUsers = useMemo(
        () => users.filter(user => user !== currentUsername && user !== 'Anonymous'),
        [users, currentUsername]
    );

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



    const uploadAbortControllerRef = useRef(null);

    const handleCancelUpload = () => {
        if (uploadAbortControllerRef.current) {
            uploadAbortControllerRef.current.abort();
            uploadAbortControllerRef.current = null;
            setUploadStatus('Upload cancelled.');
            setIsUploading(false);
            setTimeout(() => setUploadStatus(''), 3000);
        }
    };

    const handleFileUpload = async (file) => {
        if (!file) return;

        if (activeView === 'dm') {
            setUploadStatus('File upload is available in server channels.');
            setTimeout(() => setUploadStatus(''), 3000);
            return;
        }

        const maxFileSize = 4 * 1024 * 1024 * 1024;
        if (file.size > maxFileSize) {
            setUploadStatus('File is too large. Maximum size is 4 GB.');
            return;
        }

        const shouldEncrypt = Boolean(encryptionPassphrase && encryptionPassphrase.trim().length > 0);
        if (shouldEncrypt && !cryptoReady) {
            setUploadStatus('Encryption is still loading. Try again in a moment.');
            return;
        }

        const abortController = new AbortController();
        uploadAbortControllerRef.current = abortController;

        setIsUploading(true);
        setUploadStatus(shouldEncrypt ? `Encrypting & uploading ${file.name}...` : `Uploading ${file.name}...`);

        try {
            const result = await uploadFileInChunks(file, {
                passphrase: shouldEncrypt ? encryptionPassphrase.trim() : undefined,
                signal: abortController.signal,
                onProgress: (prog) => {
                    const speedText = prog.speedMBs > 0 ? ` • ${prog.speedMBs} MB/s` : '';
                    const etaText = prog.etaSeconds > 0 ? ` • ETA: ${prog.etaSeconds}s` : '';
                    const stateLabel = prog.state === 'verifying' 
                        ? 'Verifying SHA-256' 
                        : (shouldEncrypt ? 'Encrypting & uploading' : 'Uploading');
                    setUploadStatus(`${stateLabel} ${file.name} (${prog.percent}%${speedText}${etaText})`);
                }
            });

            if (result && result.success) {
                const timestamp = new Date().toISOString();

                socketRef.current?.emit('file_share', {
                    filename: result.filename,
                    fileUrl: result.fileUrl,
                    originalType: file.type || 'application/octet-stream',
                    originalSize: file.size,
                    encryptedFile: result.encryptedFile,
                    encryptionVersion: result.encryptionVersion,
                    salt: result.salt,
                    header: result.header,
                    chunkSize: result.chunkSize,
                    hash: result.hash,
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
                    encryptedFile: result.encryptedFile,
                    encryptionVersion: result.encryptionVersion,
                    salt: result.salt,
                    header: result.header,
                    chunkSize: result.chunkSize,
                    hash: result.hash,
                    decryptedUrl: URL.createObjectURL(file),
                    decryptedFilename: file.name,
                    channel: activeChannel,
                    timestamp,
                    isOwn: true
                });

                setUploadStatus(`Uploaded ${file.name}`);
                setTimeout(() => setUploadStatus(''), 3000);
            } else {
                setUploadStatus('Upload failed');
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            if (error?.message === 'Upload cancelled') {
                setUploadStatus('Upload cancelled');
            } else {
                setUploadStatus(error?.message || 'Upload failed. Try again.');
            }
        } finally {
            setIsUploading(false);
            uploadAbortControllerRef.current = null;
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

            let plainBytes;
            if (message.encryptionVersion === STREAM_CRYPTO_VERSION) {
                plainBytes = decryptStreamFile(
                    encryptedBytesData,
                    encryptionPassphrase.trim(),
                    message.salt,
                    message.chunkSize || (2 * 1024 * 1024)
                );
            } else {
                plainBytes = decryptBytes(
                    encryptedBytesData,
                    encryptionPassphrase.trim(),
                    message.salt,
                    message.nonce
                );
            }

            const blob = new Blob([plainBytes as unknown as BlobPart], {
                type: message.originalType || 'application/octet-stream'
            });
            const decryptedUrl = URL.createObjectURL(blob);
            const decryptedFilename = (message.decryptedFilename || message.filename).replace(/\.lsenc$/i, '');

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
        <div className="flex flex-col h-screen w-full bg-[#10141a] text-[#dfe2eb] overflow-hidden antialiased font-sans">
            <TopNavBar 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                currentUsername={currentUsername}
                connectionStatus={connectionStatus}
            />

            <div className="flex flex-1 overflow-hidden relative">
                <GlobalSidebar 
                    activeView={activeView}
                    setActiveView={setActiveView}
                />

                <Sidebar 
                    activeChannel={activeChannel}
                    setActiveChannel={setActiveChannel}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    connectionStatus={connectionStatus}
                    currentUsername={currentUsername}
                    setCurrentUsername={setCurrentUsername}
                />

                <main className="flex-1 flex flex-col h-full bg-[#0D1117] relative z-0 min-w-0">
                    <ChatHeader 
                        activeView={activeView}
                        activeChannel={activeChannel}
                        title={title}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        isEncrypted={isEncrypted}
                        cryptoReady={cryptoReady}
                        users={users}
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
                                <div className="absolute right-4 top-16 w-80 space-y-4 max-h-[50vh] overflow-y-auto z-10 scrollbar-thin">
                                    {polls.filter(p => !p.closed).map(poll => (
                                        <Poll key={poll.id} poll={poll} currentUsername={currentUsername} onVote={votePoll} onClose={closePoll} />
                                    ))}
                                </div>
                            )}

                            {isTyping && (
                                <div className="px-6 py-1.5 text-xs text-[#c6c5d7] italic flex-none animate-pulse">
                                    {typingUser} is typing...
                                </div>
                            )}

                            {composerDisabled ? (
                                <div className="p-6 text-center text-[#c6c5d7] italic bg-[#10141a] border-t border-[#30363d] flex-none">
                                    Choose an online user to start a DM.
                                </div>
                            ) : (
                                <div className="flex flex-col p-3 bg-gradient-to-t from-[#0D1117] via-[#0D1117] to-transparent flex-none relative z-20">
                                    {isUploading && (
                                        <div className="mx-2 mb-2 px-3 py-2 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-between shadow-md">
                                            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 truncate mr-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                                                <span className="truncate">{uploadStatus}</span>
                                            </div>
                                            <button
                                                onClick={handleCancelUpload}
                                                className="text-xs bg-red-600/80 hover:bg-red-600 text-white px-2.5 py-1 rounded transition-colors font-sans shrink-0 cursor-pointer"
                                                title="Cancel ongoing upload"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
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
                                                className="h-11 w-11 bg-[#181c22] hover:bg-[#5865f2] hover:text-white text-lg rounded-xl transition-colors flex items-center justify-center shrink-0 border border-[#30363d] shadow-md text-[#c6c5d7] cursor-pointer"
                                                onClick={() => setShowPollModal(true)} 
                                                title="Create Poll"
                                            >
                                                📊
                                            </button>
                                        )}
                                    </div>
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
            </div>

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
        </div>
    );
}

export default App;
