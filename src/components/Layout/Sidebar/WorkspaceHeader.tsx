import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function WorkspaceHeader({ connectionStatus }) {
    return (
        <div className="workspace-header p-4 flex items-center justify-between border-b border-saturn-light/50">
            <div className="workspace-info flex items-center gap-3">
                <div className="workspace-logo w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg text-sm">LS</div>
                <div className="workspace-details flex flex-col">
                    <h2 className="workspace-name text-base font-bold text-gray-100 leading-tight">LAN Saturn</h2>
                    <div className={`workspace-status text-xs flex items-center gap-1 mt-0.5 ${connectionStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {connectionStatus === 'connected' ? (
                            <><Wifi size={12} /> Connected</>
                        ) : (
                            <><WifiOff size={12} /> Offline</>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
