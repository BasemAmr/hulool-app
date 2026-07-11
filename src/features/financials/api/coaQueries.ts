import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { ApiResponse } from '@/api/types';
import type { COATreeData, COASectionData } from '../types/fcTypes';
import { coaSections } from '../constants/coaSections';

// Raw API response shape from GET /coa-tree
interface RawCOASection {
  key: string;
  label: string;
  polarity: 'debit' | 'credit';
  prefix: number;
  categories: {
    slug: string;
    label: string;
    accounts: any[];
  }[];
  uncategorized_accounts: any[];
  total_balance: number;
}

// Transform raw API response to match frontend COATreeData type
function transformCoaTree(rawSections: RawCOASection[]): COATreeData {
  return rawSections.map((raw) => {
    // Find matching frontend section definition (has icon, Arabic label, etc.)
    const sectionDef = coaSections.find((s) => s.id === raw.key) ?? {
      id: raw.key as any,
      label: raw.label,
      labelEn: raw.label,
      icon: () => null,
      defaultNormalBalance: raw.polarity,
      prefix: raw.prefix,
    };

    return {
      section: sectionDef,
      categorized: raw.categories.map((cat) => ({
        subType: cat.slug,
        label: cat.label,
        accounts: cat.accounts,
      })),
      uncategorized: raw.uncategorized_accounts,
      totalCount:
        raw.categories.reduce((sum, cat) => sum + cat.accounts.length, 0) +
        raw.uncategorized_accounts.length,
      totalBalance: raw.total_balance,
    };
  });
}

// GET /coa-tree — full tree
export const useGetCoaTree = () => {
  return useQuery<COATreeData>({
    queryKey: ['coa-tree'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RawCOASection[]>>('/coa-tree');
      return transformCoaTree(response.data.data);
    },
    staleTime: 30 * 1000,
  });
};

// GET /treasury-accounts/next-number?section=xxx
export const useGetNextAccountNumber = (section: string) => {
  return useQuery<{ account_number: string }>({
    queryKey: ['treasury-accounts', 'next-number', section],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ account_number: string }>>(
        `/treasury-accounts/next-number?section=${section}`
      );
      return response.data.data;
    },
    staleTime: 10 * 1000,
    enabled: !!section,
  });
};
