import React, { useState, useEffect } from 'react';
import { Folder, File, Download, ArrowLeft, RefreshCw, HardDrive, Share2 } from 'lucide-react';

/**
 * FileBrowser - Remote File Browser for LAN sharing.
 */
export default function FileBrowser({ socket, username }) {
    const [localSharePath, setLocalSharePath] = useState('');
    const [isSharingConfigured, setIsSharingConfigured] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    const [activeShares, setActiveShares] = useState({});
    const [selectedUser, setSelectedUser] = useState('');
    const [currentPath, setCurrentPath] = useState('');
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [browseError, setBrowseError] = useState('');

    useEffect(() => {
        fetchLocalConfig();
        if (!socket) return;
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
            port: 5000
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

    const browseRemoteDir = async (remoteUser, subpath = '') => {
        const share = activeShares[remoteUser];
        if (!share) return;

        setLoadingFiles(true);
        setBrowseError('');
        setSelectedUser(remoteUser);
        setCurrentPath(subpath);

        try {
            const targetUrl = `http://${share.ip}:${share.port}/api/shared-directory/files?path=${encodeURIComponent(subpath)}`;
            const res = await fetch(targetUrl);
            const data = await res.json();
            if (res.ok && data.success) {
                setFiles(data.files || []);
            } else {
                setBrowseError(data.error || 'Unable to access shared folder');
            }
        } catch (err) {
            setBrowseError(`Connection to ${remoteUser}'s computer failed`);
        } finally {
            setLoadingFiles(false);
        }
    };

    const navigateUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        const parentPath = parts.join('/');
        browseRemoteDir(selectedUser, parentPath);
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getDownloadUrl = (fileName) => {
        const share = activeShares[selectedUser];
        if (!share) return '#';
        const fullSubpath = currentPath ? `${currentPath}/${fileName}` : fileName;
        return `http://${share.ip}:${share.port}/api/shared-directory/download?file=${encodeURIComponent(fullSubpath)}`;
    };

    return (
        <div className="flex flex-1 h-full bg-[#0D1117] text-[#dfe2eb] overflow-hidden">
            {/* Left Sidebar - Active LAN Shares & Local Config */}
            <div className="w-72 bg-[#10141a] border-r border-[#30363d] flex flex-col p-4 shrink-0 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#30363d]">
                    <Share2 size={18} className="text-[#5865f2]" />
                    <span className="font-bold text-sm text-[#dfe2eb]">LAN Shared Folders</span>
                </div>

                {/* Local Folder Share Config */}
                <div className="bg-[#181c22] border border-[#30363d] rounded-xl p-3 mb-6">
                    <span className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                        <HardDrive size={14} className="text-emerald-400" /> Share My Folder
                    </span>
                    <form onSubmit={handleSaveLocalConfig} className="mt-2 space-y-2">
                        <input
                            type="text"
                            placeholder="C:\Users\Name\Shared"
                            value={localSharePath}
                            onChange={e => setLocalSharePath(e.target.value)}
                            className="w-full bg-[#10141a] border border-[#30363d] rounded-md px-2.5 py-1.5 text-xs text-[#dfe2eb] outline-none focus:border-[#5865f2]"
                        />
                        <button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold py-1.5 rounded-md transition-colors shadow-sm">
                            Save Local Share
                        </button>
                    </form>
                    {shareMessage && <p className="text-[11px] text-emerald-400 mt-1.5 font-mono">{shareMessage}</p>}
                </div>

                {/* Active Shares List */}
                <div className="flex-1">
                    <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-2 block">Active LAN Users</span>
                    <div className="space-y-1">
                        {Object.keys(activeShares).length === 0 ? (
                            <div className="text-xs text-gray-500 italic py-4">No active LAN folder shares found.</div>
                        ) : (
                            Object.entries(activeShares).map(([user, share]) => {
                                const isSelected = selectedUser === user;
                                return (
                                    <button
                                        key={user}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all text-left ${isSelected ? 'bg-[#5865f2]/20 border-[#5865f2] text-[#bec2ff] font-semibold' : 'bg-[#181c22] border-[#30363d] text-gray-300 hover:bg-[#262a31]'}`}
                                        onClick={() => browseRemoteDir(user, '')}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Folder size={16} className="text-amber-400 shrink-0" />
                                            <div className="truncate">
                                                <div className="font-bold truncate">{user}</div>
                                                <div className="text-[10px] text-gray-400 truncate">{share.folderName}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Right Main Remote File Explorer Canvas */}
            <div className="flex-1 flex flex-col h-full bg-[#0D1117] p-6 overflow-hidden">
                {selectedUser ? (
                    <div className="flex flex-col h-full bg-[#10141a] border border-[#30363d] rounded-xl p-4 shadow-xl">
                        {/* Header & Breadcrumb Navigation */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#30363d] shrink-0 mb-4">
                            <div className="flex items-center gap-2 text-xs">
                                <button 
                                    className="p-1.5 rounded-lg bg-[#181c22] border border-[#30363d] hover:bg-[#262a31] text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={navigateUp}
                                    disabled={!currentPath}
                                    title="Go Up"
                                >
                                    <ArrowLeft size={14} />
                                </button>
                                <span className="font-bold text-[#dfe2eb]">{selectedUser}'s Shared Folder</span>
                                <span className="text-gray-500">/</span>
                                <span className="text-indigo-400 font-mono">{currentPath || 'root'}</span>
                            </div>

                            <button 
                                className="p-1.5 rounded-lg bg-[#181c22] border border-[#30363d] hover:bg-[#262a31] text-gray-300 flex items-center gap-1 text-xs"
                                onClick={() => browseRemoteDir(selectedUser, currentPath)}
                                title="Refresh"
                            >
                                <RefreshCw size={13} className={loadingFiles ? "animate-spin" : ""} />
                                <span>Refresh</span>
                            </button>
                        </div>

                        {/* File Content Grid / Table */}
                        {loadingFiles ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-indigo-400 font-mono animate-pulse">Loading directory contents...</div>
                        ) : browseError ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-rose-400 font-mono">{browseError}</div>
                        ) : files.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-gray-500 italic">This directory is empty.</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="bg-[#181c22] border border-[#30363d] rounded-xl p-3 flex items-center justify-between hover:border-[#5865f2] transition-colors group">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {file.is_dir ? (
                                                    <Folder size={20} className="text-amber-400 shrink-0" />
                                                ) : (
                                                    <File size={20} className="text-indigo-400 shrink-0" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    {file.is_dir ? (
                                                        <button 
                                                            className="font-semibold text-xs text-[#dfe2eb] hover:text-indigo-400 truncate text-left w-full block cursor-pointer"
                                                            onClick={() => browseRemoteDir(selectedUser, currentPath ? `${currentPath}/${file.name}` : file.name)}
                                                        >
                                                            {file.name}
                                                        </button>
                                                    ) : (
                                                        <span className="font-semibold text-xs text-[#dfe2eb] truncate block">{file.name}</span>
                                                    )}
                                                    {!file.is_dir && <span className="text-[10px] text-gray-400 font-mono">{formatSize(file.size)}</span>}
                                                </div>
                                            </div>

                                            {!file.is_dir && (
                                                <a 
                                                    href={getDownloadUrl(file.name)} 
                                                    download={file.name} 
                                                    className="p-1.5 rounded-lg bg-[#5865f2]/20 hover:bg-[#5865f2] text-indigo-300 hover:text-white transition-colors ml-2 shrink-0"
                                                    title="Download file"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#10141a] border border-[#30363d] rounded-xl">
                        <Folder size={48} className="text-gray-600 mb-3" />
                        <h3 className="text-base font-bold text-[#dfe2eb] mb-1">Remote LAN File Browser</h3>
                        <p className="text-xs text-gray-400 max-w-sm">Select a user from the left sidebar to browse and download their shared LAN files.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
