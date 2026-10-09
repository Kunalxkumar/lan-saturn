import React, { useEffect, useState } from 'react';
import { Wifi, Bluetooth, Link2, MessageSquare, Check, Radio } from 'lucide-react';
import { useAppStore } from '../../../store/appStore';

interface OnlineUsersProps {
    users: any[];
    currentUsername: string;
}

export default function OnlineUsers({ users, currentUsername }: OnlineUsersProps) {
    const [peers, setPeers] = useState<any[]>([]);
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const { setActiveDmUser, setActiveView } = useAppStore();

    useEffect(() => {
        let isMounted = true;
        const fetchPeers = async () => {
            try {
                const res = await fetch('/api/peers');
                const data = await res.json();
                if (isMounted && data.success && Array.isArray(data.peers)) {
                    setPeers(data.peers);
                }
            } catch (err) {
                // Silently handle offline/error
            }
        };

        fetchPeers();
        const interval = setInterval(fetchPeers, 6000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const handleConnect = async (peer: any) => {
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

    const handleStartDm = (username: string) => {
        if (username !== currentUsername && username !== 'Anonymous') {
            setActiveDmUser(username);
            setActiveView('dm');
        }
    };

    return (
        <div className="p-3 flex flex-col gap-4">
            {/* Active LAN Channel Members */}
            <div>
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    <span>Channel Members</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {users.length} Active
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    {users.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-3 text-center bg-white/[0.02] rounded-lg border border-white/5">
                            No other users online
                        </div>
                    ) : (
                        users.map((user, idx) => {
                            const isMe = user === currentUsername;
                            return (
                                <div 
                                    key={`${user}_${idx}`} 
                                    className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all cursor-pointer border border-transparent hover:border-white/5"
                                    onClick={() => !isMe && handleStartDm(user)}
                                    title={!isMe ? `Direct Message @${user}` : 'Your Account'}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="relative shrink-0">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-800 text-sky-300 font-bold flex items-center justify-center text-xs border border-white/10 group-hover:border-sky-500/30 transition-colors">
                                                {user ? user.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0b0e15]" />
                                        </div>

                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                                                {user}
                                            </span>
                                            {isMe && (
                                                <span className="text-[9px] font-mono bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-bold">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {!isMe && (
                                        <button 
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-sky-300 hover:bg-white/10 transition-all cursor-pointer"
                                            title="Direct Message"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartDm(user);
                                            }}
                                        >
                                            <MessageSquare size={13} />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Discovered LAN / BLE Mesh Peers */}
            {peers.length > 0 && (
                <div className="pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                        <span>Discovered Peers</span>
                        <span className="text-[10px] text-sky-400 font-mono">
                            {peers.length}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {peers.map((peer) => (
                            <div 
                                key={peer.device_id} 
                                className="spotlight-card p-2 rounded-lg flex items-center justify-between gap-2"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="p-1.5 rounded-md bg-white/[0.04] text-slate-300 shrink-0">
                                        {peer.source === 'ble' ? (
                                            <Bluetooth size={14} className="text-blue-400" />
                                        ) : (
                                            <Wifi size={14} className="text-emerald-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-semibold text-slate-200 truncate">
                                            {peer.name || 'Unnamed Peer'}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400 truncate">
                                            {peer.ip}:{peer.port}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleConnect(peer)}
                                    disabled={connectingId === peer.device_id}
                                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                                        peer.trusted
                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                            : 'btn-secondary'
                                    }`}
                                    title="Connect peer"
                                >
                                    {peer.trusted ? (
                                        <>
                                            <Check size={11} />
                                            <span>Trusted</span>
                                        </>
                                    ) : (
                                        <>
                                            <Link2 size={11} />
                                            <span>{connectingId === peer.device_id ? 'Pairing...' : 'Pair'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
