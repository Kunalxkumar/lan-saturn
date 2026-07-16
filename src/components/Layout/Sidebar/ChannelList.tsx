import React from 'react';
import { Hash } from 'lucide-react';

const CHANNELS = ['general', 'random', 'study', 'files'];

export default function ChannelList({ activeChannel, setActiveChannel, activeView, setActiveView }) {
    const handleChannelClick = (channel) => {
        setActiveChannel(channel);
        setActiveView('server');
    };

    return (
        <div className="sidebar-section">
            <h3 className="sidebar-section-label">Channels</h3>
            <div className="channel-list">
                {CHANNELS.map((channel) => {
                    const isActive = activeChannel === channel && activeView === 'server';
                    return (
                        <button
                            key={channel}
                            className={`channel-row ${isActive ? 'active' : ''}`}
                            onClick={() => handleChannelClick(channel)}
                        >
                            <Hash size={16} className="channel-icon" />
                            <span className="channel-name">{channel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
