import React, { useState, useEffect } from 'react';
import { 
    History, 
    RefreshCw, 
    X, 
    Search, 
    ArrowUpRight, 
    ArrowDownLeft, 
    FileText, 
    Copy, 
    Check, 
    ShieldCheck,
    Loader2 
} from 'lucide-react';

interface TransferHistoryProps {
    onClose: () => void;
}

export default function TransferHistory({ onClose }: TransferHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDirection, setFilterDirection] = useState<'all' | 'sent' | 'received'>('all');
    const [copiedHash, setCopiedHash] = useState<string | null>(null);

    useEffect(() => {
        fetchHistory();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/transfer-history');
            const data = await res.json();
            if (res.ok && data.success) {
                setHistory((data.history || []).sort((a: any, b: any) => b.timestamp - a.timestamp));
            } else {
                setError(data.error || 'Failed to fetch transfer history');
            }
        } catch (err) {
            setError('Error loading transfer history');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard?.writeText(text);
        setCopiedHash(text);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    const formatTime = (ts: number) => {
        try {
            const d = new Date(ts * 1000);
            return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const filteredHistory = history.filter(item => {
        const matchesSearch = 
            (item.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.hash || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDirection = 
            filterDirection === 'all' || item.direction === filterDirection;
        return matchesSearch && matchesDirection;
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div 
                className="w-full max-w-3xl bg-[#0c111c] border border-white/10 rounded-xl flex flex-col max-h-[85vh] shadow-2xl shadow-black/80 animate-fadeIn overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0f1524]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                            <History size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-100">
                                LAN Transfer Log
                            </h2>
                            <p className="text-[11px] font-mono text-slate-400">
                                Local network file transfers and SHA-256 verification
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchHistory}
                            disabled={loading}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title="Refresh"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin text-sky-400' : ''} />
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-3 border-b border-white/[0.06] bg-[#0a0d16] flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="relative flex-1 w-full">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter by filename or SHA-256 hash..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#121826] border border-white/10 focus:border-sky-500/50 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none transition-all font-sans"
                        />
                    </div>

                    {/* Direction filter pills */}
                    <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/5 self-stretch sm:self-auto">
                        {(['all', 'sent', 'received'] as const).map(dir => (
                            <button
                                key={dir}
                                onClick={() => setFilterDirection(dir)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                                    filterDirection === dir
                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {dir}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                    {loading && history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                            <Loader2 size={24} className="animate-spin text-sky-400" />
                            <span className="text-xs font-mono">Fetching transfers...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center">
                            {error}
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                            <FileText size={28} className="stroke-[1.5] text-slate-600" />
                            <p className="text-xs">No transfers found matching your filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {filteredHistory.map(item => {
                                const isSent = item.direction === 'sent';
                                return (
                                    <div 
                                        key={item.id} 
                                        className="spotlight-card flex items-center justify-between p-3 rounded-xl border border-white/[0.06] hover:border-sky-500/30 gap-3 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`p-2 rounded-lg shrink-0 ${
                                                isSent ? 'bg-sky-500/15 text-sky-400' : 'bg-emerald-500/15 text-emerald-400'
                                            }`}>
                                                {isSent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                            </div>

                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-slate-200 truncate">
                                                        {item.filename}
                                                    </span>
                                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                                        isSent 
                                                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' 
                                                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                                    }`}>
                                                        {isSent ? 'UPLOAD' : 'DOWNLOAD'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                                                    <span>{formatSize(item.size)}</span>
                                                    <span>•</span>
                                                    <span>{formatTime(item.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hash & Copy Action */}
                                        {item.hash && (
                                            <button
                                                onClick={() => copyToClipboard(item.hash)}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                                                title="Copy SHA-256 Hash"
                                            >
                                                <span className="truncate max-w-[100px] sm:max-w-[140px]">
                                                    {item.hash.slice(0, 12)}...
                                                </span>
                                                {copiedHash === item.hash ? (
                                                    <Check size={11} className="text-emerald-400" />
                                                ) : (
                                                    <Copy size={11} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
