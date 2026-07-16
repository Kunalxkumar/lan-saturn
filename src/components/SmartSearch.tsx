import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * SmartSearch — rich search overlay with filter syntax.
 *
 * Supported filters:
 *   from:username   — messages from a specific user
 *   in:#channel     — messages in a specific channel
 *   has:file        — file messages only
 *   has:image       — file messages with image types
 *   type:dm         — private messages only
 *   before:YYYY-MM-DD / after:YYYY-MM-DD — date filters
 *   Plain text      — substring match on message content or filename
 */
function parseSearchQuery(raw) {
    const filters = { from: null, channel: null, hasFile: false, hasImage: false, typeDm: false, before: null, after: null, text: '' };
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

function matchMessage(msg, filters) {
    if (filters.from && (msg.username || '').toLowerCase() !== filters.from) return false;
    if (filters.channel && (msg.channel || '').toLowerCase() !== filters.channel) return false;
    if (filters.hasFile && msg.type !== 'file') return false;
    if (filters.hasImage) {
        if (msg.type !== 'file') return false;
        if (!(msg.originalType || '').startsWith('image/')) return false;
    }
    if (filters.typeDm && msg.type !== 'private') return false;

    if (filters.before) {
        const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;
        if (!msgDate || msgDate >= new Date(filters.before + 'T23:59:59')) return false;
    }
    if (filters.after) {
        const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;
        if (!msgDate || msgDate <= new Date(filters.after + 'T00:00:00')) return false;
    }

    if (filters.text) {
        const content = (msg.content || '').toLowerCase();
        const filename = (msg.filename || '').toLowerCase();
        const username = (msg.username || '').toLowerCase();
        if (!content.includes(filters.text) && !filename.includes(filters.text) && !username.includes(filters.text)) {
            return false;
        }
    }

    return true;
}

function highlightMatch(text, query) {
    if (!query || !text) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SmartSearch({ messages, searchQuery, onSearchChange }) {
    const [showOverlay, setShowOverlay] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const overlayRef = useRef(null);

    const filters = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);

    const results = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return messages
            .filter(msg => msg.type !== 'notification' && matchMessage(msg, filters))
            .slice(-50)
            .reverse();
    }, [messages, searchQuery, filters]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Close overlay on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (overlayRef.current && !overlayRef.current.contains(e.target)) {
                setShowOverlay(false);
            }
        }
        if (showOverlay) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showOverlay]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setShowOverlay(false);
            return;
        }
        if (!results.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
    };

    const scopePills = [];
    if (filters.from) scopePills.push(`from:${filters.from}`);
    if (filters.channel) scopePills.push(`in:#${filters.channel}`);
    if (filters.hasFile) scopePills.push('has:file');
    if (filters.hasImage) scopePills.push('has:image');
    if (filters.typeDm) scopePills.push('type:dm');
    if (filters.before) scopePills.push(`before:${filters.before}`);
    if (filters.after) scopePills.push(`after:${filters.after}`);

    return (
        <div className="smart-search" ref={overlayRef}>
            <div className="search-container">
                <input
                    ref={inputRef}
                    type="text"
                    className="search-input"
                    placeholder="Search... (from: in: has: type: before: after:)"
                    value={searchQuery}
                    onChange={(e) => {
                        onSearchChange(e.target.value);
                        setShowOverlay(true);
                    }}
                    onFocus={() => setShowOverlay(true)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {showOverlay && searchQuery.trim() && (
                <div className="search-overlay">
                    {scopePills.length > 0 && (
                        <div className="search-scope-pills">
                            {scopePills.map((pill, i) => (
                                <span key={i} className="scope-pill">{pill}</span>
                            ))}
                        </div>
                    )}

                    <div className="search-results-header">
                        {results.length} result{results.length !== 1 ? 's' : ''}
                    </div>

                    {results.length === 0 ? (
                        <div className="search-empty">No messages match your search.</div>
                    ) : (
                        <div className="search-results-list">
                            {results.map((msg, i) => (
                                <div
                                    key={msg.id}
                                    className={`search-result-card ${i === selectedIndex ? 'selected' : ''}`}
                                >
                                    <div className="search-result-meta">
                                        <span className="search-result-user">{msg.username || 'System'}</span>
                                        {msg.channel && <span className="search-result-channel">#{msg.channel}</span>}
                                        <span className="search-result-time">{formatTime(msg.timestamp)}</span>
                                        {msg.type === 'file' && <span className="search-result-badge file">File</span>}
                                        {msg.type === 'private' && <span className="search-result-badge dm">DM</span>}
                                    </div>
                                    <div className="search-result-content">
                                        {msg.type === 'file'
                                            ? highlightMatch(msg.filename || 'file', filters.text)
                                            : highlightMatch(
                                                (msg.content || '').slice(0, 120) + ((msg.content || '').length > 120 ? '…' : ''),
                                                filters.text
                                              )
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
