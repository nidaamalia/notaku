import { create } from 'zustand';

interface RefreshDataState {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const useRefreshData = create<RefreshDataState>((set) => ({
  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
