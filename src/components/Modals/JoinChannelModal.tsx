import React, { useState } from 'react';
import { Lock, Key, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface JoinChannelModalProps {
    joiningChannel: string | null;
    joinPassword: string;
    setJoinPassword: (val: string) => void;
    joinInvite: string;
    setJoinInvite: (val: string) => void;
    setJoiningChannel: (val: string | null) => void;
    setActiveChannel: (val: string) => void;
    handleJoinConfirm: () => void;
}

export default function JoinChannelModal({
    joiningChannel,
    joinPassword,
    setJoinPassword,
    joinInvite,
    setJoinInvite,
    setJoiningChannel,
    setActiveChannel,
    handleJoinConfirm
}: JoinChannelModalProps) {
    if (!joiningChannel) return null;

    const [authMode, setAuthMode] = useState<'password' | 'invite'>('password');

    const handleCancel = () => {
        setJoiningChannel(null);
        setActiveChannel('general');
    };

    return (
        <div className="modal-overlay" onClick={handleCancel}>
            <div 
                className="w-full max-w-sm bg-[#0e1422] border border-white/10 rounded-xl p-5 shadow-2xl shadow-black/70 animate-fadeIn"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                            <Lock size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-100">
                                Protected Room
                            </h2>
                            <p className="text-[11px] font-mono text-sky-400">
                                #{joiningChannel}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleCancel}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    This room requires an access password or a 6-character invite code issued by the channel administrator.
                </p>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-lg mb-4 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setAuthMode('password')}
                        className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                            authMode === 'password'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Room Password
                    </button>
                    <button
                        type="button"
                        onClick={() => setAuthMode('invite')}
                        className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                            authMode === 'invite'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Invite Code
                    </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-3 mb-5">
                    {authMode === 'password' ? (
                        <div>
                            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="password" 
                                    placeholder="Enter room password..." 
                                    value={joinPassword} 
                                    onChange={e => setJoinPassword(e.target.value)} 
                                    className="w-full bg-[#151c2c] border border-white/10 focus:border-sky-500/50 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleJoinConfirm()}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                                6-Digit Invite Code
                            </label>
                            <input 
                                type="text" 
                                placeholder="ABC123" 
                                value={joinInvite} 
                                onChange={e => setJoinInvite(e.target.value.toUpperCase())} 
                                maxLength={6} 
                                className="w-full bg-[#151c2c] border border-white/10 focus:border-sky-500/50 rounded-lg p-2.5 text-center text-sm font-mono tracking-widest text-sky-300 placeholder-slate-500 outline-none uppercase font-bold"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleJoinConfirm()}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                    <button 
                        className="btn-secondary text-xs px-3.5 py-1.5 rounded-lg cursor-pointer" 
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn-shimmer text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold" 
                        onClick={handleJoinConfirm}
                    >
                        <span>Unlock</span>
                        <ArrowRight size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
