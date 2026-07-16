import React, { useState, useEffect } from 'react';
import { readClipboardText, writeClipboardText, watchClipboard, isTauri } from '../lib/clipboard';

/**
 * ClipboardSync - Syncs clipboard contents across computers on LAN.
 */
export default function ClipboardSync({ socket, username }) {
    const [isEnabled, setIsEnabled] = useState(false);
    const [history, setHistory] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!socket) return;

        // Fetch existing history on mount
        socket.emit('get_clipboard_history');

        socket.on('clipboard_history_list', (data) => {
            setHistory(data.history || []);
        });

        socket.on('clipboard_updated', (data) => {
            setHistory(prev => {
                // Avoid duplicates
                if (prev.length > 0 && prev[0].text === data.text) return prev;
                const updated = [
                    {
                        id: `cb_${Date.now()}`,
                        text: data.text,
                        username: data.username,
                        timestamp: Date.now() / 1000
                    },
                    ...prev
                ];
                return updated.slice(0, 20);
            });

            // If sync is enabled, automatically write the received text to local clipboard
            if (isEnabled) {
                writeClipboardText(data.text);
                showStatus(`Synced from ${data.username}`);
            }
        });

        return () => {
            socket.off('clipboard_history_list');
            socket.off('clipboard_updated');
        };
    }, [socket, isEnabled]);

    // Clipboard watcher effect (active when sync is enabled)
    useEffect(() => {
        if (!isEnabled || !socket) return;

        // Start watching local clipboard
        const stopWatch = watchClipboard((text) => {
            // Send local clipboard updates to LAN
            socket.emit('clipboard_sync', {
                text,
                username
            });
            showStatus('Clipboard shared');
        });

        return () => {
            stopWatch();
        };
    }, [isEnabled, socket, username]);

    const showStatus = (msg) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), 2500);
    };

    const handleCopy = async (text) => {
        const success = await writeClipboardText(text);
        if (success) {
            showStatus('Copied to clipboard');
        } else {
            showStatus('Copy failed');
        }
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="clipboard-sync-container">
            <div className="clipboard-config">
                <div className="clipboard-config-header">
                    <h3>📋 LAN Clipboard Sync</h3>
                    <div className="toggle-switch-container">
                        <label className="switch-label">
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={e => setIsEnabled(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                        <span className="toggle-status">
                            {isEnabled ? 'SYNC ACTIVE' : 'SYNC OFF'}
                        </span>
                    </div>
                </div>
                <p className="clipboard-description">
                    {isTauri() 
                        ? "Running in Desktop mode. Your system clipboard will sync automatically in the background when active." 
                        : "Running in Web mode. Automatic background sync is limited. Use the copy buttons in the list below to copy items."}
                </p>
                {statusMessage && <div className="clipboard-status-toast">{statusMessage}</div>}
            </div>

            <div className="clipboard-history">
                <h4>Sync History (Recent)</h4>
                <div className="clipboard-list">
                    {history.length === 0 ? (
                        <div className="clipboard-empty">No shared clipboards yet. Enable sync to start sharing!</div>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className="clipboard-item">
                                <div className="clipboard-item-meta">
                                    <span className="clipboard-item-user">👤 {item.username}</span>
                                    <span className="clipboard-item-time">{formatTime(item.timestamp)}</span>
                                </div>
                                <div className="clipboard-item-content">
                                    <pre className="clipboard-text-pre">{item.text}</pre>
                                    <button 
                                        onClick={() => handleCopy(item.text)}
                                        className="clipboard-copy-btn"
                                        title="Copy to clipboard"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
