import React from 'react';
import { Hash } from 'lucide-react';

const CHANNELS = ['general', 'random', 'study', 'files'];

export default function ChannelList({ activeChannel, setActiveChannel, activeView, setActiveView }) {
    const handleChannelClick = (channel) => {
        setActiveChannel(channel);
        setActiveView('server');
    };

    return (
        <div className="sidebar-section px-4 py-3 flex flex-col gap-2">
            <h3 className="sidebar-section-label text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Channels</h3>
            <div className="channel-list flex flex-col gap-1">
                {CHANNELS.map((channel) => {
                    const isActive = activeChannel === channel && activeView === 'server';
                    return (
                        <button
                            key={channel}
                            className={`channel-row flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                                isActive 
                                    ? 'active bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-semibold' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                            onClick={() => handleChannelClick(channel)}
                        >
                            <Hash size={16} className="channel-icon flex-shrink-0 text-gray-400" />
                            <span className="channel-name flex-1 truncate">{channel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
