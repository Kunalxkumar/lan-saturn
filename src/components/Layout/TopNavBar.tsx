import React from 'react';
import { Search, History, Bell, Shield, Radio, Terminal, Sparkles } from 'lucide-react';
import { useUIStore } from '../../store/appStore';

interface TopNavBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    currentUsername: string;
    connectionStatus: string;
}

export default function TopNavBar({ 
    searchQuery, 
    setSearchQuery, 
    currentUsername,
    connectionStatus
}: TopNavBarProps) {
    const { setShowTransferHistory, setShowSearchModal } = useUIStore();
    const isConnected = connectionStatus === 'connected';

    return (
        <header className="flex justify-between items-center px-4 w-full h-13 bg-[#0a0d14]/90 backdrop-blur-md border-b border-white/[0.07] shrink-0 z-30 select-none">
            {/* Left Brand & Connection */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 shadow-sm flex items-center justify-center">
                        <span className="text-xs font-black tracking-widest text-sky-400">
                            LS
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-100 tracking-tight leading-none group-hover:text-sky-300 transition-colors">
                            LAN Saturn
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                            v1.2.1 • Local Peer
                        </span>
                    </div>
                </div>

                <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

                {/* Connection Status Badge */}
                <div 
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium border transition-colors ${
                        isConnected 
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                    }`}
                    title={isConnected ? 'Connected to local LAN socket' : 'Socket disconnected'}
                >
                    <span className="relative flex h-2 w-2">
                        {isConnected && (
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    </span>
                    <span>{isConnected ? 'LIVE LAN' : 'OFFLINE'}</span>
                </div>
            </div>

            {/* Middle: Command Palette / Smart Search Trigger */}
            <div className="flex-1 max-w-md mx-4 hidden md:block">
                <button 
                    onClick={() => setShowSearchModal(true)}
                    className="w-full flex items-center justify-between bg-[#101522]/80 hover:bg-[#141b2c] border border-white/[0.08] hover:border-sky-500/40 rounded-lg py-1.5 px-3 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-inner group cursor-pointer"
                >
                    <div className="flex items-center gap-2 truncate">
                        <Search size={14} className="text-slate-400 group-hover:text-sky-400 transition-colors shrink-0" />
                        <span className="truncate">{searchQuery || 'Search channels, files, members...'}</span>
                    </div>
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">
                        <span className="text-[9px]">Ctrl</span> K
                    </kbd>
                </button>
            </div>

            {/* Right: Actions & User Info */}
            <div className="flex items-center gap-1.5">
                {/* Mobile Search button */}
                <button
                    onClick={() => setShowSearchModal(true)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
                    title="Search"
                >
                    <Search size={16} />
                </button>

                {/* Transfer History Trigger */}
                <button 
                    onClick={() => setShowTransferHistory(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-sky-300 hover:bg-white/[0.06] px-2.5 py-1.5 rounded-lg border border-transparent hover:border-white/10 transition-all cursor-pointer"
                    title="View File Transfers"
                >
                    <History size={15} className="text-sky-400" />
                    <span className="hidden sm:inline font-medium">Transfers</span>
                </button>

                {/* User Pill */}
                <div className="flex items-center gap-2 pl-2 ml-1 border-l border-white/10">
                    <div className="relative">
                        <div className="w-7 h-7 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                            {currentUsername ? currentUsername.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0a0d14]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 hidden lg:inline max-w-[100px] truncate">
                        {currentUsername}
                    </span>
                </div>
            </div>
        </header>
    );
}
