import { create } from 'zustand';

interface RefreshDataState {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const useRefreshData = create<RefreshDataState>((set) => ({
  refreshTrigger: 0,
  triggerRefresh: () => {
    console.log('Refresh triggered, current trigger:', Date.now());
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }));
  },
}));
