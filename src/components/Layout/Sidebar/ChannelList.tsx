import React from 'react';
import { Hash, GraduationCap, FolderArchive, MessageSquareCode, ShieldCheck } from 'lucide-react';

interface ChannelListProps {
    activeChannel: string;
    setActiveChannel: (channel: string) => void;
    activeView: string;
    setActiveView: (view: string) => void;
}

const CHANNELS = [
    { name: 'general', icon: Hash, desc: 'Public discussions' },
    { name: 'random', icon: MessageSquareCode, desc: 'Casual chat & links' },
    { name: 'study', icon: GraduationCap, desc: 'Notes & research' },
    { name: 'files', icon: FolderArchive, desc: 'Shared payloads' }
];

export default function ChannelList({ 
    activeChannel, 
    setActiveChannel, 
    activeView, 
    setActiveView 
}: ChannelListProps) {
    const handleChannelClick = (channel: string) => {
        setActiveChannel(channel);
        setActiveView('server');
    };

    return (
        <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-2">
                <span>Rooms</span>
                <span className="text-[10px] text-slate-400 font-mono">4</span>
            </div>
            
            <div className="space-y-0.5">
                {CHANNELS.map(({ name, icon: Icon, desc }) => {
                    const isActive = activeChannel === name && activeView === 'server';
                    return (
                        <button
                            key={name}
                            className={`flex items-center gap-2.5 w-full rounded-lg px-2.5 py-1.5 text-xs transition-all text-left group relative cursor-pointer ${
                                isActive 
                                    ? 'bg-sky-500/15 text-sky-300 font-medium border border-sky-500/25 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                            }`}
                            onClick={() => handleChannelClick(name)}
                            title={desc}
                        >
                            {isActive && (
                                <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-sky-400 rounded-r-full shadow-sm shadow-sky-400/50" />
                            )}
                            <Icon 
                                size={14} 
                                className={`shrink-0 transition-transform group-hover:scale-110 ${
                                    isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'
                                }`} 
                            />
                            <span className="truncate capitalize tracking-tight font-medium">
                                {name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
