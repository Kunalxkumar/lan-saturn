import React, { useEffect, useState } from 'react';
import { Wifi, Bluetooth, Link2 } from 'lucide-react';

export default function OnlineUsers({ users, currentUsername }) {
    const [peers, setPeers] = useState([]);
    const [connectingId, setConnectingId] = useState(null);

    useEffect(() => {
        const fetchPeers = async () => {
            try {
                const res = await fetch('/api/peers');
                const data = await res.json();
                if (data.success && Array.isArray(data.peers)) {
                    setPeers(data.peers);
                }
            } catch (err) {
                // ignore fetch errors
            }
        };

        fetchPeers();
        const interval = setInterval(fetchPeers, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async (peer) => {
        setConnectingId(peer.device_id);
        try {
            await fetch('/api/peers/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: peer.device_id, ip: peer.ip, port: peer.port })
            });
        } catch (err) {
            // ignore error
        } finally {
            setTimeout(() => setConnectingId(null), 1000);
        }
    };

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

            {peers.length > 0 && (
                <>
                    <div className="h-px bg-saturn-light my-1 opacity-50" />
                    <h3 className="section-title text-xs font-bold uppercase tracking-wider text-gray-400">Discovered Peers — {peers.length}</h3>
                    <div className="discovered-peers-list flex flex-col gap-1.5">
                        {peers.map((peer) => (
                            <div key={peer.device_id} className="peer-row flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-saturn-darker/60 hover:bg-white/5 transition-colors border border-white/5">
                                <div className="flex items-center gap-2 min-w-0">
                                    {peer.source === 'ble' ? (
                                        <Bluetooth size={14} className="text-blue-400 flex-shrink-0" />
                                    ) : (
                                        <Wifi size={14} className="text-emerald-400 flex-shrink-0" />
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-medium text-gray-200 truncate">{peer.name}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{peer.ip}:{peer.port}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleConnect(peer)}
                                    disabled={connectingId === peer.device_id}
                                    className="p-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs transition-colors flex items-center gap-1"
                                    title="Initiate pairing handshake"
                                >
                                    <Link2 size={12} />
                                    <span className="text-[10px]">{peer.trusted ? 'Trusted' : connectingId === peer.device_id ? '...' : 'Pair'}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
