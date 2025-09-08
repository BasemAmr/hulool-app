import { create } from 'zustand';

export type DrawerType = 'taskFollowUp';

interface DrawerProps {
  taskFollowUp: {
    taskId: number;
    taskName?: string;
    clientName?: string;
    highlightMessage?: number;
  };
}

interface DrawerState {
  isOpen: boolean;
  drawerType: DrawerType | null;
  props: any;
}

interface DrawerActions {
  openDrawer: <T extends DrawerType>(type: T, props: DrawerProps[T]) => void;
  closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerState & DrawerActions>((set) => ({
  isOpen: false,
  drawerType: null,
  props: {},
  openDrawer: (type, props) => set({ isOpen: true, drawerType: type, props }),
  closeDrawer: () => set({ isOpen: false, drawerType: null, props: {} }),
}));
