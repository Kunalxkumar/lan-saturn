import React, { useState } from 'react';
import { 
    Shield, 
    Lock, 
    Unlock, 
    Download, 
    Folder, 
    FileText, 
    FileArchive, 
    Film, 
    Music, 
    Image as ImageIcon,
    ChevronDown, 
    ChevronRight,
    Loader2
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { SpotlightCard } from '../ReactBits';

function ZipPreview({ filename }: { filename: string }) {
    const [files, setFiles] = useState<any[]>([]);
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
                setError(data.error || 'Failed to read archive contents');
            }
        } catch (err) {
            setError('Error loading zip preview');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-2 text-xs">
            <button 
                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium py-1 px-2 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors cursor-pointer"
                onClick={loadZipContents}
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{isOpen ? 'Collapse archive' : 'Explore ZIP contents'}</span>
            </button>

            {isOpen && (
                <div className="mt-2 p-2.5 rounded-lg bg-[#0e131d] border border-white/10 max-h-48 overflow-y-auto custom-scrollbar">
                    {loading && (
                        <div className="flex items-center gap-2 text-slate-400 py-1">
                            <Loader2 size={13} className="animate-spin text-sky-400" />
                            <span>Inspecting archive...</span>
                        </div>
                    )}
                    {error && <div className="text-rose-400 py-1">{error}</div>}
                    {!loading && !error && files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-1.5 hover:bg-white/[0.04] rounded transition-colors text-[11px] font-mono">
                            <div className="flex items-center gap-2 truncate">
                                {f.is_dir ? <Folder size={12} className="text-amber-400" /> : <FileText size={12} className="text-slate-400" />}
                                <span className={f.is_dir ? 'text-amber-300 font-semibold truncate' : 'text-slate-300 truncate'}>
                                    {f.name}
                                </span>
                            </div>
                            {!f.is_dir && (
                                <span className="text-slate-400 shrink-0 ml-2">
                                    {(f.size / 1024).toFixed(1)} KB
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface MessageBubbleProps {
    message: any;
    onReact?: (id: any, emoji: string) => void;
    onDecryptFile?: (msg: any) => void;
    onDownloadFile?: (msg: any) => void;
    currentUsername: string;
}

export default function MessageBubble({ message, onReact, onDecryptFile, onDownloadFile, currentUsername }: MessageBubbleProps) {
    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const formatMessage = (text: string) => {
        if (!text) return '';
        try {
            const parsed = marked.parse(text, { async: false, breaks: true, gfm: true }) as string;
            return DOMPurify.sanitize(parsed);
        } catch (e) {
            return text;
        }
    };

    const isFile = message.type === 'file';
    const isOwn = message.isOwn || message.username === currentUsername;
    
    // File specifics
    const displayName = isFile ? (message.decryptedFilename || message.filename?.replace(/\.lsenc$/i, '')) : '';
    const displayUrl = isFile ? (message.decryptedUrl || (!message.encryptedFile ? message.fileUrl : '')) : '';
    const isImage = isFile && displayName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isVideo = isFile && displayName.match(/\.(mp4|webm|ogg)$/i);
    const isAudio = isFile && displayName.match(/\.(mp3|wav|ogg)$/i);
    const isZip = isFile && displayName.match(/\.zip$/i);
    const sizeMB = isFile && message.originalSize ? (message.originalSize / (1024 * 1024)).toFixed(2) : null;

    const quickEmojis = ['👍', '❤️', '🔥', '🚀', '👀']; // unslop-ignore

    return (
        <div className={`group relative flex gap-3 p-2.5 rounded-xl transition-all ${
            isOwn 
                ? 'bg-[#121927]/60 hover:bg-[#151e30] border border-white/[0.05]' 
                : 'hover:bg-white/[0.03] border border-transparent hover:border-white/5'
        }`}>
            {/* Floating Hover Reaction Dock */}
            <div className="absolute -top-3.5 right-4 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-[#121824] border border-white/[0.12] rounded-lg shadow-xl shadow-black/50 flex items-center p-1 gap-0.5 z-20 pointer-events-none group-hover:pointer-events-auto">
                {quickEmojis.map(emoji => (
                    <button 
                        key={emoji} 
                        className="p-1 hover:bg-white/10 rounded text-xs transition-colors cursor-pointer" 
                        onClick={() => onReact?.(message.id, emoji)}
                        title={`React ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-800 text-sky-300 font-bold flex items-center justify-center text-xs border border-white/10 shrink-0 shadow-sm">
                {(message.username || 'A').charAt(0).toUpperCase()}
            </div>
            
            {/* Body */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-slate-200">
                        {message.username}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                        {formatTime(message.timestamp)}
                    </span>
                    
                    {message.isEncrypted && (
                        <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-mono font-semibold" title="Libsodium E2EE Encrypted">
                            <Shield size={11} />
                            <span>E2EE</span>
                        </span>
                    )}
                    
                    {message.isPrivate && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            DIRECT
                        </span>
                    )}
                </div>

                {/* Text Message Content */}
                {!isFile ? (
                    <div 
                        className="text-xs text-slate-200 leading-relaxed break-words prose prose-invert max-w-none [&_p]:my-0.5 [&_pre]:bg-[#090d14] [&_pre]:border [&_pre]:border-white/10 [&_pre]:p-2 [&_pre]:rounded-lg [&_code]:text-sky-300 [&_code]:font-mono [&_a]:text-sky-400 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                ) : (
                    /* File Attachment Card */
                    <div className="mt-1.5 max-w-md">
                        {/* Media Preview: Image */}
                        {isImage && displayUrl && (
                            <div className="rounded-xl overflow-hidden border border-white/10 mb-2 max-w-sm bg-black/40">
                                <img 
                                    src={displayUrl} 
                                    alt={displayName} 
                                    className="max-h-60 w-auto object-contain hover:scale-[1.01] transition-transform" 
                                    loading="lazy"
                                />
                            </div>
                        )}

                        {/* Media Preview: Video */}
                        {isVideo && displayUrl && (
                            <div className="rounded-xl overflow-hidden border border-white/10 mb-2 max-w-md bg-black">
                                <video src={displayUrl} controls className="w-full max-h-64" />
                            </div>
                        )}

                        {/* Media Preview: Audio */}
                        {isAudio && displayUrl && (
                            <div className="p-2 rounded-xl border border-white/10 mb-2 bg-[#0e131d]">
                                <audio src={displayUrl} controls className="w-full h-8" />
                            </div>
                        )}

                        {/* Media Preview: ZIP */}
                        {isZip && !message.encryptedFile && (
                            <ZipPreview filename={message.filename} />
                        )}

                        {/* File Action Box */}
                        {displayUrl ? (
                            <SpotlightCard className="flex items-center justify-between p-2.5 gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                                        {isImage ? <ImageIcon size={16} /> : isVideo ? <Film size={16} /> : isAudio ? <Music size={16} /> : isZip ? <FileArchive size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        {onDownloadFile ? (
                                            <button 
                                                type="button"
                                                onClick={() => onDownloadFile(message)}
                                                className="text-xs font-semibold text-sky-300 hover:text-sky-200 truncate underline-offset-2 hover:underline text-left cursor-pointer"
                                            >
                                                {displayName}
                                            </button>
                                        ) : (
                                            <a 
                                                href={displayUrl} 
                                                download={displayName} 
                                                className="text-xs font-semibold text-sky-300 hover:text-sky-200 truncate underline-offset-2 hover:underline"
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                            >
                                                {displayName}
                                            </a>
                                        )}
                                        {sizeMB && (
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {sizeMB} MB
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {onDownloadFile ? (
                                    <button
                                        type="button"
                                        onClick={() => onDownloadFile(message)}
                                        className="btn-shimmer p-1.5 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                                        title="Download File with Integrity Verification"
                                    >
                                        <Download size={14} />
                                    </button>
                                ) : (
                                    <a
                                        href={displayUrl}
                                        download={displayName}
                                        className="btn-shimmer p-1.5 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                                        title="Download File"
                                    >
                                        <Download size={14} />
                                    </a>
                                )}
                            </SpotlightCard>
                        ) : (
                            <button 
                                onClick={() => onDecryptFile?.(message)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
                            >
                                <Lock size={14} className="text-amber-400" />
                                <span>Decrypt File: {displayName}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Reactions List */}
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(message.reactions).map(([emoji, users]: [string, any]) => {
                            const hasReacted = users.includes(currentUsername);
                            return (
                                <button
                                    key={emoji}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium transition-all border cursor-pointer ${
                                        hasReacted 
                                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm' 
                                            : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border-white/10 hover:border-white/20'
                                    }`}
                                    onClick={() => onReact?.(message.id, emoji)}
                                    title={`Reacted by: ${users.join(', ')}`}
                                >
                                    <span>{emoji}</span>
                                    <span className="text-[10px] font-bold">{users.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
