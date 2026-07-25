import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/client';
import BaseModal from '@/shared/ui/layout/BaseModal';
import ClientSearchCombobox from '@/shared/search/ClientSearchCombobox';
import Button from '@/shared/ui/primitives/Button';
import { useToast } from '@/shared/hooks/useToast';
import { exportService } from '@/services/export/ExportService';
import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';
import { FileSpreadsheet, ClipboardList, DollarSign, Users, UserCheck } from 'lucide-react';
import type { Client, ApiResponse } from '@/api/types';
import type { ClientStatementReportData, ClientTasksReportData } from '@/services/export/exportTypes';

import { useAuthStore } from '@/features/auth/store/authStore';

type ReportType = 'tasks' | 'financial';

interface ClientReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ClientReportModal = ({ isOpen, onClose }: ClientReportModalProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { success, error: showError } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReportType(null);
      setClientId('');
      setClientData(null);
      setIsAllSelected(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (clientId && clientId !== '0') {
      apiClient.get<ApiResponse<Client>>(`/clients/${clientId}`).then((res) => {
        if (res.data.success) setClientData(res.data.data);
      });
    } else {
      setClientData(null);
    }
  }, [clientId]);

  const handleSelectClient = (newValue: string) => {
    setClientId(newValue);
    if (newValue) {
      setIsAllSelected(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setIsAllSelected(false);
    } else {
      setIsAllSelected(true);
      setClientId('');
      setClientData(null);
    }
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!reportType) throw new Error('Missing data');

      if (reportType === 'financial') {
        if (!clientId || !clientData) throw new Error('Missing client data');
        const { data } = await apiClient.get<ApiResponse<any>>(`/receivables/client/${clientId}`);
        if (!data.success) throw new Error(data.message || 'Failed to fetch statement');

        const sData = data.data;
        const statementItems = (sData.statementItems || []).map((item: any) => ({
          id: Number(item.id),
          description: item.description || '',
          debit: Number(item.debit || 0),
          credit: Number(item.credit || 0),
          date: item.date || new Date().toISOString(),
          type: item.type || 'Other',
          transaction_type: item.transaction_type as any,
          reference_id: item.reference_id,
          details: item.details,
        }));

        const totalDebit = statementItems.reduce((sum: number, i: any) => sum + i.debit, 0);
        const totalCredit = statementItems.reduce((sum: number, i: any) => sum + i.credit, 0);
        const balance = statementItems.length > 0 ? statementItems[statementItems.length - 1].balance : 0;

        const reportData: ClientStatementReportData = {
          client: clientData,
          clientName: clientData.name,
          clientPhone: clientData.phone || '',
          statementItems,
          totals: { totalDebit, totalCredit, balance },
          period: {
            from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0],
          },
        };

        await exportService.exportClientStatement(reportData);
      } else {
        if (!clientId || !clientData) throw new Error('Missing client data');
        const { data } = await apiClient.get<ApiResponse<any>>('/tasks', {
          params: { client_id: Number(clientId), page: 1, per_page: 1000 },
        });
        if (!data.success) throw new Error(data.message || 'Failed to fetch tasks');

        const tasks = (data.data?.tasks || []).map((task: any) => ({
          ...task,
          client_name: clientData.name,
          client_phone: clientData.phone || '',
          service_name: task.task_name || task.type,
          task_type: task.type,
          amount_paid: task.receivable ? task.amount - task.receivable.amount : task.amount,
          amount_remaining: task.receivable?.amount || 0,
          is_overdue: task.receivable
            ? new Date(task.receivable.due_date || '') < new Date() && task.status !== 'Completed'
            : false,
        }));

        const completedTasks = tasks.filter((t: any) => t.status === 'Completed').length;
        const cancelledTasks = tasks.filter((t: any) => t.status === 'Cancelled').length;
        const totalAmount = tasks.reduce((sum: number, t: any) => sum + t.amount, 0);
        const totalPaid = tasks.reduce((sum: number, t: any) => sum + t.amount_paid, 0);
        const totalRemaining = tasks.reduce((sum: number, t: any) => sum + t.amount_remaining, 0);

        const reportData: ClientTasksReportData = {
          client: clientData,
          tasks,
          summary: {
            total_tasks: tasks.length,
            completed_tasks: completedTasks,
            in_progress_tasks: tasks.filter((t: any) => !t.status?.match(/Completed|Cancelled/)).length,
            new_tasks: tasks.filter((t: any) => t.status === 'New').length,
            cancelled_tasks: cancelledTasks,
            total_amount: totalAmount,
            total_paid: totalPaid,
            total_remaining: totalRemaining,
            average_completion_days: 0,
          },
        };

        await exportService.exportClientTasks(reportData);
      }
    },
    onSuccess: () => {
      success(TOAST_MESSAGES.EXPORT_SUCCESS);
      onClose();
    },
    onError: (err: Error) => {
      showError(TOAST_MESSAGES.EXPORT_FAILED, err.message);
    },
  });

  const canExportSingle = reportType && clientId && clientId !== '0' && clientData;
  const canProceed = isAllSelected || canExportSingle;

  const handleConfirmAction = () => {
    if (isAllSelected) {
      const isAdminRole = useAuthStore.getState().isAdmin();
      navigate(isAdminRole ? '/receivables' : '/employee/receivables');
      onClose();
    } else if (canExportSingle) {
      const isAdminRole = useAuthStore.getState().isAdmin();
      navigate(isAdminRole ? `/clients/${clientId}?mode=receivables` : `/employee/clients/${clientId}?mode=receivables`);
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="كشف حساب عميل" titleClassName="text-center w-full ms-6">
      <div className="space-y-5">
        {step === 1 && (
          <>
            <p className="text-sm font-medium text-text-secondary text-center">اختر نوع التقرير</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setReportType('financial'); setStep(2); }}
                className={`p-6 rounded-xl border-2 text-center transition-all ${
                  reportType === 'financial'
                    ? 'border-primary bg-primary/5'
                    : 'border-border-default hover:border-primary/40'
                }`}
              >
                <DollarSign size={36} className="mx-auto mb-3 text-primary" />
                <span className="block text-lg font-bold text-text-primary">مالي</span>
                <span className="block text-xs text-text-secondary mt-1">تصدير كشف حساب العميل المالي</span>
              </button>
              <button
                type="button"
                onClick={() => { setReportType('tasks'); setStep(2); }}
                className={`p-6 rounded-xl border-2 text-center transition-all ${
                  reportType === 'tasks'
                    ? 'border-primary bg-primary/5'
                    : 'border-border-default hover:border-primary/40'
                }`}
              >
                <ClipboardList size={36} className="mx-auto mb-3 text-primary" />
                <span className="block text-lg font-bold text-text-primary">معاملات</span>
                <span className="block text-xs text-text-secondary mt-1">تصدير المهام المرتبطة بالعميل</span>
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-primary font-bold hover:underline"
              >
                &larr; تغيير نوع التقرير
              </button>
              <span className="text-sm font-bold text-text-primary px-3 py-1 rounded-full bg-primary/10">
                {reportType === 'tasks' ? 'معاملات' : 'مالي'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-text-primary">اختر العميل</label>

                {/* Option to select All clients (mutually exclusive with picking a single client) */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    isAllSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border-default text-primary hover:border-primary'
                  }`}
                >
                  <Users size={14} />
                  <span>جميع العملاء</span>
                  {isAllSelected && <UserCheck size={14} className="ms-1" />}
                </button>
              </div>

              <ClientSearchCombobox
                value={clientId}
                onChange={handleSelectClient}
                placeholder={isAllSelected ? "تم تحديد جميع العملاء — ابحث لتحديد عميل معين..." : "ابحث عن عميل..."}
              />
              {isAllSelected && (
                <p className="text-xs font-bold text-primary">✓ تم تحديد جميع العملاء. اضغط على الزر أدناه للانتقال لصفحة المستحقات.</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border-default">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline-primary" onClick={onClose}>
                  إلغاء
                </Button>
                <Button type="button" variant="outline-secondary" onClick={() => setStep(1)}>
                  رجوع
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {reportType === 'financial' ? (
                  <>
                    {!isAllSelected && (
                      <button
                        type="button"
                        disabled={!canExportSingle || exportMutation.isPending}
                        onClick={() => exportMutation.mutate()}
                        className="px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
                      >
                        {exportMutation.isPending ? 'جاري التصدير...' : 'تصدير Excel'}
                      </button>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!canProceed}
                      onClick={handleConfirmAction}
                    >
                      {isAllSelected ? 'عرض مستحقات جميع العملاء' : 'عرض كشف الحساب المالي'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => exportMutation.mutate()}
                    isLoading={exportMutation.isPending}
                    disabled={!canExportSingle}
                  >
                    <FileSpreadsheet size={16} className="me-1" />
                    {exportMutation.isPending ? 'جاري التصدير...' : 'تصدير إلى Excel'}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default ClientReportModal;
