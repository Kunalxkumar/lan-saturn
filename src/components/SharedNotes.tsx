import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Plus, 
    Trash2, 
    FileText, 
    Eye, 
    Edit3, 
    Columns, 
    Save, 
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface SharedNotesProps {
    socket: any;
    channel: string;
    username: string;
    onClose?: () => void;
}

export default function SharedNotes({ socket, channel, username }: SharedNotesProps) {
    const [notes, setNotes] = useState<string[]>([]);
    const [activeNote, setActiveNote] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [newNoteName, setNewNoteName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
    const [lastUpdater, setLastUpdater] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_notes', { channel });

        const onNotesList = (data: any) => {
            if (data.channel === channel) {
                setNotes(data.notes || []);
                if (data.notes && data.notes.length > 0 && !activeNote) {
                    selectNote(data.notes[0]);
                }
            }
        };

        const onNoteContent = (data: any) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setNoteContent(data.content);
            }
        };

        const onNoteUpdated = (data: any) => {
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
        };

        const onNoteDeleted = (data: any) => {
            if (data.channel === channel && data.noteName === activeNote) {
                setActiveNote('');
                setNoteContent('');
            }
        };

        socket.on('notes_list', onNotesList);
        socket.on('note_content', onNoteContent);
        socket.on('note_updated', onNoteUpdated);
        socket.on('note_deleted', onNoteDeleted);

        return () => {
            socket.off('notes_list', onNotesList);
            socket.off('note_content', onNoteContent);
            socket.off('note_updated', onNoteUpdated);
            socket.off('note_deleted', onNoteDeleted);
        };
    }, [socket, channel, activeNote]);

    const selectNote = (noteName: string) => {
        setActiveNote(noteName);
        setNoteContent('');
        setLastUpdater('');
        socket?.emit('get_note_content', { channel, noteName });
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNoteContent(val);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket?.emit('save_note', {
                channel,
                noteName: activeNote,
                content: val,
                username
            });
        }, 150);
    };

    const handleCreateNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoteName.trim()) return;
        socket?.emit('create_note', { channel, noteName: newNoteName.trim(), username });
        setActiveNote(newNoteName.trim());
        setNewNoteName('');
        setShowCreateForm(false);
    };

    const handleDeleteNote = (noteName: string) => {
        if (window.confirm(`Delete note "${noteName}"?`)) {
            socket?.emit('delete_note', { channel, noteName });
        }
    };

    const renderedMarkdown = useMemo(() => {
        if (!noteContent) return '';
        try {
            const parsed = marked.parse(noteContent, { async: false, breaks: true, gfm: true }) as string;
            return DOMPurify.sanitize(parsed);
        } catch {
            return noteContent;
        }
    }, [noteContent]);

    const wordCount = useMemo(() => {
        return noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0;
    }, [noteContent]);

    return (
        <div className="flex flex-1 h-full bg-[#080b11] text-slate-200 overflow-hidden select-none">
            {/* Left Notes List Sidebar */}
            <div className="w-64 bg-[#0c101a] border-r border-white/[0.07] flex flex-col p-3.5 shrink-0">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                            <FileText size={16} />
                        </div>
                        <span className="font-bold text-xs text-slate-100">
                            Channel Notes
                        </span>
                    </div>

                    <button 
                        className="btn-shimmer p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-sm"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        title="Create Note"
                    >
                        <Plus size={15} />
                    </button>
                </div>

                {showCreateForm && (
                    <form className="mb-3 flex flex-col gap-1.5" onSubmit={handleCreateNote}>
                        <input
                            type="text"
                            placeholder="Note title (e.g. Architecture.md)"
                            value={newNoteName}
                            onChange={e => setNewNoteName(e.target.value)}
                            maxLength={50}
                            className="w-full bg-[#121826] border border-white/10 focus:border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            className="btn-shimmer text-xs py-1 rounded-lg font-semibold cursor-pointer"
                        >
                            Save Note
                        </button>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                    {notes.length === 0 ? (
                        <div className="text-xs text-slate-500 italic text-center py-8 bg-white/[0.02] rounded-xl border border-white/5">
                            No notes in #{channel}. Click + to create one.
                        </div>
                    ) : (
                        notes.map(note => {
                            const isActive = activeNote === note;
                            return (
                                <div 
                                    key={note} 
                                    className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all cursor-pointer ${
                                        isActive 
                                            ? 'bg-sky-500/15 text-sky-200 border border-sky-500/30 font-semibold shadow-sm' 
                                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
                                    }`}
                                >
                                    <button 
                                        className="flex items-center gap-2 flex-1 truncate text-xs text-left cursor-pointer" 
                                        onClick={() => selectNote(note)}
                                    >
                                        <FileText size={13} className={isActive ? 'text-sky-400' : 'text-slate-500'} />
                                        <span className="truncate">{note}</span>
                                    </button>
                                    <button 
                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all rounded hover:bg-rose-500/10 cursor-pointer" 
                                        onClick={() => handleDeleteNote(note)}
                                        title="Delete note"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Note Editor / Preview Canvas */}
            <div className="flex-1 flex flex-col h-full bg-[#080b11] p-5 overflow-hidden">
                {activeNote ? (
                    <div className="flex flex-col h-full bg-[#0c101a] border border-white/[0.08] rounded-xl p-4 shadow-2xl overflow-hidden">
                        {/* Editor Header */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06] shrink-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-100 font-mono">
                                    {activeNote}
                                </h2>
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                    Live Sync
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {lastUpdater && (
                                    <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                                        Last edited by: @{lastUpdater}
                                    </span>
                                )}

                                {/* View Mode Selector */}
                                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/5 text-xs font-semibold">
                                    <button
                                        onClick={() => setViewMode('split')}
                                        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                            viewMode === 'split' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                        title="Split View"
                                    >
                                        <Columns size={12} />
                                        <span className="hidden sm:inline">Split</span>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('edit')}
                                        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                            viewMode === 'edit' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                        title="Editor Only"
                                    >
                                        <Edit3 size={12} />
                                        <span className="hidden sm:inline">Edit</span>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('preview')}
                                        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                            viewMode === 'preview' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                        title="Preview Only"
                                    >
                                        <Eye size={12} />
                                        <span className="hidden sm:inline">Preview</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Editor Panes */}
                        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                            {/* Raw Markdown Editor */}
                            {(viewMode === 'split' || viewMode === 'edit') && (
                                <div className="flex-1 flex flex-col h-full bg-[#101522] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                                    <div className="px-3 py-1.5 border-b border-white/5 bg-[#0e131f] flex items-center justify-between text-[11px] font-mono text-slate-400">
                                        <span>Markdown Input</span>
                                        <span>{wordCount} words</span>
                                    </div>
                                    <textarea
                                        ref={textareaRef}
                                        className="flex-1 w-full bg-transparent p-4 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none resize-none leading-relaxed custom-scrollbar"
                                        value={noteContent}
                                        onChange={handleTextChange}
                                        placeholder="# Start writing markdown notes..."
                                    />
                                </div>
                            )}

                            {/* Rendered Markdown Preview */}
                            {(viewMode === 'split' || viewMode === 'preview') && (
                                <div className="flex-1 flex flex-col h-full bg-[#101522] border border-white/10 rounded-xl overflow-hidden">
                                    <div className="px-3 py-1.5 border-b border-white/5 bg-[#0e131f] text-[11px] font-mono text-slate-400">
                                        <span>Live Rendered HTML</span>
                                    </div>
                                    <div 
                                        className="flex-1 overflow-y-auto p-5 text-xs text-slate-200 leading-relaxed custom-scrollbar prose prose-invert max-w-none [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h1]:border-b [&_h1]:border-white/10 [&_h1]:pb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-sky-300 [&_h3]:text-xs [&_h3]:font-bold [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_code]:bg-[#080b11] [&_code]:text-sky-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_pre]:bg-[#080b11] [&_pre]:border [&_pre]:border-white/10 [&_pre]:p-3 [&_pre]:rounded-lg"
                                        dangerouslySetInnerHTML={{ __html: renderedMarkdown || '<p class="text-slate-500 italic">Start typing to see live preview...</p>' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0c101a] border border-white/[0.08] rounded-xl shadow-xl">
                        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-sky-400 mb-3 shadow-inner">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-100 mb-1">
                            Collaborative Notes Canvas
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                            Real-time collaborative markdown scratchpad. Edits are synchronized across peer nodes automatically.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
