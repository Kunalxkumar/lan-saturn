import React, { useState, useRef, useEffect } from 'react';

// MessageInput component - username aur message input handle karta hai
// Networking Layer 7: User input ko process karna aur message send karna
function MessageInput({ currentUsername, onUsernameChange, onSendMessage, onTyping }) {
    const [message, setMessage] = useState('');
    const [username, setUsername] = useState(currentUsername);
    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '40px'; // Reset height
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [message]);

    // Handle message input change with typing indicator
    const handleMessageChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        // Typing indicator logic
        if (value.trim()) {
            onTyping();
            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            // Set new timeout to stop typing indicator
            typingTimeoutRef.current = setTimeout(() => {
                // Typing stop logic will be handled in parent component
            }, 1000);
        }
    };

    // Handle username change
    const handleUsernameChange = (e) => {
        const value = e.target.value;
        setUsername(value);
        onUsernameChange(value);
    };

    // Handle key press for sending message
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
        // Shift+Enter allows new line
    };

    // Handle username key press
    const handleUsernameKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textareaRef.current?.focus();
        }
    };

    // Send message function
    const handleSendMessage = () => {
        if (message.trim() && username.trim()) {
            onSendMessage(message);
            setMessage('');
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = '40px';
            }
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
                onKeyPress={handleUsernameKeyPress}
            />

            {/* Message textarea */}
            <textarea
                ref={textareaRef}
                className="message-textarea"
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyPress}
            />

            {/* Send button */}
            <button
                className="send-button"
                onClick={handleSendMessage}
                disabled={!message.trim() || !username.trim()}
            >
                Send Message
            </button>
        </div>
    );
}

export default MessageInput;