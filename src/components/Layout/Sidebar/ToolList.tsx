import React from 'react';
import { 
    FileText, 
    HardDrive, 
    ClipboardCheck, 
    CalendarDays, 
    ShieldAlert,
    Cpu
} from 'lucide-react';

interface ToolListProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

const TOOLS = [
    { id: 'notes', label: 'Notes', icon: FileText, badge: 'MD' },
    { id: 'filebrowser', label: 'File Drive', icon: HardDrive, badge: 'LAN' },
    { id: 'clipboardsync', label: 'Clipboard', icon: ClipboardCheck, badge: 'Live' },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, badge: '' },
    { id: 'security', label: 'Security & E2EE', icon: ShieldAlert, badge: 'Key' }
];

export default function ToolList({ activeView, setActiveView }: ToolListProps) {
    return (
        <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-2">
                <span>Modules</span>
                <Cpu size={12} className="text-slate-400" />
            </div>

            <div className="space-y-0.5">
                {TOOLS.map(({ id, label, icon: Icon, badge }) => {
                    const isActive = activeView === id;
                    return (
                        <button
                            key={id}
                            className={`flex items-center justify-between w-full rounded-lg px-2.5 py-1.5 text-xs transition-all text-left group relative cursor-pointer ${
                                isActive 
                                    ? 'bg-sky-500/15 text-sky-300 font-medium border border-sky-500/25 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                            }`}
                            onClick={() => setActiveView(id)}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                {isActive && (
                                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-sky-400 rounded-r-full shadow-sm shadow-sky-400/50" />
                                )}
                                <Icon 
                                    size={14} 
                                    className={`shrink-0 transition-transform group-hover:scale-110 ${
                                        isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'
                                    }`} 
                                />
                                <span className="truncate">{label}</span>
                            </div>

                            {badge && (
                                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
                                    isActive
                                        ? 'bg-sky-400/20 text-sky-300 border-sky-400/30'
                                        : 'bg-white/[0.04] text-slate-400 border-white/5'
                                }`}>
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
