/**
 * ManualTransactionModal
 * 
 * Modal for admin to create manual transactions:
 * - Transfers: Double-entry between two accounts
 * - Payout (Sarf): Company pays employee/client
 * - Repayment (Qabd): Employee/client pays company back
 */

import { useState, useEffect } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import SaudiRiyalIcon from '@/shared/ui/icons/SaudiRiyalIcon';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import ClientSearchCombobox from '@/shared/search/ClientSearchCombobox';
import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import { useCreateManualTransaction, useGetAccountsByType } from '@/features/financials/api/financialCenterQueries';
import { useToast } from '@/shared/hooks/useToast';
import { ArrowRight, AlertCircle, User, Building, Briefcase, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import type {
  AccountType,
  UnifiedAccount,
  ManualTransactionType
} from '@/api/types';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAccount?: UnifiedAccount;
  direction?: 'payout' | 'repayment'; // Optional: sarf or qabd
  accountType?: 'employee' | 'client'; // Optional: freeze to this type if provided
}

const ManualTransactionModal = ({
  isOpen,
  onClose,
  preselectedAccount,
  direction: initialDirection,
  accountType: frozenAccountType,
}: ManualTransactionModalProps) => {
  const { success, error } = useToast();
  const createTransaction = useCreateManualTransaction();

  // Fetch accounts
  const { data: employeesData } = useGetAccountsByType('employee', {}, isOpen);
  const { data: clientsData } = useGetAccountsByType('client', {}, isOpen);
  const { data: companyData } = useGetAccountsByType('company', {}, isOpen);

  // Direction selector state (if not preselected)
  const [direction, setDirection] = useState<'payout' | 'repayment'>(initialDirection || 'payout');

  // Transaction mode is always payout or repayment
  const transactionMode: ManualTransactionType = direction;

  // Form state for single-account transactions (payout/repayment only)
  const [accountType, setAccountType] = useState<AccountType>(
    frozenAccountType || preselectedAccount?.type || 'employee'
  );
  const [accountId, setAccountId] = useState<string>(
    (preselectedAccount?.id && preselectedAccount.id !== 0) ? preselectedAccount.id.toString() : ''
  );

  // Common fields
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  // Category is always 'other' by default and not shown in form
  const category = 'other';
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set preselected account
      if (preselectedAccount) {
        setAccountType(preselectedAccount.type);
        setAccountId(preselectedAccount.id !== 0 ? preselectedAccount.id.toString() : '');
      }
    }
  }, [isOpen, preselectedAccount]);

  // Get accounts by type
  const getAccountsByType = (type: AccountType) => {
    if (type === 'employee') return employeesData?.accounts || [];
    if (type === 'client') return clientsData?.accounts || [];
    if (type === 'company') return companyData?.accounts || [];
    return [];
  };

  // Get all accounts for lookups
  const allAccounts = [
    ...(employeesData?.accounts || []),
    ...(clientsData?.accounts || []),
    ...(companyData?.accounts || []),
  ];

  // Get selected accounts for preview
  const getSelectedAccount = (type: AccountType, id: string): UnifiedAccount | null => {
    if (!id || id === '') return null;
    const accounts = getAccountsByType(type);
    return accounts.find((a) => String(a.id) === id) || null;
  };

  // Get account based on form input
  const selectedAccount = getSelectedAccount(accountType, accountId);

  // For payout/repayment, company is always the other side
  const companyAccount = companyData?.accounts?.[0] || null;

  // Calculate preview balances
  const amountNum = parseFloat(amount) || 0;

  // Format currency (English numbers, bold)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get type icon
  const getTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'employee':
        return <User size={16} />;
      case 'client':
        return <Briefcase size={16} />;
      case 'company':
        return <Building size={16} />;
    }
  };

  // Get mode icon
  const getModeIcon = () => {
    switch (transactionMode) {
      case 'payout':
        return <TrendingDown size={18} className="text-status-danger-text" />;
      case 'repayment':
        return <TrendingUp size={18} className="text-status-success-text" />;
    }
  };

  // Calculate new balances (only payout/repayment)
  const calculateBalances = () => {
    if (!selectedAccount || amountNum === 0) {
      return null;
    }

    if (transactionMode === 'payout') {
      // Payout: Company pays account
      // Employee: CREDIT employee (balance decreases - company owes less)
      // Client: DEBIT client (balance increases - client owes us more)
      const isEmployee = accountType === 'employee';
      const accountNewBalance = isEmployee
        ? selectedAccount.balance - amountNum  // Employee: CREDIT reduces balance
        : selectedAccount.balance + amountNum; // Client: DEBIT increases balance

      return {
        accountCurrent: selectedAccount.balance,
        accountNew: accountNewBalance,
        companyCurrent: companyAccount?.balance || 0,
        companyNew: (companyAccount?.balance || 0) + (isEmployee ? amountNum : -amountNum),
      };
    } else if (transactionMode === 'repayment') {
      // Repayment: Account pays company
      // Employee: DEBIT employee (balance increases - employee owes more)
      // Client: CREDIT client (balance decreases - client owes us less)
      const isEmployee = accountType === 'employee';
      const accountNewBalance = isEmployee
        ? selectedAccount.balance + amountNum  // Employee: DEBIT increases balance
        : selectedAccount.balance - amountNum; // Client: CREDIT decreases balance

      return {
        accountCurrent: selectedAccount.balance,
        accountNew: accountNewBalance,
        companyCurrent: companyAccount?.balance || 0,
        companyNew: (companyAccount?.balance || 0) + (isEmployee ? -amountNum : amountNum),
      };
    }

    return null;
  };

  const balances = calculateBalances();

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description || !accountId) {
      error(TOAST_MESSAGES.VALIDATION_ERROR);
      return;
    }

    try {
      // Payout or Repayment
      await createTransaction.mutateAsync({
        type: transactionMode,
        account_type: accountType,
        account_id: Number(accountId),
        amount: parseFloat(amount),
        description,
        category: category as 'salary' | 'commission' | 'loan' | 'expense' | 'advance_repayment' | 'loan_repayment' | 'other',
        effective_date: `${effectiveDate}T12:00:00`,
        notes: notes || undefined,
      });

      // Show context-rich success message
      if (transactionMode === 'payout') {
        success(TOAST_MESSAGES.SANAD_SARF_CREATED, `تم إنشاء سند صرف بمبلغ ${amount} ريال`);
      } else {
        success(TOAST_MESSAGES.SANAD_QABD_CREATED, `تم إنشاء سند قبض بمبلغ ${amount} ريال`);
      }

      onClose();
      resetForm();
    } catch (err) {
      error(
        TOAST_MESSAGES.OPERATION_FAILED,
        err instanceof Error ? err.message : TOAST_MESSAGES.UNKNOWN_ERROR,
      );
    }
  };

  // Reset form
  const resetForm = () => {
    setDirection(initialDirection || 'payout');
    setAccountType(frozenAccountType || 'employee');
    setAccountId('');
    setAmount('');
    setDescription('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        transactionMode === 'payout'
          ? 'سند صرف'
          : 'سند قبض'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction Selector (if no preselectedAccount) */}
        {!preselectedAccount && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setDirection('payout')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${direction === 'payout'
                ? 'border-status-danger-border bg-status-danger-bg text-status-danger-text'
                : 'border-border-default hover:border-border-strong'
                }`}
            >
              <TrendingDown size={16} className="mx-auto mb-1" />
              سند صرف
            </button>
            <button
              type="button"
              onClick={() => setDirection('repayment')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${direction === 'repayment'
                ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                : 'border-border-default hover:border-border-strong'
                }`}
            >
              <TrendingUp size={16} className="mx-auto mb-1" />
              سند قبض
            </button>
          </div>
        )}
        {/* Account Type and Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              نوع الحساب
            </label>
            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value as AccountType);
                setAccountId('');
              }}
              disabled={!!frozenAccountType}
              className={`w-full px-3 py-2 text-sm border border-input rounded-md bg-background ${frozenAccountType ? 'bg-bg-surface-muted cursor-not-allowed opacity-75' : ''}`}
            >
              <option value="employee">موظف</option>
              <option value="client">عميل</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              اختر {accountType === 'employee' ? 'الموظف' : 'العميل'}
            </label>
            {accountType === 'client' ? (
              <ClientSearchCombobox
                value={accountId}
                onChange={(newValue) => {
                  console.log('Account client selected:', newValue);
                  setAccountId(newValue);
                }}
                placeholder="ابحث عن عميل..."
              />
            ) : (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                required
              >
                <option value="">اختر...</option>
                {getAccountsByType(accountType).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance)} SAR)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <NumberInput
              name="amount"
              label={<span>المبلغ <span className="text-status-danger-text">*</span></span> as any}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Date */}
          <div>
            <DateInput
              name="effectiveDate"
              label="تاريخ التنفيذ"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            الوصف <span className="text-status-danger-text">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            placeholder="مثال: راتب شهر ديسمبر، سلفة مستردة..."
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            ملاحظات (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="ملاحظات إضافية للتدقيق..."
          />
        </div>

        {/* PREVIEW */}
        {balances && selectedAccount && companyAccount && (
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-status-info-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                {getModeIcon()}
                <span className="font-bold text-base text-text-primary">معاينة المعاملة</span>
              </div>

              {/* Payout/Repayment Preview */}
              <div className="flex items-center gap-3">
                {/* Account */}
                <div className={`flex-1 rounded-lg border-2 bg-card p-4 shadow-sm ${transactionMode === 'payout'
                  ? (accountType === 'employee' ? 'border-status-danger-border' : 'border-status-success-border')
                  : (accountType === 'employee' ? 'border-status-success-border' : 'border-status-danger-border')
                  }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {getTypeIcon(selectedAccount.type)}
                    <span className="font-bold text-base text-text-primary">{selectedAccount.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-text-secondary">Current Balance:</span>
                      <span className="text-base font-bold text-text-primary">{formatCurrency(balances.accountCurrent)} SAR</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-border-default">
                      <span className="text-sm font-medium text-text-secondary">New Balance:</span>
                      <span className={`text-lg font-black ${balances.accountNew > balances.accountCurrent ? 'text-status-success-text' : 'text-status-danger-text'
                        }`}>
                        {formatCurrency(balances.accountNew)} SAR
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={`inline-block px-3 py-1 font-bold text-sm rounded-full ${balances.accountNew > balances.accountCurrent
                        ? 'bg-status-success-bg text-status-success-text'
                        : 'bg-status-danger-bg text-status-danger-text'
                        }`}>
                        {balances.accountNew > balances.accountCurrent ? '+' : ''}{formatCurrency(balances.accountNew - balances.accountCurrent)} SAR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight size={24} className="text-status-info-text flex-shrink-0 font-bold" />

                {/* Company */}
                <div className={`flex-1 rounded-lg border-2 bg-card p-4 shadow-sm ${transactionMode === 'payout'
                  ? (accountType === 'employee' ? 'border-status-success-border' : 'border-status-danger-border')
                  : (accountType === 'employee' ? 'border-status-danger-border' : 'border-status-success-border')
                  }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {getTypeIcon('company')}
                    <span className="font-bold text-base text-text-primary">{companyAccount.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-text-secondary">Current Balance:</span>
                      <span className="text-base font-bold text-text-primary">{formatCurrency(balances.companyCurrent)} SAR</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-border-default">
                      <span className="text-sm font-medium text-text-secondary">New Balance:</span>
                      <span className={`text-lg font-black ${balances.companyNew > balances.companyCurrent ? 'text-status-success-text' : 'text-status-danger-text'
                        }`}>
                        {formatCurrency(balances.companyNew)} SAR
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={`inline-block px-3 py-1 font-bold text-sm rounded-full ${balances.companyNew > balances.companyCurrent
                        ? 'bg-status-success-bg text-status-success-text'
                        : 'bg-status-danger-bg text-status-danger-text'
                        }`}>
                        {balances.companyNew > balances.companyCurrent ? '+' : ''}{formatCurrency(balances.companyNew - balances.companyCurrent)} SAR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Recipient Warning */}
        {selectedAccount && !balances && amountNum > 0 && (
          <Card className="bg-status-warning-bg border-2 border-amber-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-status-warning-text flex-shrink-0" />
                <span className="text-sm font-bold text-status-warning-text">
                  يرجى إدخال مبلغ صحيح لعرض المعاينة
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t-2 border-border-default">
          <Button type="button" variant="outline-primary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createTransaction.isPending}
          >
            إنشاء المعاملة
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default ManualTransactionModal;
