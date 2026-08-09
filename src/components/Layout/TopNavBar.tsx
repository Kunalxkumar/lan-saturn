import React from 'react';
import { Search, History, Bell, HelpCircle } from 'lucide-react';

export default function TopNavBar({ 
    searchQuery, 
    setSearchQuery, 
    currentUsername,
    connectionStatus
}) {
    return (
        <nav className="flex justify-between items-center px-4 w-full h-14 bg-[#10141a] border-b border-[#30363d] shrink-0 z-20 relative">
            <div className="flex items-center gap-3">
                <span className="text-lg font-black text-[#dfe2eb] tracking-tight">LAN Saturn</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 ${connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
                </span>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-sm mx-6">
                <div className="relative w-full group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        className="w-full bg-[#181c22] border border-[#30363d] rounded-md py-1.5 pl-9 pr-3 text-xs text-[#dfe2eb] placeholder:text-gray-400 focus:outline-none focus:border-[#5865f2] focus:ring-1 focus:ring-[#5865f2] transition-all" 
                        placeholder="Search across channels..." 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <button className="text-gray-400 hover:text-gray-200 hover:bg-[#181c22] transition-colors p-1.5 rounded-full flex items-center justify-center" title="History">
                    <History size={17} />
                </button>
                <button className="text-gray-400 hover:text-gray-200 hover:bg-[#181c22] transition-colors p-1.5 rounded-full flex items-center justify-center relative" title="Notifications">
                    <Bell size={17} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                </button>
                <button className="text-gray-400 hover:text-gray-200 hover:bg-[#181c22] transition-colors p-1.5 rounded-full flex items-center justify-center hidden sm:flex" title="Help">
                    <HelpCircle size={17} />
                </button>
                <div className="h-5 w-px bg-[#30363d] mx-1 hidden sm:block"></div>
                <div className="ml-1 w-7 h-7 rounded-full border border-[#30363d] bg-[#5865f2]/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                    {currentUsername ? currentUsername.charAt(0).toUpperCase() : 'A'}
                </div>
            </div>
        </nav>
    );
}
