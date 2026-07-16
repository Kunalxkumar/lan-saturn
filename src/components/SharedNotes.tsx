import React, { useState, useEffect, useRef } from 'react';

/**
 * SharedNotes - Collaborative real-time markdown notes.
 */
export default function SharedNotes({ socket, channel, username, onClose }) {
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [newNoteName, setNewNoteName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // Toggle preview vs edit
    const [lastUpdater, setLastUpdater] = useState('');

    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Fetch notes list on mount or channel change
    useEffect(() => {
        if (!socket) return;
        socket.emit('get_notes', { channel });

        socket.on('notes_list', (data) => {
            if (data.channel === channel) {
                setNotes(data.notes || []);
                // Set first note as active if none is active
                if (data.notes && data.notes.length > 0 && !activeNote) {
                    selectNote(data.notes[0]);
                }
            }
        });

        socket.on('note_content', (data) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setNoteContent(data.content);
            }
        });

        socket.on('note_updated', (data) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setLastUpdater(data.username);
                // Simple merge: keep cursor if we are focused
                if (textareaRef.current && document.activeElement === textareaRef.current) {
                    const start = textareaRef.current.selectionStart;
                    const end = textareaRef.current.selectionEnd;
                    setNoteContent(data.content);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.selectionStart = start;
                            textareaRef.current.selectionEnd = end;
                        }
                    }, 0);
                } else {
                    setNoteContent(data.content);
                }
            }
        });

        socket.on('note_deleted', (data) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setActiveNote('');
                setNoteContent('');
            }
        });

        return () => {
            socket.off('notes_list');
            socket.off('note_content');
            socket.off('note_updated');
            socket.off('note_deleted');
        };
    }, [socket, channel, activeNote]);

    const selectNote = (noteName) => {
        setActiveNote(noteName);
        setNoteContent('');
        setLastUpdater('');
        socket.emit('get_note_content', { channel, noteName });
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setNoteContent(val);

        // Throttle emissions to avoid flooding
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('save_note', {
                channel,
                noteName: activeNote,
                content: val,
                username
            });
        }, 150);
    };

    const handleCreateNote = (e) => {
        e.preventDefault();
        if (!newNoteName.trim()) return;
        socket.emit('create_note', { channel, noteName: newNoteName.trim(), username });
        setActiveNote(newNoteName.trim());
        setNewNoteName('');
        setShowCreateForm(false);
    };

    const handleDeleteNote = (noteName) => {
        if (window.confirm(`Delete the note "${noteName}"?`)) {
            socket.emit('delete_note', { channel, noteName });
        }
    };

    return (
        <div className="shared-notes-container">
            <div className="notes-sidebar">
                <div className="notes-sidebar-header">
                    <span>Notes</span>
                    <button className="add-note-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
                        {showCreateForm ? '✕' : '+'}
                    </button>
                </div>

                {showCreateForm && (
                    <form className="create-note-form" onSubmit={handleCreateNote}>
                        <input
                            type="text"
                            placeholder="Note title..."
                            value={newNoteName}
                            onChange={e => setNewNoteName(e.target.value)}
                            maxLength={50}
                            autoFocus
                        />
                        <button type="submit">Create</button>
                    </form>
                )}

                <div className="notes-list">
                    {notes.length === 0 ? (
                        <div className="notes-empty">No notes found.</div>
                    ) : (
                        notes.map(note => (
                            <div key={note} className={`note-item-wrapper ${activeNote === note ? 'active' : ''}`}>
                                <button className="note-item" onClick={() => selectNote(note)}>
                                    📄 {note}
                                </button>
                                <button className="delete-note-btn" onClick={() => handleDeleteNote(note)}>✕</button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="notes-editor-panel">
                {activeNote ? (
                    <>
                        <div className="editor-header">
                            <h2>{activeNote}</h2>
                            <div className="editor-actions">
                                <button 
                                    className={`toggle-mode-btn ${isEditing ? 'active' : ''}`} 
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? 'Preview' : 'Edit'}
                                </button>
                                {lastUpdater && (
                                    <span className="updater-info">Last edited by: {lastUpdater}</span>
                                )}
                            </div>
                        </div>

                        {isEditing ? (
                            <textarea
                                ref={textareaRef}
                                className="note-textarea"
                                value={noteContent}
                                onChange={handleTextChange}
                                placeholder="Type markdown here..."
                            />
                        ) : (
                            <div className="note-preview markdown-body">
                                {noteContent ? (
                                    // A very simple Markdown renderer for headers, bold, lists
                                    noteContent.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i}>{line.slice(2)}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
                                        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i}>{line.slice(2)}</li>;
                                        if (line.trim() === '') return <br key={i} />;
                                        return <p key={i}>{line}</p>;
                                    })
                                ) : (
                                    <p className="preview-empty">Empty note. Switch to Edit to write something.</p>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="editor-empty">
                        <h3>Select or create a note to begin collaborative editing</h3>
                    </div>
                )}
            </div>
        </div>
    );
}
