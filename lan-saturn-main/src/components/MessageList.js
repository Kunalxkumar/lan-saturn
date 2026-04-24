import React from 'react';

function MessageList({ messages, searchQuery, messagesEndRef, onDecryptFile }) {
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatMessage = (text) => {
        if (!text) return '';

        const safeText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return safeText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    };

    const filteredMessages = messages.filter(message => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const content = message.content || message.filename || '';
        return content.toLowerCase().includes(searchLower) ||
            (message.username && message.username.toLowerCase().includes(searchLower));
    });

    return (
        <div className="messages-container">
            {filteredMessages.map((message) => {
                if (message.type === 'notification') {
                    return (
                        <div key={message.id} className="message notification">
                            {message.content}
                        </div>
                    );
                }

                if (message.type === 'file') {
                    const displayName = message.decryptedFilename || message.filename.replace(/\.lsenc$/i, '');
                    const displayUrl = message.decryptedUrl || (!message.encryptedFile ? message.fileUrl : '');
                    const isImage = displayName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                    return (
                        <div key={message.id} className={`message file-message ${message.isOwn ? 'own' : ''}`}>
                            <div className="file-header">
                                <span className="username">{message.username}</span>
                                <span className="timestamp">{formatTime(message.timestamp)}</span>
                            </div>
                            {message.encryptedFile && (
                                <div className="encrypted-label">
                                    End-to-end encrypted file
                                </div>
                            )}
                            {isImage && displayUrl && (
                                <div className="file-preview">
                                    <img src={displayUrl} alt={displayName} />
                                </div>
                            )}
                            {displayUrl ? (
                                <a
                                    href={displayUrl}
                                    download={displayName}
                                    className="file-link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Attachment: {displayName}
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    className="file-decrypt-button"
                                    onClick={() => onDecryptFile?.(message)}
                                >
                                    Decrypt file: {displayName}
                                </button>
                            )}
                        </div>
                    );
                }

                return (
                    <div
                        key={message.id}
                        className={`message ${message.isOwn ? 'own' : ''} ${message.isPrivate ? 'private' : ''}`}
                    >
                        <span className="username">{message.username}:</span>
                        {message.isEncrypted && <span className="encrypted-label inline">E2EE</span>}
                        <span
                            className="message-text"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                        />
                        {message.isPrivate && <span className="private-msg">PRIVATE</span>}
                        <span className="timestamp">{formatTime(message.timestamp)}</span>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageList;
