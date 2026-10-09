import React, { useState, useEffect } from 'react';
import { 
    Folder, 
    File, 
    Download, 
    ArrowLeft, 
    RefreshCw, 
    HardDrive, 
    Share2, 
    FolderGit2, 
    ChevronRight,
    Loader2,
    FileCode,
    FileArchive,
    FileImage,
    FileVideo
} from 'lucide-react';

interface FileBrowserProps {
    socket: any;
    username: string;
}

export default function FileBrowser({ socket, username }: FileBrowserProps) {
    const [localSharePath, setLocalSharePath] = useState('');
    const [isSharingConfigured, setIsSharingConfigured] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    const [activeShares, setActiveShares] = useState<Record<string, any>>({});
    const [selectedUser, setSelectedUser] = useState('');
    const [currentPath, setCurrentPath] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [browseError, setBrowseError] = useState('');

    useEffect(() => {
        fetchLocalConfig();
        if (!socket) return;
        socket.emit('get_shares');

        const onSharesList = (data: any) => {
            setActiveShares(data.shares || {});
        };

        socket.on('shares_list', onSharesList);

        return () => {
            socket.off('shares_list', onSharesList);
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

    const announceShareToLAN = (path: string) => {
        if (!socket) return;
        const folderName = path.split('\\').pop() || path.split('/').pop() || 'Shared Folder';
        socket.emit('announce_share', {
            username,
            folderName,
            port: 5000
        });
    };

    const handleSaveLocalConfig = async (e: React.FormEvent) => {
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

    const browseRemoteDir = async (remoteUser: string, subpath = '') => {
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
            setBrowseError(`Connection to ${remoteUser}'s node failed`);
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

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getDownloadUrl = (fileName: string) => {
        const share = activeShares[selectedUser];
        if (!share) return '#';
        const fullSubpath = currentPath ? `${currentPath}/${fileName}` : fileName;
        return `http://${share.ip}:${share.port}/api/shared-directory/download?file=${encodeURIComponent(fullSubpath)}`;
    };

    const getFileIcon = (filename: string) => {
        const lower = filename.toLowerCase();
        if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return <FileImage size={18} className="text-teal-400" />;
        if (lower.match(/\.(mp4|webm|mkv|mov)$/)) return <FileVideo size={18} className="text-cyan-400" />;
        if (lower.match(/\.(zip|tar|gz|7z|rar)$/)) return <FileArchive size={18} className="text-amber-400" />;
        if (lower.match(/\.(ts|js|tsx|jsx|json|py|rs|go|html|css)$/)) return <FileCode size={18} className="text-sky-400" />;
        return <File size={18} className="text-slate-400" />;
    };

    return (
        <div className="flex flex-1 h-full bg-[#080b11] text-slate-200 overflow-hidden select-none">
            {/* Left Sidebar - Shared Drives */}
            <div className="w-72 bg-[#0c101a] border-r border-white/[0.07] flex flex-col p-4 shrink-0 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                    <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                        <FolderGit2 size={16} />
                    </div>
                    <div>
                        <span className="font-bold text-xs text-slate-100 block">LAN Shared Drives</span>
                        <span className="text-[10px] font-mono text-slate-400">P2P Network Folders</span>
                    </div>
                </div>

                {/* Local Share Configuration Card */}
                <div className="spotlight-card rounded-xl p-3 mb-5 border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-2">
                        <HardDrive size={14} className="text-emerald-400" />
                        <span>Publish Local Directory</span>
                    </div>
                    <form onSubmit={handleSaveLocalConfig} className="space-y-2">
                        <input
                            type="text"
                            placeholder="e.g. C:\Users\Kunal\Shared"
                            value={localSharePath}
                            onChange={e => setLocalSharePath(e.target.value)}
                            className="w-full bg-[#121826] border border-white/10 focus:border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none font-mono transition-all"
                        />
                        <button 
                            type="submit" 
                            className="btn-shimmer w-full text-xs font-semibold py-1.5 rounded-lg cursor-pointer"
                        >
                            Publish Drive to LAN
                        </button>
                    </form>
                    {shareMessage && (
                        <p className="text-[10px] text-emerald-400 mt-2 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {shareMessage}
                        </p>
                    )}
                </div>

                {/* Active Network Shares List */}
                <div className="flex-1">
                    <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                        <span>Available Network Shares</span>
                        <span className="text-[10px] text-sky-400 font-mono">
                            {Object.keys(activeShares).length}
                        </span>
                    </div>

                    <div className="space-y-1">
                        {Object.keys(activeShares).length === 0 ? (
                            <div className="text-xs text-slate-500 italic py-6 text-center bg-white/[0.02] rounded-xl border border-white/5">
                                No network drives published yet.
                            </div>
                        ) : (
                            Object.entries(activeShares).map(([user, share]) => {
                                const isSelected = selectedUser === user;
                                return (
                                    <button
                                        key={user}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all text-left cursor-pointer ${
                                            isSelected 
                                                ? 'bg-sky-500/15 border-sky-500/40 text-sky-200 font-medium shadow-sm' 
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-slate-300 hover:bg-white/[0.05]'
                                        }`}
                                        onClick={() => browseRemoteDir(user, '')}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                                                <Folder size={15} />
                                            </div>
                                            <div className="truncate">
                                                <div className="font-semibold truncate text-slate-100">{user}</div>
                                                <div className="text-[10px] font-mono text-slate-400 truncate">{share.folderName}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-500 shrink-0" />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Right Main Remote File Canvas */}
            <div className="flex-1 flex flex-col h-full bg-[#080b11] p-5 overflow-hidden">
                {selectedUser ? (
                    <div className="flex flex-col h-full bg-[#0c101a] border border-white/[0.08] rounded-xl p-4 shadow-2xl overflow-hidden">
                        {/* Header & Breadcrumb Path */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] shrink-0 mb-4">
                            <div className="flex items-center gap-2 text-xs truncate">
                                <button 
                                    className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    onClick={navigateUp}
                                    disabled={!currentPath}
                                    title="Go to parent directory"
                                >
                                    <ArrowLeft size={14} />
                                </button>
                                <span className="font-bold text-slate-200">@{selectedUser}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-sky-400 font-mono truncate">{currentPath || 'root'}</span>
                            </div>

                            <button 
                                className="btn-secondary px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer font-medium"
                                onClick={() => browseRemoteDir(selectedUser, currentPath)}
                                title="Refresh directory"
                            >
                                <RefreshCw size={13} className={loadingFiles ? "animate-spin text-sky-400" : ""} />
                                <span>Refresh</span>
                            </button>
                        </div>

                        {/* File Content Grid */}
                        {loadingFiles ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-sky-400 font-mono">
                                <Loader2 size={24} className="animate-spin" />
                                <span>Querying remote file system...</span>
                            </div>
                        ) : browseError ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-rose-400 font-mono bg-rose-500/5 rounded-xl border border-rose-500/20 m-4">
                                {browseError}
                            </div>
                        ) : files.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 italic">
                                This shared folder is currently empty.
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                    {files.map((file, idx) => (
                                        <div 
                                            key={idx} 
                                            className="spotlight-card rounded-xl p-3 flex items-center justify-between border border-white/[0.06] hover:border-sky-500/30 gap-2 transition-all group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className="shrink-0">
                                                    {file.is_dir ? (
                                                        <Folder size={18} className="text-amber-400" />
                                                    ) : (
                                                        getFileIcon(file.name)
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {file.is_dir ? (
                                                        <button 
                                                            className="font-semibold text-xs text-slate-200 hover:text-sky-300 truncate text-left w-full block cursor-pointer transition-colors"
                                                            onClick={() => browseRemoteDir(selectedUser, currentPath ? `${currentPath}/${file.name}` : file.name)}
                                                        >
                                                            {file.name}
                                                        </button>
                                                    ) : (
                                                        <span className="font-medium text-xs text-slate-200 truncate block">
                                                            {file.name}
                                                        </span>
                                                    )}
                                                    {!file.is_dir && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {formatSize(file.size)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {!file.is_dir && (
                                                <a 
                                                    href={getDownloadUrl(file.name)} 
                                                    download={file.name} 
                                                    className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/20 text-sky-300 hover:text-white transition-all shrink-0 cursor-pointer"
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
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0c101a] border border-white/[0.08] rounded-xl shadow-xl">
                        <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-sky-400 mb-3 shadow-inner">
                            <FolderGit2 size={28} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-100 mb-1">
                            Remote Peer Network Drive
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                            Pick a peer drive from the left sidebar to explore their published files and pull them over local Wi-Fi / Ethernet at full wire speed.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
