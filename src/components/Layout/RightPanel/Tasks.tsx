import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2 } from 'lucide-react';

export default function Tasks({ tasks, onToggle, onDelete, onCreate }) {
    const [newTaskText, setNewTaskText] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            onCreate(newTaskText.trim());
            setNewTaskText('');
        }
    };

    return (
        <div className="right-sidebar-section tasks-section p-4 flex flex-col gap-3">
            <h3 className="section-title text-xs font-bold uppercase tracking-wider text-gray-400">Channel Tasks</h3>
            
            <div className="task-cards-list flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="empty-state flex flex-col items-center justify-center py-6 text-gray-500 gap-1">
                        <CheckSquare size={28} className="empty-icon text-gray-600" />
                        <p className="text-xs">No tasks yet.</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className={`task-card flex items-center gap-2 p-2 rounded-lg bg-saturn-card/40 border border-white/5 ${task.done ? 'opacity-50 line-through' : ''}`}>
                            <button className="task-check-btn text-indigo-400 hover:text-indigo-300" onClick={() => onToggle(task.id)}>
                                {task.done ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} />}
                            </button>
                            <span className="task-title flex-1 text-xs text-gray-200 truncate">{task.text}</span>
                            <button className="task-delete-btn text-gray-500 hover:text-rose-400 transition-colors p-1" onClick={() => onDelete(task.id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <form className="add-task-form flex items-center gap-2 mt-1" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="add-task-input flex-1 bg-slate-800/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-500"
                    placeholder="Add a task..."
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                />
                <button type="submit" className="add-task-submit bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg disabled:opacity-40 transition-colors" disabled={!newTaskText.trim()}>
                    <Plus size={16} />
                </button>
            </form>
        </div>
    );
}
