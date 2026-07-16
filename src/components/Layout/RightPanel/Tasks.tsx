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
        <div className="right-sidebar-section tasks-section">
            <h3 className="section-title">Channel Tasks</h3>
            
            <div className="task-cards-list">
                {tasks.length === 0 ? (
                    <div className="empty-state">
                        <CheckSquare size={32} className="empty-icon" />
                        <p>No tasks yet.</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className={`task-card ${task.done ? 'done' : ''}`}>
                            <button className="task-check-btn" onClick={() => onToggle(task.id)}>
                                {task.done ? <CheckSquare size={18} className="text-success" /> : <Square size={18} />}
                            </button>
                            <span className="task-title">{task.text}</span>
                            <button className="task-delete-btn" onClick={() => onDelete(task.id)}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <form className="add-task-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="add-task-input"
                    placeholder="Add a task..."
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                />
                <button type="submit" className="add-task-submit" disabled={!newTaskText.trim()}>
                    <Plus size={16} />
                </button>
            </form>
        </div>
    );
}
