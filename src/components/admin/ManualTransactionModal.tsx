/**
 * ManualTransactionModal
 * 
 * Modal for admin to create manual transactions
 * - Double-entry transfers between accounts
 * - Always creates linked transactions for double-entry accounting
 */

import { useState, useEffect } from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import { Card, CardContent } from '../ui/card';
import ClientSearchCombobox from '../ui/ClientSearchCombobox';
import { useCreateManualTransaction, useGetAccountsByType } from '../../queries/financialCenterQueries';
import { useToast } from '../../hooks/useToast';
import { ArrowRight, AlertCircle, User, Building, Briefcase } from 'lucide-react';
import type { 
  AccountType, 
  UnifiedAccount 
} from '../../api/types';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAccount?: UnifiedAccount;
  preselectedToAccount?: UnifiedAccount;
  direction?: 'credit' | 'debit';
}

const ManualTransactionModal = ({
  isOpen,
  onClose,
  preselectedAccount,
  preselectedToAccount,
}: ManualTransactionModalProps) => {
  const { showToast } = useToast();
  const createTransaction = useCreateManualTransaction();
  
  // Fetch only employees and company accounts (not all)
  const { data: employeesData } = useGetAccountsByType('employee', {}, isOpen);
  const { data: companyData } = useGetAccountsByType('company', {}, isOpen);

  // Form state - always use transfer (double-entry)
  const [fromAccountType, setFromAccountType] = useState<AccountType>(
    preselectedAccount?.type || 'employee'
  );
  const [fromAccountId, setFromAccountId] = useState<string>(
    (preselectedAccount?.id && preselectedAccount.id !== 0) ? preselectedAccount.id.toString() : ''
  );
  const [toAccountType, setToAccountType] = useState<AccountType>(
    preselectedToAccount?.type || 'company'
  );
  const [toAccountId, setToAccountId] = useState<string>(
    (preselectedToAccount?.id && preselectedToAccount.id !== 0) ? preselectedToAccount.id.toString() : ''
  );
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  // Reset form when modal opens with preselected values
  useEffect(() => {
    if (isOpen) {
      if (preselectedAccount) {
        setFromAccountType(preselectedAccount.type);
        setFromAccountId(preselectedAccount.id !== 0 ? preselectedAccount.id.toString() : '');
      }
      if (preselectedToAccount) {
        setToAccountType(preselectedToAccount.type);
        setToAccountId(preselectedToAccount.id !== 0 ? preselectedToAccount.id.toString() : '');
      }
    }
  }, [isOpen, preselectedAccount, preselectedToAccount]);

  // Get accounts by type from fetched data
  const getAccountsByType = (type: AccountType) => {
    if (type === 'employee') return employeesData?.accounts || [];
    if (type === 'company') return companyData?.accounts || [];
    return []; // Clients handled by combobox
  };

  // Get selected accounts for preview
  const allAccounts = [
    ...(employeesData?.accounts || []),
    ...(companyData?.accounts || []),
  ];
  const selectedFromAccount = allAccounts.find(
    (a) => a.type === fromAccountType && String(a.id) === fromAccountId
  );
  const selectedToAccount = toAccountId && toAccountId !== '' 
    ? allAccounts.find((a) => a.type === toAccountType && String(a.id) === toAccountId)
    : null;

  // Calculate preview
  const amountNum = parseFloat(amount) || 0;
  const fromNewBalance = selectedFromAccount
    ? selectedFromAccount.balance - amountNum
    : 0;
  const toNewBalance = selectedToAccount
    ? selectedToAccount.balance + amountNum
    : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get type icon
  const getTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'employee':
        return <User size={14} />;
      case 'client':
        return <Briefcase size={14} />;
      case 'company':
        return <Building size={14} />;
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromAccountId || !toAccountId || !amount || !description) {
      showToast({ type: 'error', title: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    try {
      await createTransaction.mutateAsync({
        type: 'transfer',
        from_account_type: fromAccountType,
        from_account_id: Number(fromAccountId),
        to_account_type: toAccountType,
        to_account_id: Number(toAccountId),
        amount: parseFloat(amount),
        description,
        effective_date: `${effectiveDate}T12:00:00`,
        notes: notes || undefined,
      });

      showToast({ type: 'success', title: 'تم إنشاء المعاملة بنجاح' });
      onClose();
      resetForm();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'فشل إنشاء المعاملة',
        message: err instanceof Error ? err.message : 'حدث خطأ',
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFromAccountType('employee');
    setFromAccountId('');
    setToAccountType('company');
    setToAccountId('');
    setAmount('');
    setDescription('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء معاملة"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From Account */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              من حساب
            </label>
            <select
              value={fromAccountType}
              onChange={(e) => {
                setFromAccountType(e.target.value as AccountType);
                setFromAccountId('');
              }}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            >
              <option value="employee">موظف</option>
              <option value="client">عميل</option>
              <option value="company">شركة</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              اختر الحساب
            </label>
            {fromAccountType === 'client' ? (
              <ClientSearchCombobox
                value={fromAccountId}
                onChange={setFromAccountId}
                placeholder="ابحث عن عميل..."
              />
            ) : (
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                required
              >
                <option value="">اختر...</option>
                {getAccountsByType(fromAccountType).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance)} ر.س)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* To Account */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              إلى حساب
            </label>
            <select
              value={toAccountType}
              onChange={(e) => {
                setToAccountType(e.target.value as AccountType);
                setToAccountId('');
              }}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            >
              <option value="employee">موظف</option>
              <option value="client">عميل</option>
              <option value="company">شركة</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              اختر الحساب المستلم
            </label>
            {toAccountType === 'client' ? (
              <ClientSearchCombobox
                value={toAccountId}
                onChange={setToAccountId}
                placeholder="ابحث عن عميل..."
              />
            ) : (
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                required
              >
                <option value="">اختر...</option>
                {getAccountsByType(toAccountType)
                  .filter(
                    (a) =>
                      !(a.type === fromAccountType && String(a.id) === fromAccountId)
                  )
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)} ر.س)
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            المبلغ <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background pr-10"
              placeholder="0.00"
              required
            />
            <SaudiRiyalIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
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
            placeholder="مثال: مكافأة أداء، سلفة مستردة..."
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            تاريخ التنفيذ
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
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
            rows={2}
            placeholder="ملاحظات إضافية للتدقيق..."
          />
        </div>

        {/* Preview */}
        {selectedFromAccount && selectedToAccount && amountNum > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={16} className="text-primary" />
                <span className="font-medium text-sm">معاينة المعاملة</span>
              </div>

              {/* Transfer Preview */}
              <div className="flex items-center gap-3 text-sm">
                {/* From Account */}
                <div className="flex-1 p-3 bg-background rounded-md border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(selectedFromAccount.type)}
                    <span className="font-medium">{selectedFromAccount.name}</span>
                  </div>
                  <div className="text-xs text-black/60 mb-2">
                    <span className="block">الرصيد الحالي: {formatCurrency(selectedFromAccount.balance)} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-red-200 pt-2">
                    <span className="text-black/60">الرصيد الجديد:</span>
                    <span className="font-bold text-red-600">{formatCurrency(fromNewBalance)} ر.س</span>
                  </div>
                  <span className="text-red-600 text-xs font-medium mt-2 block">-{formatCurrency(amountNum)} ر.س</span>
                </div>

                {/* Arrow */}
                <ArrowRight size={20} className="text-primary flex-shrink-0" />

                {/* To Account */}
                <div className="flex-1 p-3 bg-background rounded-md border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(selectedToAccount.type)}
                    <span className="font-medium">{selectedToAccount.name}</span>
                  </div>
                  <div className="text-xs text-black/60 mb-2">
                    <span className="block">الرصيد الحالي: {formatCurrency(selectedToAccount.balance)} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-green-200 pt-2">
                    <span className="text-black/60">الرصيد الجديد:</span>
                    <span className="font-bold text-green-600">{formatCurrency(toNewBalance)} ر.س</span>
                  </div>
                  <span className="text-green-600 text-xs font-medium mt-2 block">+{formatCurrency(amountNum)} ر.س</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Recipient Alert */}
        {selectedFromAccount && !selectedToAccount && amountNum > 0 && (
          <Card className="bg-amber-50 border border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="text-sm text-amber-700">يرجى تحديد الحساب المستلم لعرض المعاينة الكاملة</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
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
