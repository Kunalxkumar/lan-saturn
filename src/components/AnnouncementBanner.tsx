import React from 'react';
import { Megaphone, X } from 'lucide-react';

interface Announcement {
    id: string | number;
    username: string;
    text: string;
}

interface AnnouncementBannerProps {
    announcements: Announcement[];
    onDismiss: (id: string | number) => void;
}

export default function AnnouncementBanner({ announcements, onDismiss }: AnnouncementBannerProps) {
    if (!announcements || announcements.length === 0) return null;

    return (
        <div className="flex flex-col gap-1.5 px-4 pt-2 shrink-0 z-10">
            {announcements.map((announcement) => (
                <div 
                    key={announcement.id} 
                    className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs shadow-md shadow-amber-500/5 animate-fadeIn"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1 rounded-md bg-amber-500/20 text-amber-300 shrink-0">
                            <Megaphone size={14} />
                        </div>
                        <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-amber-300 font-mono text-[11px] truncate">
                                @{announcement.username}:
                            </span>
                            <span className="truncate text-amber-100">
                                {announcement.text}
                            </span>
                        </div>
                    </div>
                    <button
                        className="p-1 rounded-md text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
                        onClick={() => onDismiss(announcement.id)}
                        title="Dismiss announcement"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
