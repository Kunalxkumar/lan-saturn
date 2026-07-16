import React from 'react';
import OnlineUsers from './OnlineUsers';
import Tasks from './Tasks';

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
            <OnlineUsers users={users} currentUsername={currentUsername} />
            <Tasks 
                tasks={channelTasks} 
                onToggle={toggleTask} 
                onDelete={deleteTask} 
                onCreate={createTask} 
            />
        </aside>
    );
}
