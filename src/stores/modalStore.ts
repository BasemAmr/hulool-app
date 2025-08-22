import { create } from 'zustand';
import type { Client, Task, Receivable, Tag, ClientCredit } from '../api/types';

// Define all possible modals in the app.
// We will add more types like 'task' in later phases.
export type ModalType = 'clientForm' | 'confirmDelete' | 'taskForm' | 'requirements' | 'manualReceivable' | 'clientReceivables' | 'paymentForm' | 'paymentHistory' | 'clientSearch' | 'tagForm' | 'tagManagement' | 'selectReceivableForPayment' | 'taskCompletion' | 'amountDetails' | 'taskSelection' | 'taskDetails' | 'recordCreditModal' | 'applyCreditModal' | 'clientCreditHistory' | 'creditEdit' | 'creditDelete' | 'allocationEdit' | 'allocationDelete';

// Define the props each modal type can receive.
interface ModalProps {
  clientForm: { clientToEdit?: Client };
   taskForm: { 
    taskToEdit?: Task;
    // Pre-populate client if adding a task from the client page
    client?: Client; 
  };
  requirements: { task: Task };
  confirmDelete: {
    title: string;
    message: string;
    onConfirm: () => void;
  };
  manualReceivable: { client_id?: number; client?: Client }; // Allow predefined client
  clientReceivables: { client: Client };
  payment: { receivable: Receivable };
  paymentForm: { receivable: Receivable; isRequired?: boolean };
  paymentHistory: { receivable: Receivable };
  clientSearch: { };
  tagForm: { tagToEdit?: Tag };
  tagManagement: { };
  selectReceivableForPayment: { 
    clientId: number; 
    receivables: Receivable[];
  };
  taskCompletion: { task: Task };
  amountDetails: { task: Task };
  taskSelection: { tagId: number };
  taskDetails: { task: Task };

  recordCreditModal: {}; // No props needed, it will contain the client search

  applyCreditModal: { receivable: Receivable; availableCredit: number };
  clientCreditHistory: { clientId: number; clientName: string };
  creditEdit: { credit: ClientCredit; clientId: number };
  creditDelete: { credit: ClientCredit; clientId: number };
  allocationEdit: { allocation: any; clientId: number };
  allocationDelete: { allocation: any; clientId: number };

}

interface ModalState {
  isOpen: boolean;
  modalType: ModalType | null;
  props: any; // Using `any` here is pragmatic for a generic store
}

interface ModalActions {
  openModal: <T extends ModalType>(type: T, props: ModalProps[T]) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState & ModalActions>((set) => ({
  isOpen: false,
  modalType: null,
  props: {},
  openModal: (type, props) => set({ isOpen: true, modalType: type, props }),
  closeModal: () => set({ isOpen: false, modalType: null, props: {} }),
}));

