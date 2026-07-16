import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function ZipPreview({ filename }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const loadZipContents = async () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }
        setIsOpen(true);
        if (files.length > 0) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/zip-preview/${filename}`);
            const data = await res.json();
            if (res.ok && data.success) {
                setFiles(data.files || []);
            } else {
                setError(data.error || 'Failed to read zip contents');
            }
        } catch (err) {
            setError('Error loading zip preview');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="zip-preview-container">
            <button className="zip-preview-toggle-btn" onClick={loadZipContents}>
                {isOpen ? '▼ Hide zip contents' : '► Preview zip contents'}
            </button>
            {isOpen && (
                <div className="zip-contents-list">
                    {loading && <div className="zip-loading">Loading contents...</div>}
                    {error && <div className="zip-error">{error}</div>}
                    {!loading && !error && files.map((f, i) => (
                        <div key={i} className={`zip-file-item ${f.is_dir ? 'is-dir' : ''}`}>
                            <span className="zip-file-name">{f.is_dir ? '📁' : '📄'} {f.name}</span>
                            {!f.is_dir && <span className="zip-file-size">({(f.size / 1024).toFixed(1)} KB)</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MessageList({ messages, searchQuery, messagesEndRef, onDecryptFile, onReact, currentUsername }) {
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatMessage = (text) => {
        if (!text) return '';
        try {
            const parsed = marked.parse(text, { async: false, breaks: true, gfm: true });
            return DOMPurify.sanitize(parsed);
        } catch (e) {
            return text;
        }
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
                    const isVideo = displayName.match(/\.(mp4|webm|ogg)$/i);
                    const isAudio = displayName.match(/\.(mp3|wav|ogg)$/i);
                    const isZip = displayName.match(/\.zip$/i);

                    // Formatted size
                    const sizeMB = message.originalSize ? (message.originalSize / (1024 * 1024)).toFixed(2) : null;

                    return (
                        <div key={message.id} className={`message file-message ${message.isOwn ? 'own' : ''}`}>
                            <div className="message-hover-actions">
                                {['👍', '❤️', '🔥', '😂', '😮', '😢'].map(emoji => (
                                    <button
                                        key={emoji}
                                        className="hover-action-btn"
                                        onClick={() => onReact?.(message.id, emoji)}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
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
                            {isVideo && displayUrl && (
                                <div className="file-preview video-preview">
                                    <video src={displayUrl} controls preload="metadata" />
                                </div>
                            )}
                            {isAudio && displayUrl && (
                                <div className="file-preview audio-preview">
                                    <audio src={displayUrl} controls preload="metadata" />
                                </div>
                            )}
                            {isZip && !message.encryptedFile && (
                                <ZipPreview filename={message.filename} />
                            )}
                            {displayUrl ? (
                                <div className="file-download-row">
                                    <a
                                        href={displayUrl}
                                        download={displayName}
                                        className="file-link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Attachment: {displayName}
                                    </a>
                                    {sizeMB && <span className="file-size-info">({sizeMB} MB)</span>}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="file-decrypt-button"
                                    onClick={() => onDecryptFile?.(message)}
                                >
                                    Decrypt file: {displayName}
                                </button>
                            )}
                            {message.reactions && Object.keys(message.reactions).length > 0 && (
                                <div className="message-reactions-list">
                                    {Object.entries(message.reactions).map(([emoji, users]) => {
                                        const hasReacted = users.includes(currentUsername);
                                        return (
                                            <button
                                                key={emoji}
                                                className={`reaction-pill ${hasReacted ? 'active' : ''}`}
                                                onClick={() => onReact?.(message.id, emoji)}
                                                title={`Reacted by: ${users.join(', ')}`}
                                            >
                                                <span className="emoji">{emoji}</span>
                                                <span className="count">{users.length}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                }

                return (
                    <div
                        key={message.id}
                        className={`message ${message.isOwn ? 'own' : ''} ${message.isPrivate ? 'private' : ''}`}
                    >
                        <div className="message-hover-actions">
                            {['👍', '❤️', '🔥', '😂', '😮', '😢'].map(emoji => (
                                <button
                                    key={emoji}
                                    className="hover-action-btn"
                                    onClick={() => onReact?.(message.id, emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <span className="username">{message.username}:</span>
                        {message.isEncrypted && <span className="encrypted-label inline">E2EE</span>}
                        <span
                            className="message-text markdown-body"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                        />
                        {message.isPrivate && <span className="private-msg">PRIVATE</span>}
                        <span className="timestamp">{formatTime(message.timestamp)}</span>
                        {message.reactions && Object.keys(message.reactions).length > 0 && (
                            <div className="message-reactions-list">
                                {Object.entries(message.reactions).map(([emoji, users]) => {
                                    const hasReacted = users.includes(currentUsername);
                                    return (
                                        <button
                                            key={emoji}
                                            className={`reaction-pill ${hasReacted ? 'active' : ''}`}
                                            onClick={() => onReact?.(message.id, emoji)}
                                            title={`Reacted by: ${users.join(', ')}`}
                                        >
                                            <span className="emoji">{emoji}</span>
                                            <span className="count">{users.length}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageList;
