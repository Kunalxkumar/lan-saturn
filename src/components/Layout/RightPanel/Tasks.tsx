import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface TasksProps {
    tasks: any[];
    onToggle: (id: any) => void;
    onDelete: (id: any) => void;
    onCreate: (text: string) => void;
}

export default function Tasks({ tasks, onToggle, onDelete, onCreate }: TasksProps) {
    const [newTaskText, setNewTaskText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            onCreate(newTaskText.trim());
            setNewTaskText('');
        }
    };

    return (
        <div className="p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider px-1">
                <span>Room Action Items</span>
                <span className="text-[10px] text-sky-400 font-mono">
                    {tasks.filter(t => t.done).length}/{tasks.length} Done
                </span>
            </div>

            {/* Task creation input */}
            <form className="flex items-center gap-1.5" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="flex-1 bg-[#121824] border border-white/[0.08] focus:border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all shadow-inner"
                    placeholder="New task for this room..."
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                />
                <button 
                    type="submit" 
                    className="btn-shimmer p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer" 
                    disabled={!newTaskText.trim()}
                    title="Add Task"
                >
                    <Plus size={15} />
                </button>
            </form>
            
            {/* Task list */}
            <div className="flex flex-col gap-1.5 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2 bg-white/[0.02] rounded-xl border border-white/5">
                        <CheckCircle2 size={24} className="text-slate-600 stroke-[1.5]" />
                        <p className="text-xs">No pending items for this channel.</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div 
                            key={task.id} 
                            className={`group spotlight-card flex items-center gap-2.5 p-2 rounded-lg border border-white/[0.06] transition-all ${
                                task.done ? 'opacity-60 bg-white/[0.02]' : 'hover:border-sky-500/30'
                            }`}
                        >
                            <button 
                                className="text-slate-400 hover:text-sky-400 shrink-0 cursor-pointer transition-colors" 
                                onClick={() => onToggle(task.id)}
                                title={task.done ? 'Mark incomplete' : 'Mark complete'}
                            >
                                {task.done ? (
                                    <CheckSquare size={16} className="text-emerald-400" />
                                ) : (
                                    <Square size={16} className="text-slate-500 group-hover:text-sky-400" />
                                )}
                            </button>
                            <span className={`flex-1 text-xs text-slate-200 truncate ${task.done ? 'line-through text-slate-400' : 'font-medium'}`}>
                                {task.text}
                            </span>
                            <button 
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1 rounded hover:bg-rose-500/10 cursor-pointer" 
                                onClick={() => onDelete(task.id)}
                                title="Delete task"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
