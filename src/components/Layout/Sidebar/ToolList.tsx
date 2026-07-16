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
        <div className="sidebar-section">
            <h3 className="sidebar-section-label">Tools</h3>
            <div className="tool-grid">
                {TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeView === tool.id;
                    return (
                        <button
                            key={tool.id}
                            className={`tool-card ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveView(tool.id)}
                        >
                            <Icon size={20} className="tool-icon" />
                            <span className="tool-label">{tool.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
