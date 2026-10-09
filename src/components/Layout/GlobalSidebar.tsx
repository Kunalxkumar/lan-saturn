import React from 'react';
import { 
    Hash, 
    FolderGit2, 
    FileText, 
    Calendar, 
    Clipboard, 
    ShieldAlert, 
    Plus,
    Layers
} from 'lucide-react';

interface GlobalSidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

export default function GlobalSidebar({ activeView, setActiveView }: GlobalSidebarProps) {
    const navItems = [
        { id: 'server', label: 'Chat Channels', icon: Hash },
        { id: 'filebrowser', label: 'LAN File Share', icon: FolderGit2 },
        { id: 'notes', label: 'Collaborative Notes', icon: FileText },
        { id: 'calendar', label: 'Shared Calendar', icon: Calendar },
        { id: 'clipboardsync', label: 'Clipboard Sync', icon: Clipboard },
        { id: 'security', label: 'Security & E2EE', icon: ShieldAlert },
    ];

    return (
        <aside className="w-[58px] h-full bg-[#080b11] border-r border-white/[0.07] shrink-0 flex flex-col items-center py-3 gap-2 hidden md:flex z-20 select-none">
            {/* Top Workspace Icon */}
            <button 
                onClick={() => setActiveView('server')}
                className="relative group flex items-center justify-center p-1"
                title="Workspace: Saturn Hub"
            >
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:text-white group-hover:bg-sky-500/25 transition-all shadow-sm">
                    <Layers size={18} />
                </div>
                {/* Active Indicator bar on left */}
                {activeView === 'server' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sky-400 rounded-r-full shadow-sm shadow-sky-400/50" />
                )}
            </button>

            <div className="w-6 h-px bg-white/10 my-1" />

            {/* Navigation Icons Dock */}
            <div className="flex flex-col items-center gap-1.5 w-full px-2">
                {navItems.map(({ id, label, icon: Icon }) => {
                    const isActive = activeView === id;
                    return (
                        <div key={id} className="relative group flex items-center justify-center w-full">
                            <button
                                onClick={() => setActiveView(id)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative cursor-pointer ${
                                    isActive
                                        ? 'bg-sky-500/15 text-sky-400 shadow-sm border border-sky-500/30 font-semibold'
                                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-transparent'
                                }`}
                                title={label}
                            >
                                <Icon size={18} />
                            </button>

                            {/* Active Dock Indicator */}
                            {isActive && (
                                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-sky-400 rounded-r-full" />
                            )}

                            {/* Tooltip */}
                            <div className="absolute left-14 bg-[#141b29] text-slate-200 text-xs px-2.5 py-1 rounded-md border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap font-medium">
                                {label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Add Channel */}
            <div className="mt-auto relative group flex items-center justify-center">
                <button
                    onClick={() => setActiveView('server')}
                    className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/[0.08] hover:border-emerald-500/30 flex items-center justify-center transition-all duration-200 group-hover:rotate-90 cursor-pointer"
                    title="Channels & Rooms"
                >
                    <Plus size={18} />
                </button>
            </div>
        </aside>
    );
}
