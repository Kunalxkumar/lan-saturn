import React from 'react';
import ChannelList from './ChannelList';
import ToolList from './ToolList';
import UserProfile from './UserProfile';
import { Plus, Server } from 'lucide-react';

interface SidebarProps {
    activeChannel: string;
    setActiveChannel: (channel: string) => void;
    activeView: string;
    setActiveView: (view: string) => void;
    connectionStatus: string;
    currentUsername: string;
    setCurrentUsername: (name: string) => void;
}

export default function Sidebar({
    activeChannel,
    setActiveChannel,
    activeView,
    setActiveView,
    connectionStatus,
    currentUsername,
    setCurrentUsername
}: SidebarProps) {
    return (
        <aside className="w-56 h-full bg-[#0b0e15] border-r border-white/[0.07] shrink-0 flex flex-col p-2.5 z-20 select-none">
            {/* Header info */}
            <div className="flex items-center justify-between px-2 py-2 mb-1 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                    <Server size={14} className="text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Local Mesh
                    </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/5">
                    LAN
                </span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 custom-scrollbar">
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

            {/* Bottom: Quick Channel Action & User Profile */}
            <div className="mt-auto pt-2 border-t border-white/[0.07] space-y-2">
                <UserProfile 
                    currentUsername={currentUsername}
                    setCurrentUsername={setCurrentUsername}
                />
            </div>
        </aside>
    );
}
