import React, { useState } from 'react';
import { 
    ArrowUpRight, 
    ArrowDownLeft, 
    Pause, 
    Play, 
    X, 
    ShieldCheck, 
    AlertTriangle, 
    ChevronDown, 
    ChevronUp, 
    FileText 
} from 'lucide-react';
import { useTransferStore, ActiveTransfer } from '../../store/appStore';

export default function ActiveTransferDock() {
    const { transfers, removeTransfer } = useTransferStore();
    const [isMinimized, setIsMinimized] = useState(false);

    const transferList = Object.values(transfers);
    if (transferList.length === 0) return null;

    const activeCount = transferList.filter(
        t => t.state === 'uploading' || t.state === 'downloading' || t.state === 'resuming' || t.state === 'verifying'
    ).length;

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes <= 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <aside 
            aria-label="Active Transfers Dock"
            className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] select-none animate-fadeIn"
        >
            <div className="bg-[#0b0f19]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col">
                {/* Header Bar */}
                <div className="px-3.5 py-2.5 bg-[#0e1422] border-b border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex h-2 w-2 shrink-0">
                            {activeCount > 0 && (
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-sky-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${activeCount > 0 ? 'bg-sky-400' : 'bg-slate-500'}`} />
                        </span>
                        <span className="text-xs font-bold text-slate-100 truncate">
                            LAN Transfers
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-white/5 border border-white/10 text-slate-300">
                            {transferList.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title={isMinimized ? "Expand Dock" : "Minimize Dock"}
                            aria-label={isMinimized ? "Expand Dock" : "Minimize Dock"}
                        >
                            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                {/* Body: Transfer Cards */}
                {!isMinimized && (
                    <div className="p-2.5 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                        {transferList.map((t) => {
                            const isUpload = t.direction === 'upload';
                            const isVerifying = t.state === 'verifying';
                            const isCompleted = t.state === 'completed';
                            const isPaused = t.state === 'paused';
                            const isFailed = t.state === 'failed';

                            return (
                                <div 
                                    key={t.id}
                                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors flex flex-col gap-1.5"
                                >
                                    {/* Top Row: Icon, Filename & Controls */}
                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                                                isUpload 
                                                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' 
                                                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                            }`}>
                                                {isUpload ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-semibold text-slate-200 truncate" title={t.filename}>
                                                    {t.filename}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {formatBytes(t.transferredBytes)} / {formatBytes(t.totalSize)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {t.pause && t.state === 'uploading' && (
                                                <button
                                                    onClick={t.pause}
                                                    className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-colors cursor-pointer"
                                                    title="Pause Transfer"
                                                    aria-label="Pause Transfer"
                                                >
                                                    <Pause size={12} />
                                                </button>
                                            )}
                                            {t.resume && isPaused && (
                                                <button
                                                    onClick={t.resume}
                                                    className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-white/5 transition-colors cursor-pointer"
                                                    title="Resume Transfer"
                                                    aria-label="Resume Transfer"
                                                >
                                                    <Play size={12} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    t.cancel?.();
                                                    removeTransfer(t.id);
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-white/5 transition-colors cursor-pointer"
                                                title={isCompleted ? "Dismiss" : "Cancel Transfer"}
                                                aria-label={isCompleted ? "Dismiss" : "Cancel Transfer"}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-200 ${
                                                isCompleted 
                                                    ? 'bg-emerald-400' 
                                                    : isFailed 
                                                    ? 'bg-rose-500' 
                                                    : isPaused 
                                                    ? 'bg-amber-400' 
                                                    : isVerifying 
                                                    ? 'bg-sky-400 animate-pulse' 
                                                    : 'bg-sky-500'
                                            }`}
                                            style={{ width: `${Math.max(2, Math.min(100, t.percent))}%` }}
                                        />
                                    </div>

                                    {/* Status & Stats Footer */}
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="flex items-center gap-1 text-slate-400">
                                            {isCompleted ? (
                                                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                                    <ShieldCheck size={11} /> SHA-256 Verified
                                                </span>
                                            ) : isVerifying ? (
                                                <span className="text-sky-300 animate-pulse font-semibold">
                                                    Verifying Checksum...
                                                </span>
                                            ) : isPaused ? (
                                                <span className="text-amber-400 font-semibold">
                                                    PAUSED ({t.percent}%)
                                                </span>
                                            ) : isFailed ? (
                                                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                                                    <AlertTriangle size={11} /> {t.error || 'Failed'}
                                                </span>
                                            ) : (
                                                <span>
                                                    {t.speedMBs > 0 ? `${t.speedMBs} MB/s` : 'Connecting...'} 
                                                    {t.etaSeconds > 0 ? ` • ETA ${t.etaSeconds}s` : ''}
                                                </span>
                                            )}
                                        </span>

                                        <span className={`font-semibold ${
                                            isCompleted ? 'text-emerald-400' : 'text-slate-300'
                                        }`}>
                                            {t.percent}%
                                        </span>
                                    </div>

                                    {/* Hash Preview if completed */}
                                    {isCompleted && t.hash && (
                                        <div className="text-[9px] font-mono text-slate-500 bg-white/[0.02] border border-white/5 rounded px-1.5 py-0.5 truncate">
                                            SHA-256: {t.hash}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
}
