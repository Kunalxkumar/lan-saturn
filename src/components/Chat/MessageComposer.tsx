import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Mic, Send } from 'lucide-react';

export default function MessageComposer({ activeChannel, onSendMessage, onTyping, onTypingStop, onFileUpload, isUploading, uploadStatus }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [message]);

    const handleMessageChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        if (value.trim()) {
            onTyping();
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                onTypingStop?.();
            }, 1500);
        } else {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            onTypingStop?.();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = () => {
        if (message.trim()) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            onTypingStop?.();
            onSendMessage(message);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = '24px';
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload && !isUploading) {
            onFileUpload(file);
            e.target.value = ''; 
        }
    };

    return (
        <div className="flex flex-col w-full px-4 pb-4">
            {uploadStatus && (
                <div className={`text-sm mb-2 px-2 ${isUploading ? 'text-saturn-accent animate-pulse' : 'text-gray-400'}`}>
                    {uploadStatus}
                </div>
            )}
            <div className="flex items-end gap-2 bg-saturn-light rounded-2xl p-2 shadow-lg ring-1 ring-white/10">
                <button type="button" className="p-2 text-gray-400 hover:text-gray-100 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 shrink-0">
                    <Smile size={20} />
                </button>
                
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                
                <button 
                    type="button" 
                    className="p-2 text-gray-400 hover:text-gray-100 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 shrink-0" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <Paperclip size={20} />
                </button>
                
                <textarea
                    ref={textareaRef}
                    placeholder={`Message #${activeChannel}`}
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyPress}
                    className="w-full bg-transparent text-gray-100 placeholder-gray-400 resize-none outline-none max-h-32 min-h-[24px] py-1.5 scrollbar-thin overflow-y-auto"
                    rows={1}
                />
                
                <button type="button" className="p-2 text-gray-400 hover:text-gray-100 hover:bg-white/10 rounded-xl transition-colors shrink-0">
                    <Mic size={20} />
                </button>
                
                <button 
                    type="button" 
                    className="p-2 bg-saturn-accent hover:bg-saturn-accentHover text-white rounded-xl transition-colors shrink-0 disabled:opacity-50"
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                >
                    <Send size={20} className={message.trim() ? "translate-x-0.5" : ""} />
                </button>
            </div>
        </div>
    );
}
