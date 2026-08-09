import React, { useState } from 'react';
import { Shield } from 'lucide-react';
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

export default function MessageBubble({ message, onReact, onDecryptFile, currentUsername }) {
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

    const isFile = message.type === 'file';
    
    // File specifics
    const displayName = isFile ? (message.decryptedFilename || message.filename.replace(/\.lsenc$/i, '')) : '';
    const displayUrl = isFile ? (message.decryptedUrl || (!message.encryptedFile ? message.fileUrl : '')) : '';
    const isImage = isFile && displayName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isVideo = isFile && displayName.match(/\.(mp4|webm|ogg)$/i);
    const isAudio = isFile && displayName.match(/\.(mp3|wav|ogg)$/i);
    const isZip = isFile && displayName.match(/\.zip$/i);
    const sizeMB = isFile && message.originalSize ? (message.originalSize / (1024 * 1024)).toFixed(2) : null;

    return (
        <div className={`message-bubble group relative flex gap-3 p-2.5 rounded-lg hover:bg-surface-container-low transition-colors ${message.isOwn ? 'bg-primary-container/10' : ''} ${message.isPrivate ? 'bg-tertiary-container/15' : ''}`}>
            <div className="message-hover-actions absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container border border-outline-variant rounded-md shadow-lg flex items-center p-1 gap-1 z-10">
                {['👍', '❤️', '🔥', '😂'].map(emoji => (
                    <button key={emoji} className="hover-action-btn hover:bg-surface-container-high p-1 rounded transition-colors text-xs" onClick={() => onReact?.(message.id, emoji)}>
                        {emoji}
                    </button>
                ))}
            </div>

            <div className="message-avatar w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-sm text-indigo-400 border border-outline-variant shrink-0">
                {message.username.charAt(0).toUpperCase()}
            </div>
            
            <div className="message-content-wrapper flex-1 min-w-0">
                <div className="message-header flex items-baseline gap-2 mb-1">
                    <span className="message-username font-semibold text-sm text-on-surface">{message.username}</span>
                    <span className="message-time text-xs text-on-surface-variant font-mono">{formatTime(message.timestamp)}</span>
                    {message.isEncrypted && (
                        <span className="message-e2ee-badge text-emerald-400 flex items-center gap-1 text-[11px]" title="End-to-End Encrypted">
                            <Shield size={12} />
                        </span>
                    )}
                    {message.isPrivate && <span className="message-private-badge text-xs bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">PRIVATE</span>}
                </div>

                {!isFile ? (
                    <div 
                        className="message-text text-sm text-on-surface leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                ) : (
                    <div className="message-file-attachment">
                        {isImage && displayUrl && (
                            <img src={displayUrl} alt={displayName} className="preview-media image" />
                        )}
                        {isVideo && displayUrl && (
                            <video src={displayUrl} controls className="preview-media video" />
                        )}
                        {isAudio && displayUrl && (
                            <audio src={displayUrl} controls className="preview-media audio" />
                        )}
                        {isZip && !message.encryptedFile && (
                            <ZipPreview filename={message.filename} />
                        )}

                        {displayUrl ? (
                            <div className="file-download-box">
                                <a href={displayUrl} download={displayName} className="file-link" target="_blank" rel="noopener noreferrer">
                                    📁 {displayName}
                                </a>
                                {sizeMB && <span className="file-size-info">({sizeMB} MB)</span>}
                            </div>
                        ) : (
                            <button className="file-decrypt-button" onClick={() => onDecryptFile?.(message)}>
                                🔒 Decrypt: {displayName}
                            </button>
                        )}
                    </div>
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
        </div>
    );
}
