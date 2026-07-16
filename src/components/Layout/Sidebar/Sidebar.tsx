import React from 'react';
import WorkspaceHeader from './WorkspaceHeader';
import ChannelList from './ChannelList';
import ToolList from './ToolList';
import UserProfile from './UserProfile';

export default function Sidebar({
    activeChannel,
    setActiveChannel,
    activeView,
    setActiveView,
    connectionStatus,
    currentUsername,
    setCurrentUsername
}) {
    return (
        <aside className="w-64 bg-saturn-dark flex-none flex flex-col border-r border-saturn-light text-gray-300 relative z-20">
            <WorkspaceHeader connectionStatus={connectionStatus} />
            
            <div className="h-px bg-saturn-light my-2 mx-4 opacity-50" />
            
            <ChannelList 
                activeChannel={activeChannel}
                setActiveChannel={setActiveChannel}
                activeView={activeView}
                setActiveView={setActiveView}
            />

            <div className="h-px bg-saturn-light my-2 mx-4 opacity-50" />

            <ToolList 
                activeView={activeView}
                setActiveView={setActiveView}
            />

            <div className="flex-1" />
            
            <div className="h-px bg-saturn-light my-2 mx-4 opacity-50" />
            
            <UserProfile 
                currentUsername={currentUsername}
                setCurrentUsername={setCurrentUsername}
            />
        </aside>
    );
}
