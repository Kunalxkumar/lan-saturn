import React, { useState, useEffect } from 'react';

/**
 * FileBrowser - Remote File Browser for LAN sharing.
 */
export default function FileBrowser({ socket, username }) {
    // Sharing setup
    const [localSharePath, setLocalSharePath] = useState('');
    const [isSharingConfigured, setIsSharingConfigured] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    // Remote browsing
    const [activeShares, setActiveShares] = useState({});
    const [selectedUser, setSelectedUser] = useState(''); // Selected remote username to browse
    const [currentPath, setCurrentPath] = useState(''); // Current browsing subpath
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [browseError, setBrowseError] = useState('');

    useEffect(() => {
        // Fetch current local shared directory config
        fetchLocalConfig();

        if (!socket) return;
        // Fetch currently active LAN shares
        socket.emit('get_shares');

        socket.on('shares_list', (data) => {
            setActiveShares(data.shares || {});
        });

        return () => {
            socket.off('shares_list');
        };
    }, [socket]);

    const fetchLocalConfig = async () => {
        try {
            const res = await fetch('/api/shared-directory/config');
            const data = await res.json();
            if (res.ok && data.success && data.path) {
                setLocalSharePath(data.path);
                setIsSharingConfigured(true);
                // Announce share to LAN
                announceShareToLAN(data.path);
            }
        } catch (err) {
            console.error('Error fetching local share config:', err);
        }
    };

    const announceShareToLAN = (path) => {
        if (!socket) return;
        const folderName = path.split('\\').pop() || path.split('/').pop() || 'Shared Folder';
        socket.emit('announce_share', {
            username,
            folderName,
            port: 5000 // Flask default port
        });
    };

    const handleSaveLocalConfig = async (e) => {
        e.preventDefault();
        setShareMessage('');
        try {
            const res = await fetch('/api/shared-directory/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: localSharePath })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setIsSharingConfigured(!!localSharePath);
                setShareMessage(data.message || 'Shared folder configured');
                announceShareToLAN(localSharePath);
                setTimeout(() => setShareMessage(''), 3000);
            } else {
                setShareMessage(data.error || 'Failed to update shared folder');
            }
        } catch (err) {
            setShareMessage('Error connecting to local server');
        }
    };

    // Load files inside a directory from a remote computer
    const browseRemoteDir = async (remoteUser, subpath = '') => {
        const share = activeShares[remoteUser];
        if (!share) return;

        setLoadingFiles(true);
        setBrowseError('');
        setSelectedUser(remoteUser);
        setCurrentPath(subpath);

        try {
            // Fetch directly from the remote computer's Flask endpoint
            const targetUrl = `http://${share.ip}:${share.port}/api/shared-directory/files?path=${encodeURIComponent(subpath)}`;
            const res = await fetch(targetUrl);
            const data = await res.json();
            if (res.ok && data.success) {
                setFiles(data.files || []);
            } else {
                setBrowseError(data.error || 'Failed to list remote directory');
            }
        } catch (err) {
            setBrowseError(`Could not connect to ${remoteUser}'s computer (${share.ip}:${share.port})`);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleNavigateDir = (dirName) => {
        const nextPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        browseRemoteDir(selectedUser, nextPath);
    };

    const handleNavigateBack = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        const parentPath = parts.join('/');
        browseRemoteDir(selectedUser, parentPath);
    };

    const getDownloadUrl = (fileName) => {
        const share = activeShares[selectedUser];
        if (!share) return '';
        const relativeFilePath = currentPath ? `${currentPath}/${fileName}` : fileName;
        return `http://${share.ip}:${share.port}/api/shared-directory/download?path=${encodeURIComponent(relativeFilePath)}`;
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="file-browser-container">
            {/* Top configuration panel */}
            <div className="local-share-config">
                <h3>📁 Share Folder on LAN</h3>
                <form onSubmit={handleSaveLocalConfig} className="local-share-form">
                    <input
                        type="text"
                        placeholder="Paste folder absolute path (e.g. C:\Users\Kunal\Shared)"
                        value={localSharePath}
                        onChange={e => setLocalSharePath(e.target.value)}
                        className="share-path-input"
                    />
                    <button type="submit" className="save-share-btn">
                        {localSharePath ? 'Update Share' : 'Stop Sharing'}
                    </button>
                    {isSharingConfigured && <span className="share-status-indicator active">● Active LAN Share</span>}
                </form>
                {shareMessage && <div className="share-message-feedback">{shareMessage}</div>}
            </div>

            <div className="browser-split-view">
                {/* Left panel: active shares list */}
                <div className="shares-list-sidebar">
                    <h4>Connected LAN Folders</h4>
                    <div className="shares-list">
                        {Object.keys(activeShares).length === 0 ? (
                            <div className="shares-empty">No active shares found on your network. Configure one above to start sharing!</div>
                        ) : (
                            Object.entries(activeShares).map(([shareUser, share]) => (
                                <button
                                    key={shareUser}
                                    className={`share-list-item ${selectedUser === shareUser ? 'active' : ''}`}
                                    onClick={() => browseRemoteDir(shareUser, '')}
                                >
                                    <span className="share-list-icon">📂</span>
                                    <div className="share-list-meta">
                                        <span className="share-list-username">{shareUser}</span>
                                        <span className="share-list-foldername">Folder: {share.folderName}</span>
                                        <span className="share-list-ip">{share.ip}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right panel: file list */}
                <div className="remote-files-browser">
                    {selectedUser ? (
                        <>
                            <div className="browser-breadcrumb">
                                <span className="breadcrumb-user">{selectedUser}'s shared folder</span>
                                <span className="breadcrumb-separator">/</span>
                                <button className="breadcrumb-root" onClick={() => browseRemoteDir(selectedUser, '')}>root</button>
                                {currentPath && currentPath.split('/').map((part, i, arr) => (
                                    <React.Fragment key={i}>
                                        <span className="breadcrumb-separator">/</span>
                                        <button 
                                            className="breadcrumb-part"
                                            onClick={() => browseRemoteDir(selectedUser, arr.slice(0, i + 1).join('/'))}
                                        >
                                            {part}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>

                            <div className="files-list-container">
                                {loadingFiles && <div className="files-loading">Loading directory...</div>}
                                {browseError && <div className="files-error">{browseError}</div>}

                                {!loadingFiles && !browseError && (
                                    <table className="files-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Size</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentPath && (
                                                <tr className="file-row parent-dir" onClick={handleNavigateBack}>
                                                    <td colSpan="3">📁 .. (Go back)</td>
                                                </tr>
                                            )}
                                            {files.map((file, i) => (
                                                <tr 
                                                    key={i} 
                                                    className={`file-row ${file.is_dir ? 'directory' : 'file'}`}
                                                    onClick={() => file.is_dir && handleNavigateDir(file.name)}
                                                >
                                                    <td className="file-name-cell">
                                                        {file.is_dir ? '📁' : '📄'} {file.name}
                                                    </td>
                                                    <td>{file.is_dir ? '--' : formatSize(file.size)}</td>
                                                    <td onClick={e => e.stopPropagation()}>
                                                        {!file.is_dir && (
                                                            <a 
                                                                href={getDownloadUrl(file.name)} 
                                                                className="file-browser-download-btn"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                Download
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {files.length === 0 && (
                                                <tr>
                                                    <td colSpan="3" className="directory-empty">This folder is empty.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="browser-empty-state">
                            <span className="browser-empty-icon">📁</span>
                            <h3>Remote File Browser</h3>
                            <p>Select a user's shared folder on the left to browse and download files directly from their machine.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
