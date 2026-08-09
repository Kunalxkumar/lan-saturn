import React, { useState, useEffect } from 'react';
import { Clipboard, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { writeClipboardText, watchClipboard } from '../lib/clipboard';

/**
 * ClipboardSync - Syncs clipboard contents across computers on LAN.
 */
export default function ClipboardSync({ socket, username }) {
    const [isEnabled, setIsEnabled] = useState(false);
    const [history, setHistory] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_clipboard_history');

        socket.on('clipboard_history_list', (data) => {
            setHistory(data.history || []);
        });

        socket.on('clipboard_updated', (data) => {
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
                return updated.slice(0, 20);
            });

            if (isEnabled) {
                writeClipboardText(data.text);
                showStatus(`Synced from ${data.username}`);
            }
        });

        return () => {
            socket.off('clipboard_history_list');
            socket.off('clipboard_updated');
        };
    }, [socket, isEnabled]);

    useEffect(() => {
        if (!isEnabled || !socket) return;

        const stopWatch = watchClipboard((text) => {
            socket.emit('clipboard_sync', {
                text,
                username
            });
            showStatus('Clipboard shared');
        });

        return () => {
            stopWatch();
        };
    }, [isEnabled, socket, username]);

    const showStatus = (msg) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), 2500);
    };

    const handleCopy = async (text) => {
        const success = await writeClipboardText(text);
        if (success) {
            showStatus('Copied to clipboard');
        } else {
            showStatus('Copy failed');
        }
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0D1117] text-[#dfe2eb] p-6 overflow-hidden">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full gap-6">
                {/* Header Config Card */}
                <div className="bg-[#10141a] border border-[#30363d] rounded-xl p-5 shadow-xl flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5865f2]/20 text-[#5865f2] flex items-center justify-center border border-[#5865f2]/30">
                            <Clipboard size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#dfe2eb]">LAN Clipboard Sync</h2>
                            <p className="text-xs text-gray-400">Sync text automatically across computers on your local network.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {statusMessage && (
                            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                                {statusMessage}
                            </span>
                        )}

                        {/* Modern Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isEnabled} 
                                onChange={e => setIsEnabled(e.target.checked)} 
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#181c22] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865f2] border border-[#30363d]"></div>
                        </label>
                    </div>
                </div>

                {/* Clipboard History List */}
                <div className="flex-1 bg-[#10141a] border border-[#30363d] rounded-xl p-5 shadow-xl flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4 shrink-0">
                        <span className="font-bold text-sm text-[#dfe2eb]">Clipboard History</span>
                        <span className="text-xs font-mono text-gray-400">{history.length} items</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {history.length === 0 ? (
                            <div className="text-xs text-gray-500 italic text-center py-12">No clipboard history items found. Copy text to broadcast it to LAN.</div>
                        ) : (
                            history.map(item => (
                                <div key={item.id} className="bg-[#181c22] border border-[#30363d] rounded-xl p-4 flex items-start justify-between gap-4 hover:border-[#5865f2] transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-bold text-indigo-300">{item.username}</span>
                                            <span className="text-[10px] font-mono text-gray-500">{formatTime(item.timestamp)}</span>
                                        </div>
                                        <pre className="text-xs font-mono text-[#dfe2eb] whitespace-pre-wrap leading-relaxed break-all max-h-36 overflow-y-auto scrollbar-thin">
                                            {item.text}
                                        </pre>
                                    </div>

                                    <button 
                                        onClick={() => handleCopy(item.text)}
                                        className="p-2 rounded-lg bg-[#262a31] hover:bg-[#5865f2] text-gray-300 hover:text-white transition-colors shrink-0 shadow-sm"
                                        title="Copy to clipboard"
                                    >
                                        <Copy size={15} />
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
