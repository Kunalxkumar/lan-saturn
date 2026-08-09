import React from 'react';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';

export default function MessageList({ messages, searchQuery, messagesEndRef, onDecryptFile, onReact, currentUsername }) {
    const filteredMessages = messages.filter(message => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const content = message.content || message.filename || '';
        return content.toLowerCase().includes(searchLower) ||
            (message.username && message.username.toLowerCase().includes(searchLower));
    });

    return (
        <div className="messages-container flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {filteredMessages.map((message) => {
                if (message.type === 'notification') {
                    return <SystemMessage key={message.id} content={message.content} />;
                }
                
                return (
                    <MessageBubble 
                        key={message.id}
                        message={message}
                        onReact={onReact}
                        onDecryptFile={onDecryptFile}
                        currentUsername={currentUsername}
                    />
                );
            })}
            <div ref={messagesEndRef} className="messages-end-anchor" />
        </div>
    );
}
