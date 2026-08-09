import React from 'react';
import { Shield, Hash, Pin } from 'lucide-react';

export default function ChatHeader({ 
    activeView, 
    activeChannel, 
    title, 
    searchQuery, 
    setSearchQuery, 
    isEncrypted, 
    cryptoReady,
    users = []
}) {
    if (activeView !== 'server' && activeView !== 'dm') {
        return null;
    }

    const visibleUsers = Array.isArray(users) ? users.slice(0, 3) : [];
    const overflowCount = Array.isArray(users) && users.length > 3 ? users.length - 3 : 0;

    return (
        <header className="h-12 border-b border-[#30363d] flex items-center px-4 bg-[#10141a] shrink-0">
            <Hash size={18} className="text-gray-400 mr-2 shrink-0" />
            <h1 className="text-sm font-bold text-[#dfe2eb] capitalize">{activeChannel}</h1>
            <div className="w-px h-4 bg-[#30363d] mx-3"></div>
            <p className="text-xs text-gray-400 truncate hidden sm:block">{title || 'Company-wide discussions and announcements'}</p>

            <div className="ml-auto flex items-center gap-3">
                {isEncrypted && (
                    <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${cryptoReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`} title={cryptoReady ? "E2EE Active" : "E2EE Initializing"}>
                        <Shield size={12} />
                        <span>E2EE</span>
                    </div>
                )}
                
                {visibleUsers.length > 0 && (
                    <div className="flex -space-x-1.5 mr-1 hidden sm:flex items-center" title={`Online: ${visibleUsers.map(u => (typeof u === 'object' ? u.username : u)).join(', ')}`}>
                        {visibleUsers.map((u, i) => {
                            const name = typeof u === 'object' ? u.username || 'Anonymous' : u;
                            const initial = name.charAt(0).toUpperCase();
                            const bgColors = ['bg-indigo-600', 'bg-purple-600', 'bg-emerald-600', 'bg-amber-600'];
                            const bg = bgColors[i % bgColors.length];
                            return (
                                <div 
                                    key={i} 
                                    className={`w-6 h-6 rounded-full border-2 border-[#10141a] ${bg} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}
                                >
                                    {initial}
                                </div>
                            );
                        })}
                        {overflowCount > 0 && (
                            <div className="w-6 h-6 rounded-full border-2 border-[#10141a] bg-[#262a31] text-gray-300 flex items-center justify-center text-[9px] font-mono font-bold">
                                +{overflowCount}
                            </div>
                        )}
                    </div>
                )}

                <button className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-[#181c22]" title="Pin Message">
                    <Pin size={16} />
                </button>
            </div>
        </header>
    );
}
