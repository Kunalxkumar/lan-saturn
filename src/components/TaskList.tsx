import React, { useState } from 'react';

/**
 * TaskList — real-time synced checklist per channel.
 */
export default function TaskList({ tasks, onToggle, onDelete, onCreate }) {
    const [newTaskText, setNewTaskText] = useState('');
    const [isExpanded, setIsExpanded] = useState(true);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        onCreate(newTaskText.trim());
        setNewTaskText('');
    };

    const doneCount = tasks.filter(t => t.done).length;

    return (
        <div className="task-list-container">
            <button className="task-list-header" onClick={() => setIsExpanded(!isExpanded)}>
                <span className="task-list-icon">☑</span>
                <span className="task-list-title">Tasks</span>
                <span className="task-list-count">{doneCount}/{tasks.length}</span>
                <span className={`task-list-chevron ${isExpanded ? 'open' : ''}`}>▸</span>
            </button>

            {isExpanded && (
                <div className="task-list-body">
                    {tasks.length === 0 ? (
                        <div className="task-empty">No tasks yet. Add one below.</div>
                    ) : (
                        <div className="task-items">
                            {tasks.map(task => (
                                <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                                    <button className="task-checkbox" onClick={() => onToggle(task.id)}>
                                        {task.done ? '☑' : '☐'}
                                    </button>
                                    <span className="task-text">{task.text}</span>
                                    <button className="task-delete" onClick={() => onDelete(task.id)} title="Delete task">✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <form className="task-add-form" onSubmit={handleSubmit}>
                        <input
                            className="task-add-input"
                            placeholder="Add a task..."
                            value={newTaskText}
                            onChange={e => setNewTaskText(e.target.value)}
                            maxLength={300}
                        />
                        <button type="submit" className="task-add-btn" disabled={!newTaskText.trim()}>+</button>
                    </form>
                </div>
            )}
        </div>
    );
}
