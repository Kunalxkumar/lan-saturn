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
}

export const useUIStore = create<UIState>((set) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    showPollModal: false,
    setShowPollModal: (show) => set({ showPollModal: show }),
    
    showTransferHistory: false,
    setShowTransferHistory: (show) => set({ showTransferHistory: show }),
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
