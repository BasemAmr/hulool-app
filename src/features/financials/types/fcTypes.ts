import type { TreasuryAccount } from '@/api/types';

export type FCActiveTab = 'treasury' | 'employees' | 'clients';

export interface FCAccountRef {
  type: 'treasury' | 'employee' | 'client' | 'cashbox';
  id: number;
  name: string;
  balance?: number;
}

export interface FCEmployeeSummary {
  id: number;
  display_name: string;
  balance: number;
  last_activity: string | null;
}

export interface FCClientSummary {
  client_id: number;
  client_name: string;
  client_phone: string;
  total_debit: number;
  total_credit: number;
  total_outstanding: number;
  transaction_count: number;
  last_activity: string | null;
}

export interface FCClientTotals {
  total_debit: number;
  total_credit: number;
  total_outstanding: number;
  clients_count: number;
  clients_with_debt: number;
  clients_with_credit: number;
  balanced_clients: number;
}

// ========================================
// COA (Chart of Accounts) Types
// ========================================

export type COASectionId = 'assets' | 'liabilities' | 'income' | 'equity' | 'expenses';

export interface COASectionDef {
  id: COASectionId;
  label: string;
  labelEn: string;
  icon: React.ComponentType<{ size?: number }>;
  defaultNormalBalance: 'debit' | 'credit';
  prefix: number;
}

export interface COACategoryGroup {
  subType: string;
  label: string;
  accounts: TreasuryAccount[];
}

export interface COASectionData {
  section: COASectionDef;
  categorized: COACategoryGroup[];
  uncategorized: TreasuryAccount[];
  totalCount: number;
  totalBalance: number;
}

export type COATreeData = COASectionData[];
