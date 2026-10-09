import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Smile, Sparkles, FileUp, Loader2 } from 'lucide-react';

interface MessageComposerProps {
    activeChannel: string;
    onSendMessage: (msg: string) => void;
    onTyping: () => void;
    onTypingStop?: () => void;
    onFileUpload?: (file: File) => void;
    isUploading: boolean;
    uploadStatus: string;
}

export default function MessageComposer({ 
    activeChannel, 
    onSendMessage, 
    onTyping, 
    onTypingStop, 
    onFileUpload, 
    isUploading, 
    uploadStatus 
}: MessageComposerProps) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [message]);

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setMessage(value);

        if (value.trim()) {
            onTyping();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                onTypingStop?.();
            }, 1500);
        } else {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTypingStop?.();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = () => {
        if (message.trim()) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTypingStop?.();
            onSendMessage(message);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = '24px';
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onFileUpload && !isUploading) {
            onFileUpload(file);
            e.target.value = ''; 
        }
    };

    return (
        <div className="flex flex-col w-full px-4 pb-3">
            {/* Upload Status Banner */}
            {uploadStatus && (
                <div className={`mb-2 px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                    isUploading 
                        ? 'bg-sky-500/10 text-sky-300 border-sky-500/25' 
                        : 'bg-white/[0.04] text-slate-300 border-white/10'
                }`}>
                    {isUploading && <Loader2 size={13} className="animate-spin text-sky-400 shrink-0" />}
                    <span className="truncate">{uploadStatus}</span>
                </div>
            )}

            {/* Input Container */}
            <div className="bg-[#101522]/90 backdrop-blur-md border border-white/[0.08] focus-within:border-sky-500/50 rounded-xl p-2 flex flex-col transition-all shadow-xl shadow-black/20">
                <textarea
                    ref={textareaRef}
                    placeholder={`Message #${activeChannel || 'stream'}... (Markdown supported)`}
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyPress}
                    rows={1}
                    className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 border-none resize-none px-2 py-1 max-h-[140px] min-h-[28px] outline-none leading-relaxed font-sans"
                />

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] mt-1">
                    {/* Left Attachment Controls */}
                    <div className="flex items-center gap-1">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/[0.06] transition-all flex items-center gap-1 text-xs cursor-pointer disabled:opacity-40"
                            title="Attach File (LAN P2P)"
                        >
                            <Paperclip size={15} />
                            <span className="text-[11px] font-medium hidden sm:inline">Attach</span>
                        </button>
                    </div>

                    {/* Right Info & Send */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                            Enter to send
                        </span>

                        <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={!message.trim() || isUploading}
                            className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                message.trim() && !isUploading
                                    ? 'btn-shimmer text-white'
                                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed border border-white/5'
                            }`}
                            title="Send Message"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
