import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FileText, Eye, Edit3 } from 'lucide-react';

/**
 * SharedNotes - Collaborative real-time markdown notes.
 */
export default function SharedNotes({ socket, channel, username, onClose }) {
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [newNoteName, setNewNoteName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isEditing, setIsEditing] = useState(true);
    const [lastUpdater, setLastUpdater] = useState('');

    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_notes', { channel });

        socket.on('notes_list', (data) => {
            if (data.channel === channel) {
                setNotes(data.notes || []);
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
        if (window.confirm(`Delete note "${noteName}"?`)) {
            socket.emit('delete_note', { channel, noteName });
        }
    };

    return (
        <div className="flex flex-1 h-full bg-[#0D1117] text-[#dfe2eb] overflow-hidden">
            {/* Left Notes List Sidebar */}
            <div className="w-64 bg-[#10141a] border-r border-[#30363d] flex flex-col p-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-sm text-[#dfe2eb]">Shared Notes</span>
                    <button 
                        className="p-1.5 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        title="Create Note"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {showCreateForm && (
                    <form className="mb-4 flex flex-col gap-2" onSubmit={handleCreateNote}>
                        <input
                            type="text"
                            placeholder="Note title..."
                            value={newNoteName}
                            onChange={e => setNewNoteName(e.target.value)}
                            maxLength={50}
                            className="w-full bg-[#181c22] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#dfe2eb] placeholder-gray-500 outline-none focus:border-[#5865f2]"
                            autoFocus
                        />
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1 rounded-md transition-colors">
                            Create Note
                        </button>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto space-y-1">
                    {notes.length === 0 ? (
                        <div className="text-xs text-gray-500 italic text-center py-6">No notes found. Click + to create one.</div>
                    ) : (
                        notes.map(note => {
                            const isActive = activeNote === note;
                            return (
                                <div key={note} className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${isActive ? 'bg-[#5865f2]/20 text-[#bec2ff] border-l-2 border-[#5865f2] font-semibold' : 'text-gray-400 hover:bg-[#181c22] hover:text-[#dfe2eb]'}`}>
                                    <button className="flex items-center gap-2 flex-1 truncate text-xs text-left" onClick={() => selectNote(note)}>
                                        <FileText size={14} className="shrink-0" />
                                        <span className="truncate">{note}</span>
                                    </button>
                                    <button 
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 transition-opacity" 
                                        onClick={() => handleDeleteNote(note)}
                                        title="Delete note"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Note Editor Area */}
            <div className="flex-1 flex flex-col h-full bg-[#0D1117] p-6 overflow-hidden">
                {activeNote ? (
                    <div className="flex flex-col h-full bg-[#10141a] border border-[#30363d] rounded-xl p-4 shadow-xl">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#30363d] shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-[#5865f2]" />
                                <h2 className="text-base font-bold text-[#dfe2eb]">{activeNote}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {lastUpdater && (
                                    <span className="text-xs text-gray-400 font-mono">Last edit by: {lastUpdater}</span>
                                )}
                                <button 
                                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${isEditing ? 'bg-[#5865f2] text-white border-[#5865f2]' : 'bg-[#181c22] text-gray-300 border-[#30363d] hover:bg-[#262a31]'}`} 
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? <><Eye size={13} /> Preview</> : <><Edit3 size={13} /> Edit</>}
                                </button>
                            </div>
                        </div>

                        {isEditing ? (
                            <textarea
                                ref={textareaRef}
                                className="flex-1 w-full bg-[#181c22] border border-[#30363d] rounded-lg p-4 text-xs font-mono text-[#dfe2eb] placeholder-gray-500 outline-none focus:border-[#5865f2] resize-none leading-relaxed"
                                value={noteContent}
                                onChange={handleTextChange}
                                placeholder="Write markdown notes here..."
                            />
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 bg-[#181c22] border border-[#30363d] rounded-lg text-xs leading-relaxed space-y-2">
                                {noteContent ? (
                                    noteContent.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-white border-b border-gray-700 pb-1 mt-2">{line.slice(2)}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-indigo-300 mt-2">{line.slice(3)}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-bold text-gray-300 mt-1">{line.slice(4)}</h3>;
                                        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 text-gray-300">{line.slice(2)}</li>;
                                        if (line.trim() === '') return <br key={i} />;
                                        return <p key={i} className="text-gray-300">{line}</p>;
                                    })
                                ) : (
                                    <p className="text-gray-500 italic">Empty note. Click Edit to write content.</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#10141a] border border-[#30363d] rounded-xl">
                        <FileText size={48} className="text-gray-600 mb-3" />
                        <h3 className="text-base font-bold text-[#dfe2eb] mb-1">Collaborative Shared Notes</h3>
                        <p className="text-xs text-gray-400 max-w-sm">Select an existing note from the left sidebar or create a new note to start real-time editing.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
