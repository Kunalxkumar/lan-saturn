import React from 'react';
import OnlineUsers from './OnlineUsers';
import Tasks from './Tasks';
import { Users } from 'lucide-react';

export default function RightPanel({ 
    users, 
    currentUsername, 
    channelTasks, 
    toggleTask, 
    deleteTask, 
    createTask,
    activeView
}) {
    if (activeView !== 'server' && activeView !== 'dm') {
        return null;
    }

    return (
        <aside className="w-64 bg-saturn-dark flex-none flex flex-col border-l border-saturn-light text-gray-300">
            <div className="h-16 px-4 flex items-center justify-between border-b border-saturn-light shrink-0">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-gray-400" />
                    <span className="font-bold text-sm text-gray-200">Members & Tasks</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col">
                <OnlineUsers users={users} currentUsername={currentUsername} />
                <div className="h-px bg-saturn-light mx-4 my-1 opacity-50" />
                <Tasks 
                    tasks={channelTasks} 
                    onToggle={toggleTask} 
                    onDelete={deleteTask} 
                    onCreate={createTask} 
                />
            </div>
        </aside>
    );
}
