import React from 'react';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import { MessageSquareDashed } from 'lucide-react';

interface MessageListProps {
    messages: any[];
    searchQuery: string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onDecryptFile?: (msg: any) => void;
    onDownloadFile?: (msg: any) => void;
    onReact?: (id: any, emoji: string) => void;
    currentUsername: string;
}

export default function MessageList({ 
    messages, 
    searchQuery, 
    messagesEndRef, 
    onDecryptFile, 
    onDownloadFile,
    onReact, 
    currentUsername 
}: MessageListProps) {
    const filteredMessages = messages.filter(message => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const content = message.content || message.filename || '';
        return content.toLowerCase().includes(searchLower) ||
            (message.username && message.username.toLowerCase().includes(searchLower));
    });

    return (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 custom-scrollbar">
            {filteredMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-600 mb-3">
                        <MessageSquareDashed size={24} />
                    </div>
                    <p className="text-sm font-medium text-slate-400">
                        {searchQuery ? 'No matching messages found.' : 'No messages in this stream yet.'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                        {searchQuery ? 'Try adjusting your search terms.' : 'Send a message or drop a file to start peer collaboration.'}
                    </p>
                </div>
            ) : (
                filteredMessages.map((message) => {
                    if (message.type === 'notification') {
                        return <SystemMessage key={message.id} content={message.content} />;
                    }
                    
                    return (
                        <MessageBubble 
                            key={message.id}
                            message={message}
                            onReact={onReact}
                            onDecryptFile={onDecryptFile}
                            onDownloadFile={onDownloadFile}
                            currentUsername={currentUsername}
                        />
                    );
                })
            )}
            <div ref={messagesEndRef} className="h-2 shrink-0" />
        </div>
    );
}
