'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  approvalMode: 'MAJORITY' | 'UNANIMOUS';
  personalThreshold: number;
}

interface GroupState {
  currentGroup: Group | null;
  setCurrentGroup: (group: Group | null) => void;
}

// El grupo activo se guarda en localStorage (equivalente web de SecureStore).
export const useGroupStore = create<GroupState>()(
  persist(
    (set) => ({
      currentGroup: null,
      setCurrentGroup: (group) => set({ currentGroup: group }),
    }),
    {
      name: 'gf-current-group',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
