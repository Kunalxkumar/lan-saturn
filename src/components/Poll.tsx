import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Trash2, X, CheckCircle2, Circle } from 'lucide-react';

interface PollProps {
    poll: {
        id: string | number;
        question: string;
        options: string[];
        votes: Record<string | number, string[]>;
        creator: string;
        closed: boolean;
    };
    currentUsername: string;
    onVote: (pollId: any, optionIndex: number) => void;
    onClose: (pollId: any) => void;
}

export function Poll({ poll, currentUsername, onVote, onClose }: PollProps) {
    const totalVotes = Object.values(poll.votes || {}).reduce((sum, voters) => sum + (voters?.length || 0), 0);
    const userVotedIndex = Object.entries(poll.votes || {}).find(
        ([, voters]) => Array.isArray(voters) && voters.includes(currentUsername)
    )?.[0];

    return (
        <div className={`spotlight-card p-3.5 rounded-xl border transition-all ${
            poll.closed 
                ? 'opacity-70 border-white/[0.06] bg-[#0d121c]/60' 
                : 'border-white/10 hover:border-sky-500/30 bg-[#101624]/80'
        }`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded-md bg-sky-500/15 text-sky-400 shrink-0">
                        <BarChart3 size={15} />
                    </div>
                    <span className="text-xs font-semibold text-slate-100 truncate">
                        {poll.question}
                    </span>
                </div>
                {poll.closed && (
                    <span className="text-[10px] font-mono font-bold bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/5 shrink-0">
                        Closed
                    </span>
                )}
            </div>

            {/* Options */}
            <div className="space-y-1.5 my-2.5">
                {poll.options.map((option, idx) => {
                    const voters = poll.votes?.[idx] || [];
                    const voteCount = voters.length;
                    const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const isSelected = String(userVotedIndex) === String(idx);

                    return (
                        <button
                            key={idx}
                            onClick={() => !poll.closed && onVote(poll.id, idx)}
                            disabled={poll.closed}
                            className={`relative w-full overflow-hidden text-left p-2 rounded-lg text-xs transition-all border cursor-pointer ${
                                isSelected
                                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-200 font-medium'
                                    : 'border-white/5 hover:border-white/15 bg-white/[0.02] text-slate-300'
                            }`}
                        >
                            {/* Animated Percentage Fill Bar */}
                            <div 
                                className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                                    isSelected ? 'bg-sky-500/25' : 'bg-white/[0.06]'
                                }`} 
                                style={{ width: `${pct}%` }} 
                            />

                            {/* Option Content */}
                            <div className="relative flex items-center justify-between gap-2 z-10">
                                <div className="flex items-center gap-2 truncate">
                                    {isSelected ? (
                                        <CheckCircle2 size={13} className="text-sky-400 shrink-0" />
                                    ) : (
                                        <Circle size={13} className="text-slate-500 shrink-0" />
                                    )}
                                    <span className="truncate">{option}</span>
                                </div>
                                <span className="font-mono text-[11px] font-semibold text-slate-400 shrink-0">
                                    {pct}% <span className="text-[10px] text-slate-500">({voteCount})</span>
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-white/[0.05]">
                <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} • by @{poll.creator}</span>
                {!poll.closed && poll.creator === currentUsername && (
                    <button 
                        onClick={() => onClose(poll.id)}
                        className="text-rose-400 hover:text-rose-300 font-medium hover:underline cursor-pointer"
                    >
                        End Poll
                    </button>
                )}
            </div>
        </div>
    );
}

interface CreatePollModalProps {
    onSubmit: (question: string, options: string[]) => void;
    onCancel: () => void;
}

export function CreatePollModal({ onSubmit, onCancel }: CreatePollModalProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const addOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        }
    };

    const updateOption = (idx: number, value: string) => {
        const updated = [...options];
        updated[idx] = value;
        setOptions(updated);
    };

    const removeOption = (idx: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== idx));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validOptions = options.filter(o => o.trim());
        if (!question.trim() || validOptions.length < 2) return;
        onSubmit(question.trim(), validOptions);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div 
                className="w-full max-w-md bg-[#0f1422] border border-white/10 rounded-xl p-5 shadow-2xl shadow-black/60 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                            <BarChart3 size={18} />
                        </div>
                        <h2 className="text-sm font-bold text-slate-100">Create Room Poll</h2>
                    </div>
                    <button 
                        onClick={onCancel} 
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div>
                        <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                            Question
                        </label>
                        <input
                            className="w-full bg-[#161d2d] border border-white/10 focus:border-sky-500/50 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                            placeholder="What would you like to poll?"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            maxLength={200}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                            Options
                        </label>
                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        className="flex-1 bg-[#161d2d] border border-white/10 focus:border-sky-500/50 rounded-lg p-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={e => updateOption(idx, e.target.value)}
                                        maxLength={100}
                                    />
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOption(idx)}
                                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                            title="Remove option"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {options.length < 6 && (
                        <button
                            type="button"
                            onClick={addOption}
                            className="btn-secondary text-xs w-full py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                        >
                            <Plus size={14} />
                            <span>Add Option</span>
                        </button>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-secondary text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                            className="btn-shimmer text-xs px-4 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Publish Poll
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
