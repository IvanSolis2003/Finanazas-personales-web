import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  approvalMode: 'MAJORITY' | 'UNANIMOUS';
  personalThreshold: number;
}

interface GroupState {
  currentGroup: Group | null;
  setCurrentGroup: (group: Group | null) => void;
  hydrateGroup: () => Promise<void>;
}

const GROUP_KEY = 'currentGroup';

export const useGroupStore = create<GroupState>((set) => ({
  currentGroup: null,

  setCurrentGroup: async (group) => {
    set({ currentGroup: group });
    if (group) {
      await SecureStore.setItemAsync(GROUP_KEY, JSON.stringify(group));
    } else {
      await SecureStore.deleteItemAsync(GROUP_KEY);
    }
  },

  hydrateGroup: async () => {
    const raw = await SecureStore.getItemAsync(GROUP_KEY);
    if (raw) {
      set({ currentGroup: JSON.parse(raw) });
    }
  },
}));
