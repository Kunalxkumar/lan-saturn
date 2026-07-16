import React from 'react';
import { Search, Shield, Bell, Hash } from 'lucide-react';
import SmartSearch from "../SmartSearch";

export default function ChatHeader({ 
    activeView, 
    activeChannel, 
    title, 
    searchQuery, 
    setSearchQuery, 
    isEncrypted, 
    cryptoReady 
}) {
    if (activeView !== 'server' && activeView !== 'dm') {
        return null;
    }

    return (
        <header className="flex items-center justify-between px-4 py-3 bg-saturn-base border-b border-saturn-light shrink-0 min-h-[4rem]">
            <div className="flex items-center gap-3 min-w-0">
                <Hash size={24} className="text-gray-400 shrink-0" />
                <h1 className="font-semibold text-lg truncate">{activeChannel}</h1>
                <div className="w-px h-6 bg-gray-600 mx-2" />
                <p className="text-sm text-gray-400 truncate">{title}</p>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
                {isEncrypted && (
                    <div className={`flex items-center justify-center p-1.5 rounded-full transition-colors ${cryptoReady ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'}`} title={cryptoReady ? "E2EE Active" : "E2EE Initializing"}>
                        <Shield size={16} />
                    </div>
                )}
                
                <button className="text-gray-400 hover:text-gray-200 transition-colors" title="Notifications">
                    <Bell size={20} />
                </button>
                
                <div className="relative w-64">
                    <SmartSearch 
                        messages={[]} // Handled in App.tsx typically, or we move it here. For UI, we keep the component wrapper.
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </div>
            </div>
        </header>
    );
}
