import React, { useState, useEffect, useMemo } from 'react';
import { Award, RotateCcw, CheckCircle2, Users, AlertCircle, Save, Building2, Undo2 } from 'lucide-react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import {
  useCommissionExpenseConfig,
  useSetCommissionExpenseAccount,
  useSetEmployeeCommissionAccount,
  useResetAllEmployeesCommissionAccounts,
  useMigrateCommissions,
} from '../api/treasuryQueries';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { Spinner } from '@/shared/ui/shadcn/spinner';

export const CommissionExpenseManagerModal: React.FC = () => {
  const { isOpen, modalType, closeModal } = useModalStore();
  const toast = useToast();
  const isModalOpen = isOpen && modalType === 'commissionExpenseManager';

  const { data: config, isLoading, refetch } = useCommissionExpenseConfig();
  const setGlobalAccountMutation = useSetCommissionExpenseAccount();
  const setEmployeeAccountMutation = useSetEmployeeCommissionAccount();
  const resetAllEmployeesMutation = useResetAllEmployeesCommissionAccounts();
  const migrateMutation = useMigrateCommissions();

  const [selectedGlobalAccountId, setSelectedGlobalAccountId] = useState<number | ''>('');
  const [updatingEmployeeId, setUpdatingEmployeeId] = useState<number | null>(null);

  useEffect(() => {
    if (config?.assigned_account?.id) {
      setSelectedGlobalAccountId(config.assigned_account.id);
    }
  }, [config?.assigned_account?.id]);

  const assignedAccount = config?.assigned_account;
  const expenseAccounts = config?.expense_accounts || [];
  const employees = config?.employees || [];
  const stats = config?.stats;

  const unmigratedCount = stats?.unmigrated_count || 0;
  const unmigratedAmount = stats?.unmigrated_amount || 0;

  const hasAnyCustomEmployees = useMemo(() => {
    return employees.some((e) => e.custom_account_id !== null && e.custom_account_id > 0);
  }, [employees]);

  const hasGlobalChanged = selectedGlobalAccountId !== '' && selectedGlobalAccountId !== assignedAccount?.id;

  if (!isModalOpen) return null;

  const handleSaveGlobalAccount = () => {
    if (!selectedGlobalAccountId) return;
    setGlobalAccountMutation.mutate(selectedGlobalAccountId, {
      onSuccess: () => {
        toast.success('تم الحفظ بنجاح', 'تم تحديث الحساب الافتراضي لعمولات الموظفين');
        refetch();
      },
      onError: (err: any) => {
        toast.error('خطأ', err?.message || 'فشل تحديث الحساب الافتراضي');
      },
    });
  };

  const handleEmployeeAccountChange = (employeeId: number, targetAccountId: number | null) => {
    setUpdatingEmployeeId(employeeId);
    setEmployeeAccountMutation.mutate(
      { employeeId, accountId: targetAccountId },
      {
        onSuccess: (res) => {
          toast.success('تم التحديث', res?.message || 'تم تحديث حساب عمولة الموظف بنجاح');
          refetch();
          setUpdatingEmployeeId(null);
        },
        onError: (err: any) => {
          toast.error('خطأ', err?.message || 'فشل تحديث حساب الموظف');
          setUpdatingEmployeeId(null);
        },
      }
    );
  };

  const handleResetAllToDefault = () => {
    if (window.confirm('هل أنت متأكد من إعادة جميع الموظفين لاستخدام الحساب الافتراضي العام للمؤسسة؟')) {
      resetAllEmployeesMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('تمت العملية بنجاح', 'تمت إعادة جميع الموظفين لاستخدام الحساب الافتراضي للمؤسسة');
          refetch();
        },
        onError: (err: any) => {
          toast.error('خطأ', err?.message || 'فشل إعادة ضبط الحسابات');
        },
      });
    }
  };

  const handleMigrate = () => {
    if (!assignedAccount?.id) return;
    const confirmText = `هل أنت متأكد من ترحيل ${unmigratedCount} قيد عمولة سابق بقيمة ${formatCurrency(unmigratedAmount)} ر.س إلى الحساب المعتمد (${assignedAccount.name})؟`;
    if (window.confirm(confirmText)) {
      migrateMutation.mutate(assignedAccount.id, {
        onSuccess: (res) => {
          toast.success('تم الترحيل بنجاح', res?.message || 'تم ترحيل جميع القيود السابقة بنجاح');
          refetch();
        },
        onError: (err: any) => {
          toast.error('خطأ في الترحيل', err?.message || 'حدث خطأ أثناء الترحيل');
        },
      });
    }
  };

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title="إدارة حسابات عمولات ونسب الموظفين"
      className="max-w-4xl"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner size="lg" />
            <span className="text-sm text-text-secondary">جاري تحميل بيانات حسابات العمولات...</span>
          </div>
        ) : (
          <>
            {/* ========================================================
                CARD 1: GLOBAL DEFAULT COMMISSION EXPENSE ACCOUNT
                ======================================================== */}
            <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-status-info-bg text-status-info-text border border-status-info-border">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-text-primary mb-0.5">
                      الحساب الافتراضي العام (لكل الموظفين)
                    </h6>
                    <p className="text-xs text-text-secondary mb-0">
                      يتم قيد عمولات المهام المكتملة في هذا الحساب كطرف مدين (مصروفات) لأي موظف ليس لديه تخصيص فردي.
                    </p>
                  </div>
                </div>

                {assignedAccount && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-status-success-bg text-status-success-text border border-status-success-border shrink-0">
                    الحساب المعتمد حالياً: {assignedAccount.name}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <div className="flex-1">
                  <select
                    value={selectedGlobalAccountId}
                    onChange={(e) => setSelectedGlobalAccountId(Number(e.target.value))}
                    className="w-full h-10 rounded-lg border border-border-default bg-card px-3 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="" disabled>
                      -- اختر حساب مصروفات العمولات --
                    </option>
                    {expenseAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_number ? `[${acc.account_number}] ` : ''}{acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="h-10 px-4 font-bold text-xs shrink-0 flex items-center justify-center gap-1.5"
                  disabled={!hasGlobalChanged || setGlobalAccountMutation.isPending}
                  isLoading={setGlobalAccountMutation.isPending}
                  onClick={handleSaveGlobalAccount}
                >
                  <Save size={15} />
                  <span>اعتماد كحساب رئيسي</span>
                </Button>
              </div>
            </div>

            {/* ========================================================
                CARD 2: HISTORIC COMMISSIONS MIGRATION (OR COMPACT STATUS)
                ======================================================== */}
            {unmigratedCount > 0 ? (
              <div className="rounded-xl border border-status-danger-border bg-status-danger-bg/20 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-status-danger-bg text-status-danger-text border border-status-danger-border shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-status-danger-text mb-0.5">
                      ترحيل قيود العمولات السابقة
                    </h6>
                    <p className="text-xs text-text-secondary mb-0">
                      يوجد <strong className="text-text-primary">{unmigratedCount}</strong> قيد عمولة سابق مسجل في حسابات قديمة بإجمالي{' '}
                      <strong className="text-text-primary">{formatCurrency(unmigratedAmount)} ر.س</strong>. يمكنك نقلها إلى الحساب المعتمد بنقرة واحدة.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline-danger"
                  size="sm"
                  className="font-bold text-xs whitespace-nowrap h-9 px-3.5 shrink-0"
                  isLoading={migrateMutation.isPending}
                  onClick={handleMigrate}
                >
                  <RotateCcw size={14} className="me-1.5" />
                  ترحيل الآن ({unmigratedCount} قيد)
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-status-success-bg/30 border border-status-success-border/50 text-xs text-status-success-text font-medium">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>جميع قيود العمولات السابقة مسجلة ومرحلة بشكل سليم في حساب مصروفات العمولات.</span>
              </div>
            )}

            {/* ========================================================
                CARD 3: PER-EMPLOYEE ACCOUNT CUSTOMIZATION TABLE
                ======================================================== */}
            <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-2xs">
              <div className="p-3.5 border-b border-border-default bg-bg-surface-muted/30 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <div>
                    <h6 className="font-bold text-sm text-text-primary mb-0.5">
                      تخصيص حسابات العمولات بالموظف
                    </h6>
                    <p className="text-xs text-text-secondary mb-0">
                      حدد ما إذا كان الموظف يتبع الحساب الافتراضي للمؤسسة، أو حدد حساب مصروفات مخصص لعمولاته.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1"
                    disabled={!hasAnyCustomEmployees || resetAllEmployeesMutation.isPending}
                    isLoading={resetAllEmployeesMutation.isPending}
                    onClick={handleResetAllToDefault}
                    title="إعادة جميع الموظفين لاستخدام الحساب الافتراضي العام بنقرة واحدة"
                  >
                    <Undo2 size={13} />
                    <span>تعيين الكل على الافتراضي العام</span>
                  </Button>
                  <span className="text-xs font-semibold text-text-secondary bg-background px-2.5 py-1 rounded-md border border-border-default">
                    {employees.length} موظف
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-border-default bg-bg-surface-muted/50 text-text-secondary font-bold">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-44">اسم الموظف</th>
                      <th className="py-2.5 px-3 text-center w-24">نسبة العمولة</th>
                      <th className="py-2.5 px-3 min-w-[280px]">حساب مصروف العمولة</th>
                      <th className="py-2.5 px-3 text-center w-32">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {employees.map((emp, idx) => {
                      const isCustom = emp.custom_account_id !== null && emp.custom_account_id > 0;
                      const isUpdating = updatingEmployeeId === emp.id;

                      return (
                        <tr key={emp.id} className="hover:bg-bg-surface-hover/50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-text-secondary font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-text-primary">{emp.name}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-text-primary">
                            {emp.commission_rate}%
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={emp.custom_account_id || ''}
                              disabled={isUpdating}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                handleEmployeeAccountChange(emp.id, val);
                              }}
                              className="w-full h-9 rounded-lg border border-border-default bg-card px-2.5 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
                            >
                              <option value="">
                                🏢 الافتراضي العام للمؤسسة ({assignedAccount?.name || 'غير محدد'})
                              </option>
                              {expenseAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  👤 {acc.account_number ? `[${acc.account_number}] ` : ''}{acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isUpdating ? (
                              <div className="flex items-center justify-center gap-1 text-text-secondary">
                                <Spinner size="sm" />
                                <span className="text-2xs">جاري الحفظ...</span>
                              </div>
                            ) : isCustom ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-status-info-bg text-status-info-text border border-status-info-border">
                                مخصص فردياً
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted/40 text-text-secondary border border-border-default">
                                الافتراضي العام
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2 border-t border-border-default">
          <Button variant="outline-primary" size="sm" onClick={closeModal} className="px-5 font-bold text-xs">
            إغلاق
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
export default CommissionExpenseManagerModal;
