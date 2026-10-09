import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Hash, User, FileText, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { useUIStore } from '../store/appStore';

function parseSearchQuery(raw: string) {
    const filters = { 
        from: null as string | null, 
        channel: null as string | null, 
        hasFile: false, 
        hasImage: false, 
        typeDm: false, 
        before: null as string | null, 
        after: null as string | null, 
        text: '' 
    };
    const parts = [];

    const tokenRegex = /(from|in|has|type|before|after):(\S+)/gi;
    let match;
    let lastIndex = 0;

    while ((match = tokenRegex.exec(raw)) !== null) {
        if (match.index > lastIndex) {
            parts.push(raw.slice(lastIndex, match.index));
        }
        lastIndex = tokenRegex.lastIndex;

        const key = match[1].toLowerCase();
        const val = match[2].replace(/^#/, '');

        switch (key) {
            case 'from': filters.from = val.toLowerCase(); break;
            case 'in': filters.channel = val.toLowerCase(); break;
            case 'has':
                if (val === 'file') filters.hasFile = true;
                if (val === 'image') filters.hasImage = true;
                break;
            case 'type':
                if (val === 'dm' || val === 'private') filters.typeDm = true;
                break;
            case 'before': filters.before = val; break;
            case 'after': filters.after = val; break;
        }
    }

    if (lastIndex < raw.length) {
        parts.push(raw.slice(lastIndex));
    }

    filters.text = parts.join(' ').trim().toLowerCase();
    return filters;
}

function matchMessage(msg: any, filters: any) {
    if (filters.from && (msg.username || '').toLowerCase() !== filters.from) return false;
    if (filters.channel && (msg.channel || '').toLowerCase() !== filters.channel) return false;
    if (filters.hasFile && msg.type !== 'file') return false;
    if (filters.hasImage) {
        const name = (msg.filename || '').toLowerCase();
        if (!name.match(/\.(png|jpg|jpeg|gif|webp)$/)) return false;
    }
    if (filters.typeDm && msg.type !== 'private') return false;

    if (filters.before) {
        const msgDate = new Date(msg.timestamp || 0);
        if (msgDate > new Date(filters.before)) return false;
    }
    if (filters.after) {
        const msgDate = new Date(msg.timestamp || 0);
        if (msgDate < new Date(filters.after)) return false;
    }

    if (filters.text) {
        const contentMatch = (msg.content || '').toLowerCase().includes(filters.text);
        const fileMatch = (msg.filename || '').toLowerCase().includes(filters.text);
        if (!contentMatch && !fileMatch) return false;
    }

    return true;
}

function formatTime(timestamp: any) {
    if (!timestamp) return '';
    try {
        const d = new Date(timestamp);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

interface SmartSearchModalProps {
    messages: any[];
    onSelectMessage?: (msg: any) => void;
}

export default function SmartSearchModal({ messages, onSelectMessage }: SmartSearchModalProps) {
    const { showSearchModal, setShowSearchModal, searchQuery, setSearchQuery } = useUIStore();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filters = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);

    const results = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return messages
            .filter(msg => msg.type !== 'notification' && matchMessage(msg, filters))
            .slice(-40)
            .reverse();
    }, [messages, searchQuery, filters]);

    useEffect(() => {
        if (showSearchModal) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [showSearchModal]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    if (!showSearchModal) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSearchModal(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, Math.max(results.length - 1, 0)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            onSelectMessage?.(results[selectedIndex]);
            setShowSearchModal(false);
        }
    };

    const addFilter = (prefix: string) => {
        setSearchQuery(`${searchQuery.trim()} ${prefix}`.trim());
        inputRef.current?.focus();
    };

    return (
        <div className="modal-overlay" onClick={() => setShowSearchModal(false)}>
            <div 
                className="w-full max-w-2xl bg-[#0d121e] border border-white/10 rounded-xl flex flex-col max-h-[80vh] shadow-2xl shadow-black/80 overflow-hidden animate-fadeIn"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Search Bar Input */}
                <div className="p-3.5 border-b border-white/[0.08] flex items-center gap-3 bg-[#101726]">
                    <Search size={18} className="text-sky-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search across all channels, users, and files... (e.g. from:alice has:file)"
                        className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none font-sans"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <kbd className="text-[10px] font-mono text-slate-400 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded">
                        ESC
                    </kbd>
                </div>

                {/* Filter Quick Pills */}
                <div className="px-3.5 py-2 border-b border-white/[0.06] bg-[#090d16] flex items-center gap-1.5 overflow-x-auto text-xs custom-scrollbar">
                    <span className="text-[10px] font-mono uppercase text-slate-500 mr-1 shrink-0">Filters:</span>
                    <button 
                        onClick={() => addFilter('has:file')}
                        className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-sky-500/15 hover:text-sky-300 border border-white/5 text-[11px] font-mono text-slate-400 transition-colors shrink-0 cursor-pointer"
                    >
                        + has:file
                    </button>
                    <button 
                        onClick={() => addFilter('in:general')}
                        className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-sky-500/15 hover:text-sky-300 border border-white/5 text-[11px] font-mono text-slate-400 transition-colors shrink-0 cursor-pointer"
                    >
                        + in:general
                    </button>
                    <button 
                        onClick={() => addFilter('type:dm')}
                        className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-sky-500/15 hover:text-sky-300 border border-white/5 text-[11px] font-mono text-slate-400 transition-colors shrink-0 cursor-pointer"
                    >
                        + type:dm
                    </button>
                    <button 
                        onClick={() => addFilter('from:')}
                        className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-sky-500/15 hover:text-sky-300 border border-white/5 text-[11px] font-mono text-slate-400 transition-colors shrink-0 cursor-pointer"
                    >
                        + from:user
                    </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {!searchQuery.trim() ? (
                        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                            <Sparkles size={24} className="text-sky-500/40" />
                            <p className="text-xs">Type a keyword or filter to scan message history.</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-xs">
                            No messages match your search criteria.
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <div className="text-[10px] font-mono uppercase text-slate-500 px-2 mb-1">
                                Found {results.length} results
                            </div>
                            {results.map((msg, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={msg.id}
                                        onClick={() => {
                                            onSelectMessage?.(msg);
                                            setShowSearchModal(false);
                                        }}
                                        className={`spotlight-card p-2.5 rounded-xl border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-sky-500/10 border-sky-500/40 text-white'
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-semibold text-sky-400 truncate">
                                                    @{msg.username || 'System'}
                                                </span>
                                                {msg.channel && (
                                                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.2 rounded">
                                                        #{msg.channel}
                                                    </span>
                                                )}
                                                {msg.type === 'file' && (
                                                    <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                                                        FILE
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                                            {msg.type === 'file' ? (msg.filename || 'Shared file') : (msg.content || '')}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer hints */}
                <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0a0d16] flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-3">
                        <span>Navigate: ↑ ↓</span>
                        <span>Select: ↵</span>
                    </div>
                    <span>LAN Saturn Smart Search</span>
                </div>
            </div>
        </div>
    );
}
