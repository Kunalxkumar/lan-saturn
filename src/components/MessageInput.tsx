import React, { useState, useRef, useEffect } from 'react';

// MessageInput component - username aur message input handle karta hai
// Networking Layer 7: User input ko process karna aur message send karna
function MessageInput({ currentUsername, onUsernameChange, onSendMessage, onTyping, onTypingStop, onFileUpload, isUploading, uploadStatus }) {
    const [message, setMessage] = useState('');
    const [username, setUsername] = useState(currentUsername);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px'; // Reset height
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [message]);

    useEffect(() => {
        setUsername(currentUsername);
    }, [currentUsername]);

    // Handle message input change with typing indicator
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

    // Commit username change on blur/Enter
    const commitUsernameChange = () => {
        const cleanName = username.trim() || 'Anonymous';
        setUsername(cleanName);
        if (cleanName !== currentUsername) {
            onUsernameChange(cleanName);
        }
    };

    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
    };

    // Handle key press for sending message
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Handle username key press
    const handleUsernameKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitUsernameChange();
            textareaRef.current?.focus();
        }
    };

    // Send message function
    const handleSendMessage = () => {
        if (message.trim() && username.trim()) {
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

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onFileUpload && !isUploading) {
            onFileUpload(file);
            e.target.value = ''; // Reset input so the same file can be selected again
        }
    };

    return (
        <div className="message-input-container">
            {/* Username input */}
            <input
                type="text"
                className="username-input"
                placeholder="Enter your username"
                value={username}
                onChange={handleUsernameChange}
                onBlur={commitUsernameChange}
                onKeyDown={handleUsernameKeyPress}
            />

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <div className="composer-row">
                {/* Discord-like Input Wrapper */}
                <div className="message-textarea composer-box">
                    {/* Inner Upload button (+) */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title={isUploading ? 'Uploading file' : 'Upload file'}
                        className="upload-button"
                    >
                        {isUploading ? 'UP' : '+'}
                    </button>

                    {/* Message textarea */}
                    <textarea
                        ref={textareaRef}
                        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                        value={message}
                        onChange={handleMessageChange}
                        onKeyDown={handleKeyPress}
                        className="composer-textarea"
                        rows={1}
                    />
                </div>

                {/* Send button */}
                <button
                    className="send-button"
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !username.trim() || isUploading}
                >
                    Send
                </button>
            </div>
            {uploadStatus && (
                <div className={`upload-status ${isUploading ? 'active' : ''}`}>
                    {uploadStatus}
                </div>
            )}
        </div>
    );
}

export default MessageInput;
