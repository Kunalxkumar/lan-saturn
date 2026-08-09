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
        <header className="h-16 px-4 flex items-center justify-between bg-saturn-base border-b border-saturn-light shrink-0">
            <div className="flex items-center gap-3 min-w-0">
                <Hash size={20} className="text-gray-400 shrink-0" />
                <h1 className="font-bold text-base text-gray-100 truncate">{activeChannel}</h1>
                <div className="w-px h-5 bg-saturn-light mx-1 shrink-0" />
                <p className="text-xs text-gray-400 truncate hidden sm:block">{title}</p>
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
                
                <div className="relative">
                    <SmartSearch 
                        messages={[]}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </div>
            </div>
        </header>
    );
}
