import React, { useState, useEffect } from 'react';
import { Clipboard, Copy, CheckCircle, RefreshCw, ClipboardCheck, Radio, Check } from 'lucide-react';
import { writeClipboardText, watchClipboard } from '../lib/clipboard';

interface ClipboardSyncProps {
    socket: any;
    username: string;
}

export default function ClipboardSync({ socket, username }: ClipboardSyncProps) {
    const [isEnabled, setIsEnabled] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_clipboard_history');

        const onHistoryList = (data: any) => {
            setHistory(data.history || []);
        };

        const onClipboardUpdated = (data: any) => {
            setHistory(prev => {
                if (prev.length > 0 && prev[0].text === data.text) return prev;
                const updated = [
                    {
                        id: `cb_${Date.now()}`,
                        text: data.text,
                        username: data.username,
                        timestamp: Date.now() / 1000
                    },
                    ...prev
                ];
                return updated.slice(0, 25);
            });

            if (isEnabled) {
                writeClipboardText(data.text);
                showStatus(`P2P synced from @${data.username}`);
            }
        };

        socket.on('clipboard_history_list', onHistoryList);
        socket.on('clipboard_updated', onClipboardUpdated);

        return () => {
            socket.off('clipboard_history_list', onHistoryList);
            socket.off('clipboard_updated', onClipboardUpdated);
        };
    }, [socket, isEnabled]);

    useEffect(() => {
        if (!isEnabled || !socket) return;

        const stopWatch = watchClipboard((text) => {
            socket.emit('clipboard_sync', {
                text,
                username
            });
            showStatus('Captured & broadcasted to LAN');
        });

        return () => {
            stopWatch();
        };
    }, [isEnabled, socket, username]);

    const showStatus = (msg: string) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), 2500);
    };

    const handleCopy = async (id: string, text: string) => {
        const success = await writeClipboardText(text);
        if (success) {
            setCopiedId(id);
            showStatus('Copied text to clipboard');
            setTimeout(() => setCopiedId(null), 1500);
        } else {
            showStatus('Failed to access clipboard');
        }
    };

    const formatTime = (ts: number) => {
        if (!ts) return '';
        try {
            const d = new Date(ts * 1000);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
            return '';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-200 p-5 overflow-hidden select-none">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full gap-5">
                {/* Header Config Card */}
                <div className="bg-[#0c101a] border border-white/[0.08] rounded-xl p-5 shadow-2xl flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-sm">
                            <ClipboardCheck size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-100">
                                LAN Clipboard Mirror
                            </h2>
                            <p className="text-xs text-slate-400">
                                Real-time background sync of copied strings across Windows/Linux peers on LAN.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {statusMessage && (
                            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20 animate-pulse">
                                {statusMessage}
                            </span>
                        )}

                        {/* Modern Toggle Switch */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">
                                {isEnabled ? 'SYNC ACTIVE' : 'DISABLED'}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isEnabled} 
                                    onChange={e => setIsEnabled(e.target.checked)} 
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-white/[0.06] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 border border-white/10 shadow-inner"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Clipboard History List */}
                <div className="flex-1 bg-[#0c101a] border border-white/[0.08] rounded-xl p-5 shadow-2xl flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-100">Broadcast History</span>
                            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                                {history.length} Clips
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                        {history.length === 0 ? (
                            <div className="text-xs text-slate-500 italic text-center py-16 bg-white/[0.02] rounded-xl border border-white/5">
                                No clipboard clips shared yet. Turn on sync or copy text to publish.
                            </div>
                        ) : (
                            history.map(item => (
                                <div 
                                    key={item.id} 
                                    className="spotlight-card rounded-xl p-3.5 border border-white/[0.06] hover:border-sky-500/30 flex items-start justify-between gap-4 transition-all group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-semibold text-sky-400 font-mono">
                                                @{item.username}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500">
                                                {formatTime(item.timestamp)}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-600">
                                                {item.text?.length || 0} chars
                                            </span>
                                        </div>
                                        <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed break-all max-h-32 overflow-y-auto custom-scrollbar bg-[#090d14] p-2.5 rounded-lg border border-white/5">
                                            {item.text}
                                        </pre>
                                    </div>

                                    <button 
                                        onClick={() => handleCopy(item.id, item.text)}
                                        className={`p-2 rounded-lg border transition-all shrink-0 cursor-pointer ${
                                            copiedId === item.id
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                : 'bg-white/[0.03] hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 border-white/5'
                                        }`}
                                        title="Copy to clipboard"
                                    >
                                        {copiedId === item.id ? <Check size={15} /> : <Copy size={15} />}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
