import React, { useState } from 'react';

/**
 * Poll — renders an inline poll in the message stream with live vote progress bars.
 */
export function Poll({ poll, currentUsername, onVote, onClose }) {
    const totalVotes = Object.values(poll.votes).reduce((sum, voters) => sum + voters.length, 0);
    const userVotedIndex = Object.entries(poll.votes).find(
        ([, voters]) => voters.includes(currentUsername)
    )?.[0];

    return (
        <div className={`poll-card ${poll.closed ? 'closed' : ''}`}>
            <div className="poll-header">
                <span className="poll-icon">📊</span>
                <span className="poll-question">{poll.question}</span>
                {poll.closed && <span className="poll-closed-badge">Closed</span>}
            </div>

            <div className="poll-options">
                {poll.options.map((option, idx) => {
                    const voters = poll.votes[idx] || [];
                    const voteCount = voters.length;
                    const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const isSelected = String(userVotedIndex) === String(idx);

                    return (
                        <button
                            key={idx}
                            className={`poll-option ${isSelected ? 'selected' : ''} ${poll.closed ? 'disabled' : ''}`}
                            onClick={() => !poll.closed && onVote(poll.id, idx)}
                            disabled={poll.closed}
                        >
                            <div className="poll-option-bar" style={{ width: `${pct}%` }} />
                            <span className="poll-option-text">
                                {isSelected && <span className="poll-check">●</span>}
                                {!isSelected && <span className="poll-check">○</span>}
                                {option}
                            </span>
                            <span className="poll-option-pct">{pct}%</span>
                        </button>
                    );
                })}
            </div>

            <div className="poll-footer">
                <span className="poll-vote-count">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                <span className="poll-creator">by {poll.creator}</span>
                {!poll.closed && poll.creator === currentUsername && (
                    <button className="poll-close-btn" onClick={() => onClose(poll.id)}>Close Poll</button>
                )}
            </div>
        </div>
    );
}

/**
 * CreatePollModal — modal form for composing a new poll.
 */
export function CreatePollModal({ onSubmit, onCancel }) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    const addOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        }
    };

    const updateOption = (idx, value) => {
        const updated = [...options];
        updated[idx] = value;
        setOptions(updated);
    };

    const removeOption = (idx) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== idx));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validOptions = options.filter(o => o.trim());
        if (!question.trim() || validOptions.length < 2) return;
        onSubmit(question.trim(), validOptions);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content poll-modal" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">Create Poll</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        className="poll-question-input"
                        placeholder="What's your question?"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        maxLength={200}
                        autoFocus
                    />
                    <div className="poll-options-edit">
                        {options.map((opt, idx) => (
                            <div key={idx} className="poll-option-edit-row">
                                <input
                                    className="poll-option-input"
                                    placeholder={`Option ${idx + 1}`}
                                    value={opt}
                                    onChange={e => updateOption(idx, e.target.value)}
                                    maxLength={100}
                                />
                                {options.length > 2 && (
                                    <button type="button" className="poll-remove-option" onClick={() => removeOption(idx)}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>
                    {options.length < 6 && (
                        <button type="button" className="poll-add-option" onClick={addOption}>+ Add Option</button>
                    )}
                    <div className="modal-actions">
                        <button type="button" className="modal-cancel" onClick={onCancel}>Cancel</button>
                        <button
                            type="submit"
                            className="modal-submit"
                            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                        >
                            Create Poll
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
