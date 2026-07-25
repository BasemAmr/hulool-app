import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { Wallet, Landmark, UserCheck } from 'lucide-react';
import { useGetTreasuryAccounts, useGetMyTreasuryAccounts } from '@/features/financials/api/treasuryQueries';
import { useAuthStore } from '@/features/auth/store/authStore';

type SelectionScope = 'all' | 'single' | null;

interface TreasuryAccountReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subType?: 'cashbox' | 'bank';
}

const TreasuryAccountReportModal = ({ isOpen, onClose, subType = 'cashbox' }: TreasuryAccountReportModalProps) => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [selectionScope, setSelectionScope] = useState<SelectionScope>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const { data: adminAccounts = [] } = useGetTreasuryAccounts();
  const { data: employeeAccounts = [] } = useGetMyTreasuryAccounts();

  const allAccounts: any[] = isAdmin ? adminAccounts : employeeAccounts;

  const filteredAccounts = useMemo(() => {
    return allAccounts.filter((a: any) => a.sub_type === subType);
  }, [allAccounts, subType]);

  useEffect(() => {
    if (isOpen) {
      setSelectionScope(null);
      setSelectedAccountId('');
    }
  }, [isOpen]);

  const handleSelectScope = (scope: SelectionScope) => {
    setSelectionScope(scope);
    if (scope === 'all') {
      setSelectedAccountId('');
    }
  };

  const isBank = subType === 'bank';
  const modalTitle = isBank ? 'كشف حساب بنك' : 'كشف حساب صندوق';
  const singleLabel = isBank ? 'اختر بنك' : 'اختر صندوق';
  const singlePlaceholder = isBank ? '-- اختر حساب بنكي --' : '-- اختر صندوق --';
  const Icon = isBank ? Landmark : Wallet;

  const canProceed = selectionScope === 'all' || (selectionScope === 'single' && selectedAccountId !== '');

  const handleConfirmAction = () => {
    if (selectionScope === 'all') {
      if (isAdmin) {
        navigate(`/financial-center/treasury-accounts?section=assets&category=${subType}`);
      } else {
        navigate('/employee/dashboard');
      }
      onClose();
    } else if (selectionScope === 'single' && selectedAccountId) {
      if (isAdmin) {
        navigate(`/financial-center/treasury-accounts/${selectedAccountId}`);
      } else {
        navigate(`/employee/treasury-accounts/${selectedAccountId}`);
      }
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={modalTitle} titleClassName="text-center w-full ms-6">
      <div className="space-y-5">
        {/* Scope Selection Cards */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-text-primary text-center">اختر نطاق التقرير</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSelectScope('all')}
              className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                selectionScope === 'all'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border-default hover:border-primary/40 text-text-secondary'
              }`}
            >
              <Icon size={28} className="mx-auto mb-2 text-primary" />
              <span className="block text-base font-bold text-text-primary">الكل</span>
              <span className="block text-xs text-text-secondary mt-1">
                {isBank ? 'عرض جميع الحسابات البنكية' : 'عرض جميع الصناديق'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectScope('single')}
              className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                selectionScope === 'single'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border-default hover:border-primary/40 text-text-secondary'
              }`}
            >
              <UserCheck size={28} className="mx-auto mb-2 text-primary" />
              <span className="block text-base font-bold text-text-primary">{singleLabel}</span>
              <span className="block text-xs text-text-secondary mt-1">تحديد حساب محدد من القائمة</span>
            </button>
          </div>

          {/* Conditionally Rendered Select Dropdown when "اختر صندوق/بنك" is selected */}
          {selectionScope === 'single' && (
            <div className="pt-2 animate-in fade-in-50 duration-150">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {isBank ? 'الحساب البنكي' : 'الصندوق'}
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="base-input w-full"
              >
                <option value="">{singlePlaceholder}</option>
                {filteredAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id.toString()}>
                    {acc.name} {acc.account_number ? `(${acc.account_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-border-default">
          <Button type="button" variant="outline-primary" onClick={onClose}>
            إلغاء
          </Button>

          <Button type="button" variant="primary" disabled={!canProceed} onClick={handleConfirmAction}>
            {selectionScope === 'all'
              ? isBank
                ? 'عرض جميع الحسابات البنكية'
                : 'عرض جميع الصناديق'
              : 'عرض كشف الحساب المالي'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TreasuryAccountReportModal;
