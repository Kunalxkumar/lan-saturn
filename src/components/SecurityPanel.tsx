import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, Laptop, Check, X, Copy } from 'lucide-react';

export default function SecurityPanel({ socket, channel, username, encryptionPassphrase, setEncryptionPassphrase, cryptoReady }) {
    const [devices, setDevices] = useState([]);
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_device_list');

        socket.on('device_list_updated', (data) => {
            setDevices(data.devices || []);
        });

        socket.on('invite_generated', (data) => {
            if (data.channel === channel) {
                setInviteCode(data.code);
                showStatus('Invite code generated');
            }
        });

        socket.on('security_error', (data) => {
            showStatus(`Error: ${data.message}`);
        });

        return () => {
            socket.off('device_list_updated');
            socket.off('invite_generated');
            socket.off('security_error');
        };
    }, [socket, channel]);

    const showStatus = (msg) => {
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
        showStatus(password ? 'Channel locked' : 'Channel unlocked');
        setPassword('');
    };

    const handleGenerateInvite = () => {
        if (!socket) return;
        socket.emit('generate_invite', { channel });
    };

    const handleToggleTrust = (device) => {
        if (!socket) return;
        socket.emit('update_device_trust', {
            ip: device.ip,
            userAgent: device.userAgent,
            trusted: !device.trusted
        });
    };

    const cleanUserAgent = (ua) => {
        if (!ua) return 'Unknown Browser';
        if (ua.includes('Firefox')) return 'Firefox Browser';
        if (ua.includes('Chrome')) return 'Chrome Browser';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser';
        if (ua.includes('Edge')) return 'Edge Browser';
        return ua.substring(0, 25) + '...';
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0D1117] text-[#dfe2eb] p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6">
                {statusMessage && (
                    <div className="bg-[#5865f2]/20 border border-[#5865f2] text-indigo-300 text-xs font-mono px-4 py-2 rounded-xl animate-pulse">
                        {statusMessage}
                    </div>
                )}

                {/* E2EE Custom Key Manager */}
                <div className="bg-[#10141a] border border-[#30363d] rounded-xl p-5 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield size={20} className="text-emerald-400" />
                        <h3 className="font-bold text-sm text-[#dfe2eb]">End-to-End Encryption (E2EE)</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                        Traffic across LAN is encrypted end-to-end. You can configure a custom passphrase for maximum privacy.
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            type="password"
                            placeholder="Custom E2EE Passphrase..."
                            value={encryptionPassphrase === 'LAN-SATURN-DEFAULT-KEY' ? '' : encryptionPassphrase}
                            onChange={e => setEncryptionPassphrase(e.target.value || 'LAN-SATURN-DEFAULT-KEY')}
                            className="flex-1 bg-[#181c22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-[#dfe2eb] outline-none focus:border-[#5865f2]"
                        />
                        <span className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 ${cryptoReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                            {cryptoReady ? 'Active ✅' : 'Initializing...'}
                        </span>
                    </div>
                </div>

                {/* Channel Lockdown */}
                <div className="bg-[#10141a] border border-[#30363d] rounded-xl p-5 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Lock size={20} className="text-amber-400" />
                        <h3 className="font-bold text-sm text-[#dfe2eb]">Channel Lockdown (#{channel})</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                        Lock this channel with a password. Joining users will require the password or a valid invite code.
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            type="password"
                            placeholder="Set Channel Password (leave blank to unlock)..."
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="flex-1 bg-[#181c22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-[#dfe2eb] outline-none focus:border-[#5865f2]"
                        />
                        <button 
                            onClick={handleSetLock}
                            className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                            Update Lock
                        </button>
                    </div>
                </div>

                {/* Invite Code Generator */}
                <div className="bg-[#10141a] border border-[#30363d] rounded-xl p-5 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Key size={20} className="text-indigo-400" />
                        <h3 className="font-bold text-sm text-[#dfe2eb]">Generate Channel Invite Code</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                        Generate a 1-time access invite code for users to join locked channels.
                    </p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleGenerateInvite}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                            Generate Invite
                        </button>
                        {inviteCode && (
                            <div className="flex items-center gap-2 bg-[#181c22] border border-emerald-500/40 px-3 py-1.5 rounded-lg">
                                <span className="text-xs font-mono text-emerald-400 font-bold">{inviteCode}</span>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(inviteCode)} 
                                    className="text-gray-400 hover:text-white"
                                    title="Copy Code"
                                >
                                    <Copy size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Connected Devices Table */}
                <div className="bg-[#10141a] border border-[#30363d] rounded-xl p-5 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <Laptop size={20} className="text-cyan-400" />
                        <h3 className="font-bold text-sm text-[#dfe2eb]">Connected LAN Devices</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-300">
                            <thead className="bg-[#181c22] text-gray-400 font-mono text-[11px] uppercase">
                                <tr>
                                    <th className="p-2.5 rounded-l-lg">IP Address</th>
                                    <th className="p-2.5">User Agent</th>
                                    <th className="p-2.5">Status</th>
                                    <th className="p-2.5 rounded-r-lg text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363d]">
                                {devices.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-6 text-gray-500 italic">No devices found.</td>
                                    </tr>
                                ) : (
                                    devices.map((device, idx) => (
                                        <tr key={idx} className="hover:bg-[#181c22]/50 transition-colors">
                                            <td className="p-2.5 font-mono text-indigo-300 font-semibold">{device.ip}</td>
                                            <td className="p-2.5">{cleanUserAgent(device.userAgent)}</td>
                                            <td className="p-2.5">
                                                {device.trusted ? (
                                                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono text-[10px] border border-emerald-500/20">Trusted</span>
                                                ) : (
                                                    <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-mono text-[10px] border border-amber-500/20">Untrusted</span>
                                                )}
                                            </td>
                                            <td className="p-2.5 text-right">
                                                <button 
                                                    onClick={() => handleToggleTrust(device)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${device.trusted ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40'}`}
                                                >
                                                    {device.trusted ? 'Revoke Trust' : 'Trust Device'}
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
