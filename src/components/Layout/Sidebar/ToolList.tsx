import React from 'react';
import { BookOpen, Globe, Clipboard, Calendar as CalendarIcon, Shield, FolderClock } from 'lucide-react';

const TOOLS = [
    { id: 'notes', label: 'Notes', icon: BookOpen },
    { id: 'filebrowser', label: 'Browser', icon: Globe },
    { id: 'clipboardsync', label: 'Clipboard', icon: Clipboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'security', label: 'Security', icon: Shield }
];

export default function ToolList({ activeView, setActiveView }) {
    return (
        <div className="sidebar-section px-4 py-3 flex flex-col gap-2">
            <h3 className="sidebar-section-label text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Tools</h3>
            <div className="tool-grid flex flex-col gap-1">
                {TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeView === tool.id;
                    return (
                        <button
                            key={tool.id}
                            className={`tool-card flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                                isActive 
                                    ? 'active bg-indigo-600/20 text-indigo-400 font-semibold' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                            onClick={() => setActiveView(tool.id)}
                        >
                            <Icon size={18} className="tool-icon flex-shrink-0 text-indigo-400" />
                            <span className="tool-label flex-1 truncate">{tool.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
