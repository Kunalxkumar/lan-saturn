import React from 'react';

/**
 * AnnouncementBanner — displays broadcast announcements as dismissable banners.
 */
export default function AnnouncementBanner({ announcements, onDismiss }) {
    if (!announcements || announcements.length === 0) return null;

    return (
        <div className="announcement-banner-container">
            {announcements.map((announcement) => (
                <div key={announcement.id} className="announcement-banner">
                    <div className="announcement-content">
                        <span className="announcement-icon">📢</span>
                        <span className="announcement-user">{announcement.username}</span>
                        <span className="announcement-text">{announcement.text}</span>
                    </div>
                    <button
                        className="announcement-dismiss"
                        onClick={() => onDismiss(announcement.id)}
                        title="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
