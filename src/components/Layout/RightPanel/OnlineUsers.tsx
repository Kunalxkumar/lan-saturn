import React from 'react';

export default function OnlineUsers({ users, currentUsername }) {
    return (
        <div className="right-sidebar-section">
            <h3 className="section-title">Online — {users.length}</h3>
            <div className="online-users-list">
                {users.length === 0 ? (
                    <div className="empty-state">No users online</div>
                ) : (
                    users.map((user, idx) => (
                        <div key={`${user}_${idx}`} className="user-row">
                            <div className="user-avatar-wrapper small">
                                <div className="user-avatar">{user.charAt(0).toUpperCase()}</div>
                                <div className="status-badge online"></div>
                            </div>
                            <div className="user-name-container">
                                <span className="user-name">{user}</span>
                                {user === currentUsername && <span className="you-badge">You</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
