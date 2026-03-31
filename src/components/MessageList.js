import React from 'react';

// MessageList component - sabhi messages ko display karta hai
// Networking Layer 7: Messages ko render karna aur search functionality
function MessageList({ messages, searchQuery, messagesEndRef }) {
    // Format timestamp function
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Format message with markdown-like syntax
    const formatMessage = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
            .replace(/\*(.*?)\*/g, '<em>$1</em>')            // *italic*
            .replace(/`(.*?)`/g, '<code>$1</code>')          // `code`
            .replace(/\n/g, '<br>');                         // newlines
    };

    // Filter messages based on search query
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
                    return (
                        <div key={message.id} className="message file-message">
                            <span className="username">{message.username}:</span>
                            <br />
                            <a
                                href={message.data}
                                download={message.filename}
                                className="file-link"
                            >
                                {message.filename}
                            </a>
                            <span className="timestamp">{formatTime(message.timestamp)}</span>
                        </div>
                    );
                }

                return (
                    <div
                        key={message.id}
                        className={`message ${message.isOwn ? 'own' : ''} ${message.isPrivate ? 'private' : ''}`}
                    >
                        <span className="username">{message.username}:</span>
                        <span
                            className="message-text"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                        />
                        {message.isPrivate && <span className="private-msg">PRIVATE</span>}
                        <span className="timestamp">{formatTime(message.timestamp)}</span>

                        {/* Reaction buttons - yahan hum emoji reactions add kar sakte hain */}
                        <div className="reactions">
                            {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                                <button
                                    key={emoji}
                                    className="reaction-btn"
                                    onClick={() => {
                                        // Reaction functionality yahan add kar sakte hain
                                        console.log(`Reacted with ${emoji} to message ${message.id}`);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageList;