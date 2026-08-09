import React from 'react';
import { Hash, Folder, Plus } from 'lucide-react';

export default function GlobalSidebar({ activeView, setActiveView }) {
    return (
        <aside className="w-[60px] h-full bg-[#0D1117] border-r border-[#30363d] shrink-0 flex flex-col items-center py-3 gap-2.5 hidden md:flex z-10 relative">
            <div 
                className="w-10 h-10 rounded-[14px] bg-[#262a31] flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200 overflow-hidden group shadow-md"
                onClick={() => setActiveView('server')}
                title="LAN Saturn Main Server"
            >
                <div className="w-full h-full bg-gradient-to-tr from-[#5865f2] to-[#a855f7] flex items-center justify-center font-black text-white text-xs">
                    LS
                </div>
            </div>
            <div className="w-6 h-[2px] bg-[#30363d] rounded-full my-0.5" />
            <div 
                className={`w-10 h-10 rounded-[20px] hover:rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative group ${activeView === 'server' ? 'bg-[#5865f2] text-white rounded-xl' : 'bg-[#181c22] text-gray-400 hover:bg-[#5865f2] hover:text-white'}`}
                onClick={() => setActiveView('server')}
                title="Channels"
            >
                <Hash size={18} />
            </div>
            <div 
                className={`w-10 h-10 rounded-[20px] hover:rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative group ${activeView === 'filebrowser' ? 'bg-[#5865f2] text-white rounded-xl' : 'bg-[#181c22] text-gray-400 hover:bg-[#5865f2] hover:text-white'}`}
                onClick={() => setActiveView('filebrowser')}
                title="File Browser"
            >
                <Folder size={18} />
            </div>
            <div 
                className="w-10 h-10 rounded-[20px] hover:rounded-xl bg-[#181c22] flex items-center justify-center cursor-pointer hover:bg-emerald-600 text-gray-400 hover:text-white transition-all duration-200 mt-auto"
                title="Add Channel"
            >
                <Plus size={18} />
            </div>
        </aside>
    );
}
