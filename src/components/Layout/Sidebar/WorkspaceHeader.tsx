import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function WorkspaceHeader({ connectionStatus }) {
    return (
        <div className="workspace-header h-16 px-4 flex items-center justify-between border-b border-saturn-light shrink-0">
            <div className="workspace-info flex items-center gap-3">
                <div className="workspace-logo w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md text-xs">LS</div>
                <div className="workspace-details flex flex-col">
                    <h2 className="workspace-name text-sm font-bold text-gray-100 leading-tight">LAN Saturn</h2>
                    <div className={`workspace-status text-[11px] flex items-center gap-1 ${connectionStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {connectionStatus === 'connected' ? (
                            <><Wifi size={11} /> Connected</>
                        ) : (
                            <><WifiOff size={11} /> Offline</>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
