import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    Lock, 
    Key, 
    Laptop, 
    Check, 
    X, 
    Copy, 
    ShieldCheck, 
    ShieldAlert, 
    Sparkles,
    Cpu,
    Radio
} from 'lucide-react';

interface SecurityPanelProps {
    socket: any;
    channel: string;
    username: string;
    encryptionPassphrase: string;
    setEncryptionPassphrase: (phrase: string) => void;
    cryptoReady: boolean;
}

export default function SecurityPanel({ 
    socket, 
    channel, 
    username, 
    encryptionPassphrase, 
    setEncryptionPassphrase, 
    cryptoReady 
}: SecurityPanelProps) {
    const [devices, setDevices] = useState<any[]>([]);
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [copiedInvite, setCopiedInvite] = useState(false);

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_device_list');

        const onDeviceList = (data: any) => {
            setDevices(data.devices || []);
        };

        const onInviteGen = (data: any) => {
            if (data.channel === channel) {
                setInviteCode(data.code);
                showStatus('One-time invite code generated');
            }
        };

        const onSecurityError = (data: any) => {
            showStatus(`Error: ${data.message}`);
        };

        socket.on('device_list_updated', onDeviceList);
        socket.on('invite_generated', onInviteGen);
        socket.on('security_error', onSecurityError);

        return () => {
            socket.off('device_list_updated', onDeviceList);
            socket.off('invite_generated', onInviteGen);
            socket.off('security_error', onSecurityError);
        };
    }, [socket, channel]);

    const showStatus = (msg: string) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleSetLock = () => {
        if (!socket) return;
        socket.emit('set_channel_lock', {
            channel,
            password,
            username
        });
        showStatus(password ? `Room #${channel} locked with password` : `Room #${channel} unlocked`);
        setPassword('');
    };

    const handleGenerateInvite = () => {
        if (!socket) return;
        socket.emit('generate_invite', { channel });
    };

    const handleToggleTrust = (device: any) => {
        if (!socket) return;
        socket.emit('update_device_trust', {
            ip: device.ip,
            userAgent: device.userAgent,
            trusted: !device.trusted
        });
    };

    const handleCopyInvite = () => {
        if (!inviteCode) return;
        navigator.clipboard?.writeText(inviteCode);
        setCopiedInvite(true);
        showStatus('Invite code copied');
        setTimeout(() => setCopiedInvite(false), 2000);
    };

    const cleanUserAgent = (ua: string) => {
        if (!ua) return 'LAN Saturn Desktop';
        if (ua.includes('Firefox')) return 'Firefox Client';
        if (ua.includes('Chrome')) return 'Chromium Client';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Client';
        if (ua.includes('Edge')) return 'Edge Client';
        return ua.substring(0, 30);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-200 p-6 overflow-y-auto custom-scrollbar select-none">
            <div className="max-w-4xl mx-auto w-full space-y-5 pb-8">
                {statusMessage && (
                    <div className="bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono px-4 py-2 rounded-xl flex items-center gap-2 animate-fadeIn shadow-sm">
                        <Sparkles size={14} className="text-sky-400 shrink-0" />
                        <span>{statusMessage}</span>
                    </div>
                )}

                {/* E2EE Custom Key Manager */}
                <div className="spotlight-card rounded-xl p-5 border border-white/[0.08] bg-[#0c101a]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-100">
                                    Libsodium Stream Encryption (XSalsa20-Poly1305)
                                </h3>
                                <p className="text-[11px] font-mono text-slate-400">
                                    Local P2P payload encryption with Argon2id key derivation
                                </p>
                            </div>
                        </div>

                        <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                            cryptoReady 
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cryptoReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            {cryptoReady ? 'CRYPTO READY' : 'INITIALIZING'}
                        </span>
                    </div>

                    <p className="text-xs text-slate-400 my-3 leading-relaxed">
                        Messages and file transfers are encrypted in memory before traversing the local network. Set a shared secret passphrase with peers in this room to isolate communications.
                    </p>

                    <div className="flex items-center gap-2.5">
                        <input
                            type="password"
                            placeholder="Set custom shared encryption passphrase..."
                            value={encryptionPassphrase === 'LAN-SATURN-DEFAULT-KEY' ? '' : encryptionPassphrase}
                            onChange={e => setEncryptionPassphrase(e.target.value || 'LAN-SATURN-DEFAULT-KEY')}
                            className="flex-1 bg-[#121826] border border-white/10 focus:border-sky-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setEncryptionPassphrase('LAN-SATURN-DEFAULT-KEY');
                                showStatus('Reset to default room key');
                            }}
                            className="btn-secondary text-xs px-3 py-2 rounded-xl cursor-pointer font-medium"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Channel Lockdown */}
                <div className="spotlight-card rounded-xl p-5 border border-white/[0.08] bg-[#0c101a]">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                            <Lock size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-100">
                                Room Lock & Access Control (#{channel})
                            </h3>
                            <p className="text-[11px] font-mono text-slate-400">
                                Require credentials before allowing joining peers into this channel
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 my-3 leading-relaxed">
                        Locking this channel requires joining peers to enter a room password or a valid 6-character invite code. Leave blank and click "Update Lock" to make this room public.
                    </p>

                    <div className="flex items-center gap-2.5">
                        <input
                            type="password"
                            placeholder="Set new room password (leave empty to open)..."
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="flex-1 bg-[#121826] border border-white/10 focus:border-sky-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono transition-all"
                        />
                        <button 
                            onClick={handleSetLock}
                            className="btn-shimmer text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
                        >
                            Update Lock
                        </button>
                    </div>
                </div>

                {/* Invite Code Generator */}
                <div className="spotlight-card rounded-xl p-5 border border-white/[0.08] bg-[#0c101a]">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
                            <Key size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-100">
                                Generate 1-Time Room Invite
                            </h3>
                            <p className="text-[11px] font-mono text-slate-400">
                                Issues an ephemeral 6-digit access code for #{channel}
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 my-3 leading-relaxed">
                        Peers can use this code to bypass the room password once.
                    </p>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleGenerateInvite}
                            className="btn-shimmer text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
                        >
                            Generate Code
                        </button>

                        {inviteCode && (
                            <div className="flex items-center gap-2 bg-[#121826] border border-emerald-500/40 px-3 py-1.5 rounded-xl shadow-sm">
                                <span className="text-xs font-mono text-emerald-400 font-bold tracking-widest">{inviteCode}</span>
                                <button 
                                    onClick={handleCopyInvite} 
                                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    title="Copy Code"
                                >
                                    {copiedInvite ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Connected Devices Table */}
                <div className="spotlight-card rounded-xl p-5 border border-white/[0.08] bg-[#0c101a]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                                <Laptop size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-100">
                                    Authorized Peer Nodes
                                </h3>
                                <p className="text-[11px] font-mono text-slate-400">
                                    Trusted devices allowed to download and stream files
                                </p>
                            </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                            {devices.length} Nodes
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-[#121826] text-slate-400 font-mono text-[10px] uppercase border-b border-white/[0.06]">
                                <tr>
                                    <th className="p-3">IP Address</th>
                                    <th className="p-3">Client Host</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.05] bg-[#0e131f]/60 font-mono text-xs">
                                {devices.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-500 italic font-sans">
                                            No remote peer nodes registered on this instance yet.
                                        </td>
                                    </tr>
                                ) : (
                                    devices.map((device, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="p-3 text-sky-300 font-semibold">{device.ip}</td>
                                            <td className="p-3 text-slate-300 font-sans">{cleanUserAgent(device.userAgent)}</td>
                                            <td className="p-3">
                                                {device.trusted ? (
                                                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[10px] border border-emerald-500/20">
                                                        Trusted
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md text-[10px] border border-amber-500/20">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-sans">
                                                <button 
                                                    onClick={() => handleToggleTrust(device)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                        device.trusted 
                                                            ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30' 
                                                            : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                                    }`}
                                                >
                                                    {device.trusted ? 'Revoke' : 'Trust'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
