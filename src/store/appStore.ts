import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
    activeChannel: string;
    setActiveChannel: (channel: string) => void;
    activeView: string;
    setActiveView: (view: string) => void;
    activeDmUser: string;
    setActiveDmUser: (user: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            activeChannel: 'general',
            setActiveChannel: (channel) => set({ activeChannel: channel }),
            
            activeView: 'server',
            setActiveView: (view) => set({ activeView: view }),
            
            activeDmUser: '',
            setActiveDmUser: (user) => set({ activeDmUser: user }),
        }),
        {
            name: 'lan-saturn-app-storage',
            partialize: (state) => ({ 
                activeChannel: state.activeChannel,
                activeView: state.activeView
            }),
        }
    )
);

interface UIState {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    showPollModal: boolean;
    setShowPollModal: (show: boolean) => void;
    showTransferHistory: boolean;
    setShowTransferHistory: (show: boolean) => void;
    showSearchModal: boolean;
    setShowSearchModal: (show: boolean) => void;
    isRightPanelOpen: boolean;
    setIsRightPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export const useUIStore = create<UIState>((set) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    showPollModal: false,
    setShowPollModal: (show) => set({ showPollModal: show }),
    
    showTransferHistory: false,
    setShowTransferHistory: (show) => set({ showTransferHistory: show }),

    showSearchModal: false,
    setShowSearchModal: (show) => set({ showSearchModal: show }),

    isRightPanelOpen: true,
    setIsRightPanelOpen: (open) => set((state) => ({ 
        isRightPanelOpen: typeof open === 'function' ? open(state.isRightPanelOpen) : open 
    })),
}));

interface ChatState {
    isTyping: boolean;
    setIsTyping: (typing: boolean) => void;
    typingUser: string;
    setTypingUser: (user: string) => void;
    isUploading: boolean;
    setIsUploading: (uploading: boolean) => void;
    uploadStatus: string;
    setUploadStatus: (status: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    isTyping: false,
    setIsTyping: (typing) => set({ isTyping: typing }),
    
    typingUser: '',
    setTypingUser: (user) => set({ typingUser: user }),
    
    isUploading: false,
    setIsUploading: (uploading) => set({ isUploading: uploading }),
    
    uploadStatus: '',
    setUploadStatus: (status) => set({ uploadStatus: status }),
}));

interface SecurityState {
    channelPasswords: Record<string, string>;
    setChannelPasswords: (passwords: Record<string, string>) => void;
    joiningChannel: string | null;
    setJoiningChannel: (channel: string | null) => void;
    joinPassword: string;
    setJoinPassword: (password: string) => void;
    joinInvite: string;
    setJoinInvite: (invite: string) => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
    channelPasswords: {},
    setChannelPasswords: (passwords) => set({ channelPasswords: passwords }),
    
    joiningChannel: null,
    setJoiningChannel: (channel) => set({ joiningChannel: channel }),
    
    joinPassword: '',
    setJoinPassword: (password) => set({ joinPassword: password }),
    
    joinInvite: '',
    setJoinInvite: (invite) => set({ joinInvite: invite }),
}));

export type TransferState =
    | 'idle'
    | 'starting'
    | 'uploading'
    | 'downloading'
    | 'paused'
    | 'resuming'
    | 'verifying'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface ActiveTransfer {
    id: string;
    filename: string;
    totalSize: number;
    transferredBytes: number;
    percent: number;
    speedMBs: number;
    etaSeconds: number;
    state: TransferState;
    direction: 'upload' | 'download';
    hash?: string;
    expectedHash?: string;
    error?: string;
    isEncrypted?: boolean;
    fileUrl?: string;
    file?: File;
    pause?: () => void;
    resume?: () => void;
    cancel?: () => void;
}

interface TransferStoreState {
    transfers: Record<string, ActiveTransfer>;
    addTransfer: (transfer: ActiveTransfer) => void;
    updateTransfer: (id: string, patch: Partial<ActiveTransfer>) => void;
    removeTransfer: (id: string) => void;
    clearFinishedTransfers: () => void;
}

export const useTransferStore = create<TransferStoreState>((set) => ({
    transfers: {},
    addTransfer: (transfer) => set((state) => ({
        transfers: {
            ...state.transfers,
            [transfer.id]: transfer,
        },
    })),
    updateTransfer: (id, patch) => set((state) => {
        const existing = state.transfers[id];
        if (!existing) return state;
        return {
            transfers: {
                ...state.transfers,
                [id]: { ...existing, ...patch },
            },
        };
    }),
    removeTransfer: (id) => set((state) => {
        const next = { ...state.transfers };
        delete next[id];
        return { transfers: next };
    }),
    clearFinishedTransfers: () => set((state) => {
        const next: Record<string, ActiveTransfer> = {};
        for (const [id, t] of Object.entries(state.transfers)) {
            if (t.state !== 'completed' && t.state !== 'cancelled' && t.state !== 'failed') {
                next[id] = t;
            }
        }
        return { transfers: next };
    }),
}));
