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
import SmartSearchModal from './components/SmartSearch';
import { BarChart3 } from 'lucide-react';
import useSocket from './hooks/useSocket';
import useChatMessages from './hooks/chat/useChatMessages';
import useSocketEvents from './hooks/socket/useSocketEvents';
import useEncryption from './hooks/encryption/useEncryption';
import { useAppStore, useUIStore, useChatStore, useSecurityStore, useTransferStore, ActiveTransfer } from './store/appStore';
import { uploadFileInChunks, cancelChunkedUpload } from './lib/chunkedUpload';
import { downloadFileStreaming } from './lib/chunkedDownload';
import ActiveTransferDock from './components/Transfers/ActiveTransferDock';
import { decryptStreamFile, STREAM_CRYPTO_VERSION } from './lib/crypto';

function App() {
    const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('lanSaturn_username') || 'Anonymous');
    const { activeChannel, setActiveChannel, activeView, setActiveView, activeDmUser, setActiveDmUser } = useAppStore();
    const { searchQuery, setSearchQuery, showPollModal, setShowPollModal, showTransferHistory, setShowTransferHistory, showSearchModal, setShowSearchModal } = useUIStore();
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

    // Global Command Palette / Smart Search Shortcut (Ctrl+K / Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setShowSearchModal(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setShowSearchModal]);

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

        const uploadTransferId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        let isPaused = false;

        useTransferStore.getState().addTransfer({
            id: uploadTransferId,
            filename: file.name,
            totalSize: file.size,
            transferredBytes: 0,
            percent: 0,
            speedMBs: 0,
            etaSeconds: 0,
            state: 'starting',
            direction: 'upload',
            isEncrypted: shouldEncrypt,
            pause: () => {
                isPaused = true;
                useTransferStore.getState().updateTransfer(uploadTransferId, { state: 'paused' });
            },
            resume: () => {
                isPaused = false;
                useTransferStore.getState().updateTransfer(uploadTransferId, { state: 'uploading' });
            },
            cancel: () => {
                abortController.abort();
                useTransferStore.getState().updateTransfer(uploadTransferId, { state: 'cancelled' });
            }
        });

        setIsUploading(true);
        setUploadStatus(shouldEncrypt ? `Encrypting & uploading ${file.name}...` : `Uploading ${file.name}...`);

        try {
            const result = await uploadFileInChunks(file, {
                passphrase: shouldEncrypt ? encryptionPassphrase.trim() : undefined,
                signal: abortController.signal,
                isPaused: () => isPaused,
                onProgress: (prog) => {
                    useTransferStore.getState().updateTransfer(uploadTransferId, {
                        percent: prog.percent,
                        transferredBytes: prog.uploadedBytes,
                        totalSize: prog.totalBytes,
                        speedMBs: prog.speedMBs,
                        etaSeconds: prog.etaSeconds,
                        state: prog.state as any,
                    });

                    const speedText = prog.speedMBs > 0 ? ` • ${prog.speedMBs} MB/s` : '';
                    const etaText = prog.etaSeconds > 0 ? ` • ETA: ${prog.etaSeconds}s` : '';
                    const stateLabel = prog.state === 'verifying' 
                        ? 'Verifying SHA-256' 
                        : (shouldEncrypt ? 'Encrypting & uploading' : 'Uploading');
                    setUploadStatus(`${stateLabel} ${file.name} (${prog.percent}%${speedText}${etaText})`);
                }
            });

            if (result && result.success) {
                useTransferStore.getState().updateTransfer(uploadTransferId, {
                    percent: 100,
                    transferredBytes: file.size,
                    state: 'completed',
                    hash: result.hash,
                });

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
                useTransferStore.getState().updateTransfer(uploadTransferId, {
                    state: 'failed',
                    error: 'Upload failed'
                });
                setUploadStatus('Upload failed');
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            const isCancelled = error?.message === 'Upload cancelled';
            useTransferStore.getState().updateTransfer(uploadTransferId, {
                state: isCancelled ? 'cancelled' : 'failed',
                error: isCancelled ? undefined : (error?.message || 'Upload failed')
            });
            if (isCancelled) {
                setUploadStatus('Upload cancelled');
            } else {
                setUploadStatus(error?.message || 'Upload failed. Try again.');
            }
        } finally {
            setIsUploading(false);
            uploadAbortControllerRef.current = null;
        }
    };

    const decryptFileMessage = async (message: any) => {
        if (!message.encryptedFile) return;

        if (!encryptionPassphrase) {
            setUploadStatus('Enter the shared E2EE passphrase to decrypt this file.');
            return;
        }

        if (!cryptoReady) {
            setUploadStatus('Encryption is still loading. Try again in a moment.');
            return;
        }

        const downloadId = `dec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const abortController = new AbortController();

        useTransferStore.getState().addTransfer({
            id: downloadId,
            filename: (message.decryptedFilename || message.filename).replace(/\.lsenc$/i, ''),
            totalSize: message.originalSize || 0,
            transferredBytes: 0,
            percent: 0,
            speedMBs: 0,
            etaSeconds: 0,
            state: 'starting',
            direction: 'download',
            isEncrypted: true,
            cancel: () => {
                abortController.abort();
                useTransferStore.getState().updateTransfer(downloadId, { state: 'cancelled' });
            }
        });

        setUploadStatus(`Decrypting ${message.filename}...`);

        try {
            const result = await downloadFileStreaming(message.fileUrl, message.filename, {
                expectedHash: message.hash,
                passphrase: encryptionPassphrase.trim(),
                isEncrypted: true,
                signal: abortController.signal,
                encryptionMetadata: {
                    salt: message.salt,
                    nonce: message.nonce,
                    header: message.header,
                    chunkSize: message.chunkSize,
                    originalSize: message.originalSize,
                    originalType: message.originalType,
                },
                onProgress: (prog) => {
                    useTransferStore.getState().updateTransfer(downloadId, {
                        percent: prog.percent,
                        transferredBytes: prog.uploadedBytes,
                        totalSize: prog.totalBytes || message.originalSize || 0,
                        speedMBs: prog.speedMBs,
                        etaSeconds: prog.etaSeconds,
                        state: prog.state as any,
                    });
                }
            });

            useTransferStore.getState().updateTransfer(downloadId, {
                percent: 100,
                state: 'completed',
                hash: result.hash,
            });

            const decryptedUrl = result.blobUrl;
            const decryptedFilename = result.filename;

            setMessages(prev => prev.map(item => (
                item.id === message.id
                    ? { ...item, decryptedUrl, decryptedFilename }
                    : item
            )));
            setUploadStatus(`Decrypted ${decryptedFilename}`);
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error: any) {
            console.error('File decryption failed:', error);
            const isCancelled = error?.message === 'Download cancelled by user';
            useTransferStore.getState().updateTransfer(downloadId, {
                state: isCancelled ? 'cancelled' : 'failed',
                error: isCancelled ? undefined : (error?.message || 'File decryption failed')
            });
            setUploadStatus(isCancelled ? 'Decryption cancelled' : 'File decryption failed. Wrong passphrase or damaged file.');
        }
    };

    const handleDownloadFile = async (message: any) => {
        if (!message) return;
        const targetUrl = message.decryptedUrl || message.fileUrl;
        const targetFilename = message.decryptedFilename || (message.filename || 'download').replace(/\.lsenc$/i, '');

        if (!targetUrl) return;

        // If it's already an in-memory blob URL, trigger instant browser save
        if (targetUrl.startsWith('blob:')) {
            const a = document.createElement('a');
            a.href = targetUrl;
            a.download = targetFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        // Stream progressively with live speed, ETA, and SHA-256 verification
        const downloadId = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const abortController = new AbortController();

        useTransferStore.getState().addTransfer({
            id: downloadId,
            filename: targetFilename,
            totalSize: message.originalSize || 0,
            transferredBytes: 0,
            percent: 0,
            speedMBs: 0,
            etaSeconds: 0,
            state: 'starting',
            direction: 'download',
            hash: message.hash,
            isEncrypted: Boolean(message.encryptedFile),
            cancel: () => {
                abortController.abort();
                useTransferStore.getState().updateTransfer(downloadId, { state: 'cancelled' });
            }
        });

        try {
            const result = await downloadFileStreaming(targetUrl, message.filename || targetFilename, {
                expectedHash: message.hash,
                passphrase: encryptionPassphrase ? encryptionPassphrase.trim() : undefined,
                isEncrypted: Boolean(message.encryptedFile),
                signal: abortController.signal,
                encryptionMetadata: {
                    salt: message.salt,
                    nonce: message.nonce,
                    header: message.header,
                    chunkSize: message.chunkSize,
                    originalSize: message.originalSize,
                    originalType: message.originalType,
                },
                onProgress: (prog) => {
                    useTransferStore.getState().updateTransfer(downloadId, {
                        percent: prog.percent,
                        transferredBytes: prog.uploadedBytes,
                        totalSize: prog.totalBytes || message.originalSize || 0,
                        speedMBs: prog.speedMBs,
                        etaSeconds: prog.etaSeconds,
                        state: prog.state as any,
                    });
                }
            });

            useTransferStore.getState().updateTransfer(downloadId, {
                percent: 100,
                state: 'completed',
                hash: result.hash,
            });

            const a = document.createElement('a');
            a.href = result.blobUrl;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error: any) {
            if (error?.message !== 'Download cancelled by user') {
                console.error('Download streaming failed:', error);
                useTransferStore.getState().updateTransfer(downloadId, {
                    state: 'failed',
                    error: error?.message || 'Download failed'
                });
            }
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
    const title = activeView === 'dm' 
        ? `@${activeDmUser || 'direct-messages'}` 
        : activeView === 'notes' 
            ? 'Shared Notes' 
            : activeView === 'filebrowser' 
                ? 'Remote File Browser' 
                : activeView === 'clipboardsync' 
                    ? 'Clipboard Sync' 
                    : activeView === 'security' 
                        ? 'Security & Access Control' 
                        : activeView === 'calendar' 
                            ? 'Shared Calendar' 
                            : `#${activeChannel}`;

    // --- Render ---

    return (
        <div className="flex flex-col h-screen w-full bg-[#07090e] bg-space-ambient text-slate-100 overflow-hidden antialiased font-sans select-none">
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

                <main className="flex-1 flex flex-col h-full bg-[#090c13] relative z-0 min-w-0">
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
                            <MessageList 
                                messages={visibleMessages} 
                                searchQuery={searchQuery} 
                                messagesEndRef={messagesEndRef} 
                                onDecryptFile={decryptFileMessage} 
                                onDownloadFile={handleDownloadFile}
                                onReact={sendReaction} 
                                currentUsername={currentUsername} 
                            />

                            {activeView === 'server' && polls.length > 0 && (
                                <div className="absolute right-4 top-16 w-80 space-y-4 max-h-[50vh] overflow-y-auto z-10 custom-scrollbar">
                                    {polls.filter(p => !p.closed).map(poll => (
                                        <Poll key={poll.id} poll={poll} currentUsername={currentUsername} onVote={votePoll} onClose={closePoll} />
                                    ))}
                                </div>
                            )}

                            {isTyping && (
                                <div className="px-6 py-1 text-xs text-sky-400 font-mono italic flex-none animate-pulse">
                                    {typingUser} is typing...
                                </div>
                            )}

                            {composerDisabled ? (
                                <div className="p-6 text-center text-slate-500 italic bg-[#0c101a] border-t border-white/[0.06] flex-none text-xs">
                                    Choose an online peer from the roster to start a direct message thread.
                                </div>
                            ) : (
                                <div className="flex flex-col bg-gradient-to-t from-[#090c13] via-[#090c13] to-transparent flex-none relative z-20">
                                    {isUploading && (
                                        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-[#121826] border border-sky-500/30 flex items-center justify-between shadow-lg">
                                            <div className="flex items-center gap-2 text-xs font-mono text-sky-300 truncate mr-2">
                                                <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
                                                <span className="truncate">{uploadStatus}</span>
                                            </div>
                                            <button
                                                onClick={handleCancelUpload}
                                                className="text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white px-2.5 py-1 rounded-md transition-colors font-mono shrink-0 cursor-pointer"
                                                title="Cancel ongoing upload"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2 pr-4">
                                        <div className="flex-1 min-w-0">
                                            <MessageComposer
                                                activeChannel={activeChannel}
                                                onSendMessage={sendMessage}
                                                onTyping={handleTyping}
                                                onTypingStop={handleTypingStop}
                                                onFileUpload={handleFileUpload}
                                                isUploading={isUploading}
                                                uploadStatus={uploadStatus}
                                            />
                                        </div>
                                        {activeView === 'server' && (
                                            <button 
                                                className="h-10 w-10 mb-3 bg-[#121826] hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 rounded-xl transition-all flex items-center justify-center shrink-0 border border-white/[0.08] hover:border-sky-500/40 shadow-md cursor-pointer"
                                                onClick={() => setShowPollModal(true)} 
                                                title="Create Poll"
                                            >
                                                <BarChart3 size={18} />
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

            {/* Modals & Overlays */}
            {showPollModal && (
                <CreatePollModal onSubmit={createPoll} onCancel={() => setShowPollModal(false)} />
            )}

            {showTransferHistory && (
                <TransferHistory onClose={() => setShowTransferHistory(false)} />
            )}

            <SmartSearchModal 
                messages={messages}
                onSelectMessage={(msg) => {
                    if (msg.channel) {
                        setActiveChannel(msg.channel);
                        setActiveView('server');
                    }
                }}
            />

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

            {/* Active Transfers Floating Progress Dock */}
            <ActiveTransferDock />
        </div>
    );
}

export default App;
