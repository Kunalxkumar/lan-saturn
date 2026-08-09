import React from 'react';
import { BookOpen, Globe, Clipboard, Calendar as CalendarIcon, Shield } from 'lucide-react';

const TOOLS = [
    { id: 'notes', label: 'Notes', Icon: BookOpen },
    { id: 'filebrowser', label: 'Browser', Icon: Globe },
    { id: 'clipboardsync', label: 'Clipboard', Icon: Clipboard },
    { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
    { id: 'security', label: 'Security', Icon: Shield }
];

export default function ToolList({ activeView, setActiveView }) {
    return (
        <div className="mt-4">
            <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-2">Tools</div>
            <div className="space-y-0.5">
                {TOOLS.map(({ id, label, Icon }) => {
                    const isActive = activeView === id;
                    return (
                        <button
                            key={id}
                            className={`flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs transition-all text-left ${
                                isActive 
                                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                            onClick={() => setActiveView(id)}
                        >
                            <Icon size={15} className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                            <span className="truncate">{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
