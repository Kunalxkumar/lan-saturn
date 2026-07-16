import React from 'react';

export default function JoinChannelModal({
    joiningChannel,
    joinPassword,
    setJoinPassword,
    joinInvite,
    setJoinInvite,
    setJoiningChannel,
    setActiveChannel,
    handleJoinConfirm
}) {
    if (!joiningChannel) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content poll-modal">
                <h2 className="modal-title" style={{ color: 'var(--text-normal)', marginBottom: '10px' }}>
                    🔒 Private Room: #{joiningChannel}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Enter this room's lock password or a valid invite code to unlock entry.
                </p>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Password</label>
                    <input type="password" placeholder="Room password..." value={joinPassword} onChange={e => setJoinPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-normal)' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Or Invite Code</label>
                    <input type="text" placeholder="6-character code..." value={joinInvite} onChange={e => setJoinInvite(e.target.value.toUpperCase())} maxLength={6} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-normal)', textTransform: 'uppercase', letterSpacing: '1px' }} />
                </div>
                <div className="modal-actions">
                    <button className="modal-cancel" onClick={() => { setJoiningChannel(null); setActiveChannel('general'); }}>Cancel</button>
                    <button className="modal-submit" onClick={handleJoinConfirm}>Unlock & Join</button>
                </div>
            </div>
        </div>
    );
}
