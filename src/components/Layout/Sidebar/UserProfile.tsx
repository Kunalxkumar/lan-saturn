import React from 'react';
import { Settings } from 'lucide-react';

export default function UserProfile({ currentUsername, setCurrentUsername }) {
    return (
        <div className="user-profile-card">
            <div className="user-avatar-wrapper">
                <div className="user-avatar">{currentUsername.charAt(0).toUpperCase()}</div>
                <div className="status-badge online"></div>
            </div>
            <div className="user-info">
                <input
                    className="username-edit-input"
                    value={currentUsername}
                    onChange={(e) => setCurrentUsername(e.target.value || 'Anonymous')}
                    title="Edit username"
                />
                <span className="user-status-text">Online</span>
            </div>
            <button className="user-settings-btn" title="User Settings">
                <Settings size={18} />
            </button>
        </div>
    );
}
