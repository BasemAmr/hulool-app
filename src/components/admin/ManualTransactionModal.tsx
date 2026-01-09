/**
 * ManualTransactionModal
 * 
 * Modal for admin to create manual transactions:
 * - Transfers: Double-entry between two accounts
 * - Payout (Sarf): Company pays employee/client
 * - Repayment (Qabd): Employee/client pays company back
 */

import { useState, useEffect } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import { Card, CardContent } from '../ui/card';
import ClientSearchCombobox from '../ui/ClientSearchCombobox';
import { NumberInput } from '../ui/NumberInput';
import { DateInput } from '../ui/DateInput';
import { useCreateManualTransaction, useGetAccountsByType } from '../../queries/financialCenterQueries';
import { useToast } from '../../hooks/useToast';
import { ArrowRight, AlertCircle, User, Building, Briefcase, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import type {
  AccountType,
  UnifiedAccount,
  ManualTransactionType
} from '../../api/types';
import { TOAST_MESSAGES } from '../../constants/toastMessages';

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
        return <TrendingDown size={18} className="text-red-600" />;
      case 'repayment':
        return <TrendingUp size={18} className="text-green-600" />;
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
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <TrendingDown size={16} className="mx-auto mb-1" />
              سند صرف
            </button>
            <button
              type="button"
              onClick={() => setDirection('repayment')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${direction === 'repayment'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
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
            <label className="block text-sm font-medium text-black mb-1">
              نوع الحساب
            </label>
            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value as AccountType);
                setAccountId('');
              }}
              disabled={!!frozenAccountType}
              className={`w-full px-3 py-2 text-sm border border-input rounded-md bg-background ${frozenAccountType ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
            >
              <option value="employee">موظف</option>
              <option value="client">عميل</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
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
              label={<span>المبلغ <span className="text-red-500">*</span></span> as any}
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
          <label className="block text-sm font-medium text-black mb-1">
            الوصف <span className="text-red-500">*</span>
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
          <label className="block text-sm font-medium text-black mb-1">
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
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                {getModeIcon()}
                <span className="font-bold text-base text-black">معاينة المعاملة</span>
              </div>

              {/* Payout/Repayment Preview */}
              <div className="flex items-center gap-3">
                {/* Account */}
                <div className={`flex-1 p-4 bg-white rounded-lg border-2 shadow-sm ${transactionMode === 'payout'
                  ? (accountType === 'employee' ? 'border-red-300' : 'border-green-300')
                  : (accountType === 'employee' ? 'border-green-300' : 'border-red-300')
                  }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {getTypeIcon(selectedAccount.type)}
                    <span className="font-bold text-base text-black">{selectedAccount.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Current Balance:</span>
                      <span className="text-base font-bold text-black">{formatCurrency(balances.accountCurrent)} SAR</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200">
                      <span className="text-sm font-medium text-gray-700">New Balance:</span>
                      <span className={`text-lg font-black ${balances.accountNew > balances.accountCurrent ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatCurrency(balances.accountNew)} SAR
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={`inline-block px-3 py-1 font-bold text-sm rounded-full ${balances.accountNew > balances.accountCurrent
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {balances.accountNew > balances.accountCurrent ? '+' : ''}{formatCurrency(balances.accountNew - balances.accountCurrent)} SAR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight size={24} className="text-blue-600 flex-shrink-0 font-bold" />

                {/* Company */}
                <div className={`flex-1 p-4 bg-white rounded-lg border-2 shadow-sm ${transactionMode === 'payout'
                  ? (accountType === 'employee' ? 'border-green-300' : 'border-red-300')
                  : (accountType === 'employee' ? 'border-red-300' : 'border-green-300')
                  }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {getTypeIcon('company')}
                    <span className="font-bold text-base text-black">{companyAccount.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Current Balance:</span>
                      <span className="text-base font-bold text-black">{formatCurrency(balances.companyCurrent)} SAR</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200">
                      <span className="text-sm font-medium text-gray-700">New Balance:</span>
                      <span className={`text-lg font-black ${balances.companyNew > balances.companyCurrent ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatCurrency(balances.companyNew)} SAR
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={`inline-block px-3 py-1 font-bold text-sm rounded-full ${balances.companyNew > balances.companyCurrent
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
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
          <Card className="bg-amber-50 border-2 border-amber-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
                <span className="text-sm font-bold text-amber-900">
                  يرجى إدخال مبلغ صحيح لعرض المعاينة
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t-2 border-gray-200">
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
