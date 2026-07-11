import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/client';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { FileSpreadsheet, Search } from 'lucide-react';
import { useGetTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import type { TreasuryAccount, TreasuryAccountExportItem, TreasuryAccountExportReportData, Pagination } from '@/api/types';

interface AccountReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRANSACTIONS_PER_PAGE = 100;

interface HistoryData {
  transactions: any[];
  pagination: Pagination;
  total_debits?: number;
  total_credits?: number;
}

const AccountReportModal = ({ isOpen, onClose }: AccountReportModalProps) => {
  const { success, error: showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const { data: allAccounts = [] } = useGetTreasuryAccounts();

  const selectedAccount = useMemo(
    () => allAccounts.find(a => a.id === selectedAccountId) || null,
    [allAccounts, selectedAccountId]
  );

  const filteredAccounts = useMemo(
    () => allAccounts.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [allAccounts, searchQuery]
  );

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedAccountId(null);
    }
  }, [isOpen]);

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccountId || !selectedAccount) throw new Error('Missing account');

      let allTransactions: any[] = [];
      let totalDebits = 0;
      let totalCredits = 0;
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const { data } = await apiClient.get<any>(
          `/accounts/treasury/${selectedAccountId}/history`,
          { params: { page, per_page: TRANSACTIONS_PER_PAGE } }
        );

        let historyData: HistoryData | null = null;

        if (data.data?.transactions) {
          historyData = {
            transactions: data.data.transactions,
            pagination: data.data.pagination,
            total_debits: data.data.total_debits,
            total_credits: data.data.total_credits,
          };
        } else if (data.transactions) {
          historyData = {
            transactions: data.transactions,
            pagination: data.pagination,
            total_debits: data.total_debits,
            total_credits: data.total_credits,
          };
        }

        if (!historyData) throw new Error('Unexpected response format');

        allTransactions = [...allTransactions, ...historyData.transactions];
        totalDebits += historyData.total_debits || 0;
        totalCredits += historyData.total_credits || 0;
        totalPages = historyData.pagination.total_pages;
        page++;
      }

      if (allTransactions.length === 0) {
        throw new Error('No transactions found');
      }

      const items: TreasuryAccountExportItem[] = allTransactions.map((t: any) => ({
        transaction_date: t.transaction_date || t.created_at || '',
        transaction_type: t.transaction_type || '',
        description: t.description || '',
        debit: parseFloat(t.debit || t.amount || 0),
        credit: parseFloat(t.credit || 0),
        balance: parseFloat(t.balance_after || t.balance || 0),
      }));

      const reportData: TreasuryAccountExportReportData = {
        title: `تقرير حساب - ${selectedAccount.name}`,
        items,
      };

      await exportService.exportTreasuryAccount(reportData);
    },
    onSuccess: () => {
      success(TOAST_MESSAGES.EXPORT_SUCCESS);
      onClose();
    },
    onError: (err: Error) => {
      showError(TOAST_MESSAGES.EXPORT_FAILED, err.message);
    },
  });

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="تقرير حساب">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            بحث عن حساب
          </label>
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedAccountId(null); }}
              placeholder="ابحث عن حساب..."
              className="base-input w-full pr-10"
              dir="rtl"
              autoFocus
            />
          </div>
        </div>

        {searchQuery && filteredAccounts.length > 0 && !selectedAccountId && (
          <div className="max-h-60 overflow-y-auto border border-border-default rounded-lg divide-y divide-border-default">
            {filteredAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => { setSelectedAccountId(account.id); setSearchQuery(''); }}
                className="w-full text-right px-4 py-3 hover:bg-bg-surface-hover transition-colors flex items-center justify-between"
              >
                <span className="font-bold text-sm">{account.name}</span>
                <span className="text-xs text-text-secondary">{account.account_number || ''}</span>
              </button>
            ))}
          </div>
        )}

        {searchQuery && filteredAccounts.length === 0 && (
          <div className="text-center py-4 text-sm text-text-secondary">
            لا توجد نتائج
          </div>
        )}

        {selectedAccount && (
          <div className="bg-bg-surface-muted rounded-lg p-4 border border-border-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-base">{selectedAccount.name}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {selectedAccount.account_number || ''}
                  {selectedAccount.account_number ? ' - ' : ''}
                  {selectedAccount.sub_type}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border-default">
          <Button type="button" variant="outline-primary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => exportMutation.mutate()}
            isLoading={exportMutation.isPending}
            disabled={!selectedAccountId}
          >
            <FileSpreadsheet size={16} className="me-1" />
            {exportMutation.isPending ? 'جاري التصدير...' : 'تصدير إلى Excel'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default AccountReportModal;
