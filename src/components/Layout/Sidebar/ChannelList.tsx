import React from 'react';
import { Hash, GraduationCap, Folder, MessageSquare } from 'lucide-react';

const CHANNELS = [
    { name: 'general', Icon: Hash },
    { name: 'random', Icon: MessageSquare },
    { name: 'study', Icon: GraduationCap },
    { name: 'files', Icon: Folder }
];

export default function ChannelList({ activeChannel, setActiveChannel, activeView, setActiveView }) {
    const handleChannelClick = (channel) => {
        setActiveChannel(channel);
        setActiveView('server');
    };

    return (
        <div className="mb-3">
            <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-2">Channels</div>
            <div className="space-y-0.5">
                {CHANNELS.map(({ name, Icon }) => {
                    const isActive = activeChannel === name && activeView === 'server';
                    return (
                        <button
                            key={name}
                            className={`flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs transition-all text-left ${
                                isActive 
                                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                            onClick={() => handleChannelClick(name)}
                        >
                            <Icon size={15} className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                            <span className="truncate capitalize">{name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
