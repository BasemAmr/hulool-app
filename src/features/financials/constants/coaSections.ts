import { Landmark, CreditCard, TrendingUp, Building2, TrendingDown } from 'lucide-react';
import type { COASectionDef, COASectionId } from '../types/fcTypes';

export const SUB_TYPE_TO_SECTION: Record<string, COASectionId> = {
  bank: 'assets',
  cashbox: 'assets',
  wallet: 'assets',
  company_vault: 'assets',
  internal: 'liabilities',
};

export const coaSections: COASectionDef[] = [
  {
    id: 'assets',
    label: 'الأصول',
    labelEn: 'Assets',
    icon: Landmark,
    defaultNormalBalance: 'debit',
    prefix: 1,
  },
  {
    id: 'liabilities',
    label: 'الالتزامات',
    labelEn: 'Liabilities',
    icon: CreditCard,
    defaultNormalBalance: 'credit',
    prefix: 2,
  },
  {
    id: 'income',
    label: 'الإيرادات',
    labelEn: 'Income',
    icon: TrendingUp,
    defaultNormalBalance: 'credit',
    prefix: 3,
  },
  {
    id: 'equity',
    label: 'حقوق الملكية',
    labelEn: 'Equity',
    icon: Building2,
    defaultNormalBalance: 'credit',
    prefix: 4,
  },
  {
    id: 'expenses',
    label: 'المصروفات',
    labelEn: 'Expenses',
    icon: TrendingDown,
    defaultNormalBalance: 'debit',
    prefix: 5,
  },
];
