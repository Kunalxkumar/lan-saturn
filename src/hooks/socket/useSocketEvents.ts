import { useEffect, useRef } from 'react';

export default function useSocketEvents({
    socket,
    encryption,
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
}) {
    const callbacksRef = useRef({
        encryption,
        addMessage,
        setMessages,
        setTypingUser,
        setIsTyping,
        setAnnouncements,
        setPolls,
        setChannelTasks,
        setJoiningChannel,
        currentUsername
    });

    useEffect(() => {
        callbacksRef.current = {
            encryption,
            addMessage,
            setMessages,
            setTypingUser,
            setIsTyping,
            setAnnouncements,
            setPolls,
            setChannelTasks,
            setJoiningChannel,
            currentUsername
        };
    });

    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const onReceiveMessage = (data) => {
            const { encryption, addMessage } = callbacksRef.current;
            const currentPassphrase = encryption?.encryptionPassphrase;
            const decryptText = encryption?.decryptText;
            
            let content = data.message;
            if (data.encrypted && currentPassphrase && decryptText) {
                try {
                    content = decryptText(data.message, currentPassphrase, data.salt, data.nonce);
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
                nonce: data.nonce,
                reactions: {}
            });
        };

        const onFileShared = (data) => {
            callbacksRef.current.addMessage({
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
                isOwn: false,
                reactions: {}
            });
        };

        const onPrivateMessage = (data) => {
            const { encryption, addMessage } = callbacksRef.current;
            const currentPassphrase = encryption?.encryptionPassphrase;
            const decryptText = encryption?.decryptText;

            let content = data.message;
            if (data.encrypted && currentPassphrase && decryptText) {
                try {
                    content = decryptText(data.message, currentPassphrase, data.salt, data.nonce);
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
                nonce: data.nonce,
                reactions: {}
            });
        };

        const onUserTyping = (data) => {
            const { setTypingUser, setIsTyping } = callbacksRef.current;
            setTypingUser(data.username);
            setIsTyping(true);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
            }, 3000);
        };

        const onUserStoppedTyping = () => {
            const { setIsTyping } = callbacksRef.current;
            setIsTyping(false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };

        const onReactionAdded = (data) => {
            callbacksRef.current.setMessages(prev => prev.map(msg => {
                if (msg.id === data.messageId) {
                    const reactions = { ...(msg.reactions || {}) };
                    const usersList = reactions[data.emoji] || [];
                    if (usersList.includes(data.username)) {
                        reactions[data.emoji] = usersList.filter(u => u !== data.username);
                        if (reactions[data.emoji].length === 0) {
                            delete reactions[data.emoji];
                        }
                    } else {
                        reactions[data.emoji] = [...usersList, data.username];
                    }
                    return { ...msg, reactions };
                }
                return msg;
            }));
        };

        const onAnnouncement = (data) => {
            callbacksRef.current.setAnnouncements(prev => [data, ...prev].slice(0, 10));
        };
        const onAnnouncementsList = (data) => {
            callbacksRef.current.setAnnouncements(data.announcements || []);
        };

        const onPollCreated = (poll) => {
            callbacksRef.current.setPolls(prev => [...prev, poll]);
        };
        const onPollUpdated = (updated) => {
            callbacksRef.current.setPolls(prev => prev.map(p => p.id === updated.id ? updated : p));
        };
        const onPollsList = (data) => {
            callbacksRef.current.setPolls(data.polls || []);
        };

        const onTaskCreated = (data) => {
            callbacksRef.current.setChannelTasks(prev => [...prev, data.task]);
        };
        const onTaskUpdated = (data) => {
            callbacksRef.current.setChannelTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
        };
        const onTaskDeleted = (data) => {
            callbacksRef.current.setChannelTasks(prev => prev.filter(t => t.id !== data.taskId));
        };
        const onTasksList = (data) => {
            callbacksRef.current.setChannelTasks(data.tasks || []);
        };

        const onPasswordRequired = (data) => {
            callbacksRef.current.setJoiningChannel(data.channel);
        };
        const onSecurityError = (data) => {
            alert(`🛡️ Security Check: ${data.message}`);
        };

        socket.on('receive_message', onReceiveMessage);
        socket.on('file_shared', onFileShared);
        socket.on('private_message', onPrivateMessage);
        socket.on('user_typing', onUserTyping);
        socket.on('user_stopped_typing', onUserStoppedTyping);
        socket.on('reaction_added', onReactionAdded);
        socket.on('announcement', onAnnouncement);
        socket.on('announcements_list', onAnnouncementsList);
        socket.on('poll_created', onPollCreated);
        socket.on('poll_updated', onPollUpdated);
        socket.on('polls_list', onPollsList);
        socket.on('task_created', onTaskCreated);
        socket.on('task_updated', onTaskUpdated);
        socket.on('task_deleted', onTaskDeleted);
        socket.on('tasks_list', onTasksList);
        socket.on('password_required', onPasswordRequired);
        socket.on('security_error', onSecurityError);

        socket.emit('get_announcements');

        return () => {
            socket.off('receive_message', onReceiveMessage);
            socket.off('file_shared', onFileShared);
            socket.off('private_message', onPrivateMessage);
            socket.off('user_typing', onUserTyping);
            socket.off('user_stopped_typing', onUserStoppedTyping);
            socket.off('reaction_added', onReactionAdded);
            socket.off('announcement', onAnnouncement);
            socket.off('announcements_list', onAnnouncementsList);
            socket.off('poll_created', onPollCreated);
            socket.off('poll_updated', onPollUpdated);
            socket.off('polls_list', onPollsList);
            socket.off('task_created', onTaskCreated);
            socket.off('task_updated', onTaskUpdated);
            socket.off('task_deleted', onTaskDeleted);
            socket.off('tasks_list', onTasksList);
            socket.off('password_required', onPasswordRequired);
            socket.off('security_error', onSecurityError);
        };
    }, [socket]);

    // Channel switching
    useEffect(() => {
        if (activeView === 'server' && socket) {
            socket.emit('join_channel', {
                channel: activeChannel,
                username: currentUsername,
                password: channelPasswords[activeChannel] || ''
            });
            socket.emit('get_polls', { channel: activeChannel });
            socket.emit('get_tasks', { channel: activeChannel });
        }
    }, [socket, activeChannel, activeView, currentUsername, channelPasswords]);
}
