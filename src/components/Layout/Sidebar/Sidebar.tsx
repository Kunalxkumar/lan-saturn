import React from 'react';
import ChannelList from './ChannelList';
import ToolList from './ToolList';
import UserProfile from './UserProfile';
import { Plus } from 'lucide-react';

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
        <aside className="w-48 h-full bg-[#1c2026] border-r border-[#30363d] shrink-0 flex flex-col p-3 z-20">
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-1">
                <ChannelList 
                    activeChannel={activeChannel}
                    setActiveChannel={setActiveChannel}
                    activeView={activeView}
                    setActiveView={setActiveView}
                />

                <ToolList 
                    activeView={activeView}
                    setActiveView={setActiveView}
                />
            </div>

            <div className="mt-auto pt-3 border-t border-[#30363d] space-y-1">
                <button 
                    className="w-full flex items-center justify-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white py-1.5 rounded-md font-semibold text-xs transition-colors mb-2 shadow-sm cursor-pointer"
                    onClick={() => setActiveView('server')}
                >
                    <Plus size={15} />
                    <span>New Channel</span>
                </button>
                <UserProfile 
                    currentUsername={currentUsername}
                    setCurrentUsername={setCurrentUsername}
                />
            </div>
        </aside>
    );
}
