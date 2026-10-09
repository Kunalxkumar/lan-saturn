import React from 'react';
import { Shield, Hash, Users, Lock, Unlock, Pin, Sidebar as SidebarIcon } from 'lucide-react';
import { useUIStore } from '../../store/appStore';

interface ChatHeaderProps {
    activeView: string;
    activeChannel: string;
    title: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isEncrypted: boolean;
    cryptoReady: boolean;
    users?: any[];
}

export default function ChatHeader({ 
    activeView, 
    activeChannel, 
    title, 
    isEncrypted, 
    cryptoReady,
    users = []
}: ChatHeaderProps) {
    const { isRightPanelOpen, setIsRightPanelOpen } = useUIStore();

    if (activeView !== 'server' && activeView !== 'dm') {
        return null;
    }

    const isDm = activeView === 'dm';
    const visibleUsers = Array.isArray(users) ? users.slice(0, 4) : [];
    const overflowCount = Array.isArray(users) && users.length > 4 ? users.length - 4 : 0;

    return (
        <header className="h-13 border-b border-white/[0.07] flex items-center justify-between px-4 bg-[#0a0d14]/70 backdrop-blur-md shrink-0 z-10 select-none">
            {/* Left: Channel / DM Title & Topic */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sky-400 shrink-0">
                    {isDm ? (
                        <span className="text-xs font-bold text-sky-400">@</span>
                    ) : (
                        <Hash size={15} />
                    )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-sm font-bold text-slate-100 capitalize truncate tracking-tight">
                        {isDm ? (title.replace('@', '') || 'Direct Messages') : activeChannel}
                    </h1>

                    <div className="h-3.5 w-px bg-white/10 hidden sm:block shrink-0" />

                    <p className="text-xs text-slate-400 truncate hidden md:block max-w-md font-normal">
                        {isDm ? 'End-to-end direct peer dialogue' : (title.replace('#', '') || 'Channel mesh stream')}
                    </p>
                </div>
            </div>

            {/* Right: Badges, Users Pile & Toggles */}
            <div className="flex items-center gap-3 shrink-0">
                {/* E2EE Cryptographic Pill */}
                <div 
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all ${
                        isEncrypted && cryptoReady
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-white/[0.04] text-slate-400 border-white/5'
                    }`}
                    title={isEncrypted ? "Libsodium XSalsa20-Poly1305 Stream Active" : "Unencrypted Plaintext LAN"}
                >
                    <Shield size={12} className={isEncrypted ? 'text-emerald-400' : 'text-slate-400'} />
                    <span className="font-semibold">{isEncrypted ? 'E2EE ACTIVE' : 'OPEN LAN'}</span>
                </div>

                {/* Avatar Stack */}
                {visibleUsers.length > 0 && (
                    <div 
                        className="hidden lg:flex items-center -space-x-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                        title={`Active: ${visibleUsers.map(u => (typeof u === 'object' ? u.username : u)).join(', ')}`}
                    >
                        {visibleUsers.map((u, i) => {
                            const name = typeof u === 'object' ? u.username || 'Anonymous' : u;
                            const initial = (name || 'U').charAt(0).toUpperCase();
                            const palette = [
                                'bg-sky-600',
                                'bg-amber-600',
                                'bg-teal-600',
                                'bg-slate-700'
                            ];
                            const bg = palette[i % palette.length];
                            return (
                                <div 
                                    key={i} 
                                    className={`w-6 h-6 rounded-full ring-2 ring-[#0a0d14] ${bg} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}
                                >
                                    {initial}
                                </div>
                            );
                        })}
                        {overflowCount > 0 && (
                            <div className="w-6 h-6 rounded-full ring-2 ring-[#0a0d14] bg-[#1a2336] text-slate-300 flex items-center justify-center text-[9px] font-mono font-bold">
                                +{overflowCount}
                            </div>
                        )}
                    </div>
                )}

                {/* Toggle Right Panel Button */}
                <button 
                    onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isRightPanelOpen
                            ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                    }`}
                    title={isRightPanelOpen ? "Hide Members & Tasks" : "Show Members & Tasks"}
                >
                    <Users size={16} />
                </button>
            </div>
        </header>
    );
}
