import React, { useState } from 'react';
import OnlineUsers from './OnlineUsers';
import Tasks from './Tasks';
import { Users, CheckSquare, X, Wifi } from 'lucide-react';
import { useUIStore } from '../../../store/appStore';

interface RightPanelProps {
    users: any[];
    currentUsername: string;
    channelTasks: any[];
    toggleTask: (id: any) => void;
    deleteTask: (id: any) => void;
    createTask: (text: string) => void;
    activeView: string;
}

export default function RightPanel({ 
    users, 
    currentUsername, 
    channelTasks, 
    toggleTask, 
    deleteTask, 
    createTask,
    activeView
}: RightPanelProps) {
    const { isRightPanelOpen, setIsRightPanelOpen } = useUIStore();
    const [activeTab, setActiveTab] = useState<'members' | 'tasks'>('members');

    if (activeView !== 'server' && activeView !== 'dm') {
        return null;
    }

    if (!isRightPanelOpen) {
        return null;
    }

    const taskCount = channelTasks.filter(t => !t.done).length;

    return (
        <aside className="w-68 bg-[#0b0e15] border-l border-white/[0.07] shrink-0 flex flex-col h-full z-20 select-none">
            {/* Header with Segmented Tabs (React Bits style) */}
            <div className="h-12 px-3 flex items-center justify-between border-b border-white/[0.06] shrink-0 bg-[#0d111a]/60">
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'members'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Users size={13} />
                        <span>Peers</span>
                        <span className="text-[10px] font-mono opacity-70">({users.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'tasks'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <CheckSquare size={13} />
                        <span>Tasks</span>
                        {taskCount > 0 && (
                            <span className="text-[9px] font-mono px-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                {taskCount}
                            </span>
                        )}
                    </button>
                </div>

                <button 
                    onClick={() => setIsRightPanelOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Close Sidebar"
                >
                    <X size={15} />
                </button>
            </div>
            
            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'members' ? (
                    <OnlineUsers users={users} currentUsername={currentUsername} />
                ) : (
                    <Tasks 
                        tasks={channelTasks} 
                        onToggle={toggleTask} 
                        onDelete={deleteTask} 
                        onCreate={createTask} 
                    />
                )}
            </div>
        </aside>
    );
}
