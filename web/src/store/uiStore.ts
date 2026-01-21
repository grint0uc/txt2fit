import { create } from 'zustand';
import type { UIState } from '../types';

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  id: string;
}

interface UIStoreState extends UIState {
  isAuthModalOpen: boolean;
  isSaveModalOpen: boolean;
  notifications: Notification[];

  openAuthModal: () => void;
  closeAuthModal: () => void;
  openSaveModal: () => void;
  closeSaveModal: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  isAuthModalOpen: false,
  isSaveModalOpen: false,
  notifications: [],

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  openSaveModal: () => set({ isSaveModalOpen: true }),
  closeSaveModal: () => set({ isSaveModalOpen: false }),

  showNotification: (type, message) => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        id: Date.now().toString(),
        type,
        message,
      },
    ],
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
}));
