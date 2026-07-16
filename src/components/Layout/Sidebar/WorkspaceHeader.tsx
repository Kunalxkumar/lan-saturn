import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function WorkspaceHeader({ connectionStatus }) {
    return (
        <div className="workspace-header">
            <div className="workspace-info">
                <div className="workspace-logo">LS</div>
                <div className="workspace-details">
                    <h2 className="workspace-name">LAN Saturn</h2>
                    <div className={`workspace-status ${connectionStatus}`}>
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
