import { useState, useEffect } from 'react';

export default function useChatMessages({
    socket,
    encryption,
    activeChannel,
    currentUsername,
    activeView,
    activeDmUser
}) {
    const [messages, setMessages] = useState([]);

    const {
        encryptionPassphrase,
        cryptoReady,
        encryptText,
        decryptText
    } = encryption || {};

    // Persist messages
    useEffect(() => {
        const savedMessages = messages.map(({ decryptedUrl, decryptedFilename, ...item }) => {
            if (item.isEncrypted) {
                return { ...item, content: '[Encrypted message - enter passphrase to view]' };
            }
            return item;
        });
        localStorage.setItem('lanSaturn_messages', JSON.stringify(savedMessages));
    }, [messages]);

    const addMessage = (message) => {
        setMessages(prev => [...prev, message].slice(-100));
    };

    const sendReaction = (messageId, emoji) => {
        if (!socket) return;
        socket.emit('add_reaction', {
            messageId,
            emoji,
            username: currentUsername
        });

        setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
                const reactions = { ...(msg.reactions || {}) };
                const usersList = reactions[emoji] || [];
                if (usersList.includes(currentUsername)) {
                    reactions[emoji] = usersList.filter(u => u !== currentUsername);
                    if (reactions[emoji].length === 0) {
                        delete reactions[emoji];
                    }
                } else {
                    reactions[emoji] = [...usersList, currentUsername];
                }
                return { ...msg, reactions };
            }
            return msg;
        }));
    };

    const clearHistory = () => {
        const confirmed = window.confirm('Clear all saved chat history on this device?');
        if (!confirmed) return;

        messages.forEach(message => {
            if (message.decryptedUrl) {
                URL.revokeObjectURL(message.decryptedUrl);
            }
        });

        setMessages([]);
        localStorage.removeItem('lanSaturn_messages');
        return true;
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
                    dmEncryptedData = encryptText(cleanMessage, encryptionPassphrase);
                    dmMessage = dmEncryptedData.data;
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

            socket.emit('private_message', {
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
                encryptedData = encryptText(cleanMessage, encryptionPassphrase);
                finalMessage = encryptedData.data;
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

        socket.emit('send_message', {
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

        socket.emit('typing_stop', { username: currentUsername });
    };

    return {
        messages,
        setMessages,
        addMessage,
        sendReaction,
        sendMessage,
        clearHistory
    };
}
