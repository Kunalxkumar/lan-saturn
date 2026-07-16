import React, { useState, useEffect } from 'react';

export default function SecurityPanel({ socket, channel, username, encryptionPassphrase, setEncryptionPassphrase, cryptoReady }) {
    const [devices, setDevices] = useState([]);
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!socket) return;

        // Fetch connected devices on mount
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
        if (ua.includes('Postman')) return 'Postman client';
        return ua.substring(0, 30) + '...';
    };

    return (
        <div className="security-panel-container">
            <div className="security-section">
                <h3>🔐 End-to-End Encryption</h3>
                <p className="security-desc">Traffic over the LAN is encrypted. You can set a custom key for maximum privacy. If left empty, a default fallback key is used.</p>
                <div className="lock-input-group">
                    <input
                        type="password"
                        placeholder="Custom E2EE Passphrase..."
                        value={encryptionPassphrase === 'LAN-SATURN-DEFAULT-KEY' ? '' : encryptionPassphrase}
                        onChange={e => setEncryptionPassphrase(e.target.value || 'LAN-SATURN-DEFAULT-KEY')}
                        className="security-input"
                    />
                    <span className="security-btn" style={{ background: cryptoReady ? 'rgba(35, 165, 89, 0.16)' : 'rgba(255,255,255,0.1)', color: cryptoReady ? '#5be285' : '#fff', display: 'flex', alignItems: 'center' }}>
                        {cryptoReady ? 'Active ✅' : 'Initializing...'}
                    </span>
                </div>
            </div>

            <div className="security-section">
                <h3>🔒 Channel Lockdown ({channel})</h3>
                <p className="security-desc">Lock this channel with a password. Users joining will need to provide the password or an invite code.</p>
                <div className="lock-input-group">
                    <input
                        type="password"
                        placeholder="Enter password..."
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="security-input"
                    />
                    <button onClick={handleSetLock} className="security-btn lock-btn">
                        Set Password
                    </button>
                    <button onClick={() => { setPassword(''); socket.emit('set_channel_lock', { channel, password: '', username }); }} className="security-btn unlock-btn">
                        Unlock Channel
                    </button>
                </div>
            </div>

            <div className="security-section">
                <h3>🎟️ Access Invites</h3>
                <p className="security-desc">Generate a temporary invite code for this channel. Users with this code bypass password protection checks.</p>
                <div className="invite-actions">
                    <button onClick={handleGenerateInvite} className="security-btn invite-btn">
                        Generate Invite Code
                    </button>
                    {inviteCode && (
                        <div className="invite-code-display">
                            Code: <span className="invite-code-val">{inviteCode}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="security-section devices-section">
                <h3>🖥️ Connected LAN Devices</h3>
                <p className="security-desc">Authorize or block devices on the local network. Untrusted devices cannot transmit messages or files.</p>
                <div className="device-table-container">
                    <table className="devices-table">
                        <thead>
                            <tr>
                                <th>IP Address</th>
                                <th>Device Browser</th>
                                <th>Permission</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="empty-devices">No device history. Connect a peer to list them.</td>
                                </tr>
                            ) : (
                                devices.map((dev, idx) => (
                                    <tr key={idx} className={dev.trusted ? 'device-trusted' : 'device-untrusted'}>
                                        <td className="ip-td">📡 {dev.ip}</td>
                                        <td className="ua-td" title={dev.userAgent}>{cleanUserAgent(dev.userAgent)}</td>
                                        <td>
                                            <button 
                                                onClick={() => handleToggleTrust(dev)} 
                                                className={`security-btn trust-toggle-btn ${dev.trusted ? 'btn-revoke' : 'btn-approve'}`}
                                            >
                                                {dev.trusted ? 'Revoke Trust' : 'Approve Device'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {statusMessage && <div className="security-toast">{statusMessage}</div>}
        </div>
    );
}
