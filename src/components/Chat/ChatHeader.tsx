import React from 'react';
import { Shield, Hash, Pin } from 'lucide-react';

export default function ChatHeader({ 
    activeView, 
    activeChannel, 
    title, 
    searchQuery, 
    setSearchQuery, 
    isEncrypted, 
    cryptoReady 
}) {
    if (activeView !== 'server' && activeView !== 'dm') {
        return null;
    }

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
                
                <div className="flex -space-x-1.5 mr-1 hidden lg:flex items-center">
                    <div className="w-5 h-5 rounded-full border border-[#0D1117] bg-[#5865f2] text-white flex items-center justify-center text-[9px] font-bold z-30">A</div>
                    <div className="w-5 h-5 rounded-full border border-[#0D1117] bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold z-20">B</div>
                    <div className="w-5 h-5 rounded-full border border-[#0D1117] bg-[#262a31] flex items-center justify-center text-[9px] font-mono z-0 text-gray-400">+12</div>
                </div>

                <button className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-[#181c22]" title="Pin Message">
                    <Pin size={16} />
                </button>
            </div>
        </header>
    );
}
