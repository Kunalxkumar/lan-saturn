import React, { useState } from 'react';
import { UserCheck, Edit2, Shield } from 'lucide-react';

interface UserProfileProps {
    currentUsername: string;
    setCurrentUsername: (username: string) => void;
}

export default function UserProfile({ currentUsername, setCurrentUsername }: UserProfileProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(currentUsername);

    const handleSave = () => {
        setIsEditing(false);
        const trimmed = tempName.trim();
        if (trimmed) {
            setCurrentUsername(trimmed);
        } else {
            setTempName(currentUsername);
        }
    };

    return (
        <div className="p-2.5 rounded-xl bg-[#101520]/80 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center gap-2.5 shadow-sm group">
            {/* Avatar with pulse ring */}
            <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold flex items-center justify-center text-xs shadow-sm">
                    {currentUsername ? currentUsername.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#101520]" />
            </div>

            {/* Info or Edit Form */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') {
                                setTempName(currentUsername);
                                setIsEditing(false);
                            }
                        }}
                        autoFocus
                        className="w-full bg-[#171f2e] border border-sky-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none font-medium"
                    />
                ) : (
                    <div 
                        onClick={() => { setTempName(currentUsername); setIsEditing(true); }}
                        className="cursor-pointer group/name"
                        title="Click to rename"
                    >
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-slate-200 truncate group-hover/name:text-sky-300 transition-colors">
                                {currentUsername}
                            </span>
                            <Edit2 size={10} className="text-slate-400 group-hover/name:text-sky-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span className="text-emerald-400 font-medium">Online</span>
                            <span>•</span>
                            <span className="text-slate-400">LAN Host</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
