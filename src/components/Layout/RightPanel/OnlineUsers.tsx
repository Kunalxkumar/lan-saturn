import React from 'react';

export default function OnlineUsers({ users, currentUsername }) {
    return (
        <div className="right-sidebar-section p-4 flex flex-col gap-3">
            <h3 className="section-title text-xs font-bold uppercase tracking-wider text-gray-400">Online — {users.length}</h3>
            <div className="online-users-list flex flex-col gap-1">
                {users.length === 0 ? (
                    <div className="empty-state text-xs text-gray-500 italic py-2">No users online</div>
                ) : (
                    users.map((user, idx) => (
                        <div key={`${user}_${idx}`} className="user-row flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="user-avatar-wrapper small relative flex-shrink-0">
                                <div className="user-avatar w-7 h-7 rounded-full bg-slate-700 text-indigo-300 font-bold flex items-center justify-center text-xs">
                                    {user.charAt(0).toUpperCase()}
                                </div>
                                <div className="status-badge online absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-saturn-dark"></div>
                            </div>
                            <div className="user-name-container flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="user-name text-xs font-medium text-gray-200 truncate">{user}</span>
                                {user === currentUsername && <span className="you-badge text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-semibold">You</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
