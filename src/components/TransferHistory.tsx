import React, { useState, useEffect } from 'react';

/**
 * TransferHistory - Component displaying history of uploads and downloads.
 */
export default function TransferHistory({ onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/transfer-history');
            const data = await res.json();
            if (res.ok && data.success) {
                // Sort by timestamp descending
                setHistory((data.history || []).sort((a, b) => b.timestamp - a.timestamp));
            } else {
                setError(data.error || 'Failed to fetch transfer history');
            }
        } catch (err) {
            setError('Error loading transfer history');
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => 
        (item.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.hash || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatTime = (ts) => {
        const d = new Date(ts * 1000);
        return d.toLocaleString();
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="transfer-history-panel">
            <div className="transfer-history-header">
                <h2>📁 File Transfer History</h2>
                <div className="transfer-header-actions">
                    <button className="refresh-btn" onClick={fetchHistory} title="Refresh">🔄</button>
                    <button className="close-panel-btn" onClick={onClose}>✕</button>
                </div>
            </div>

            <div className="transfer-search-container">
                <input
                    type="text"
                    placeholder="Search by filename or SHA-256 hash..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="transfer-search-input"
                />
            </div>

            <div className="transfer-table-container">
                {loading && <div className="transfer-loading">Loading transfer history...</div>}
                {error && <div className="transfer-error">{error}</div>}
                
                {!loading && !error && filteredHistory.length === 0 && (
                    <div className="transfer-empty">No transfers logged.</div>
                )}

                {!loading && !error && filteredHistory.length > 0 && (
                    <table className="transfer-table">
                        <thead>
                            <tr>
                                <th>Filename</th>
                                <th>Direction</th>
                                <th>Size</th>
                                <th>Time</th>
                                <th>SHA-256 Hash</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map(item => (
                                <tr key={item.id}>
                                    <td className="tx-filename">📄 {item.filename}</td>
                                    <td>
                                        <span className={`tx-badge ${item.direction}`}>
                                            {item.direction === 'sent' ? '📤 Sent' : '📥 Received'}
                                        </span>
                                    </td>
                                    <td>{formatSize(item.size)}</td>
                                    <td>{formatTime(item.timestamp)}</td>
                                    <td className="tx-hash" title={item.hash}>{item.hash}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
