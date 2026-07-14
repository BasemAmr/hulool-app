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
import { FileSpreadsheet, ClipboardList, DollarSign } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReportType(null);
      setClientId('');
      setClientData(null);
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

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!reportType || !clientId || !clientData) throw new Error('Missing data');

      if (reportType === 'financial') {
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

  const canExport = reportType && clientId && clientId !== '0' && clientData;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="تقرير عميل">
      <div className="space-y-5">
        {step === 1 && (
          <>
            <p className="text-sm font-medium text-text-secondary text-center">اختر نوع التقرير</p>
            <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">اختر العميل</label>
              <ClientSearchCombobox
                value={clientId}
                onChange={(newValue) => setClientId(newValue)}
                placeholder="ابحث عن عميل..."
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-4 border-t border-border-default">
              <Button type="button" variant="outline-primary" onClick={onClose}>
                إلغاء
              </Button>
              {reportType === 'financial' ? (
                <>
                  <button
                    type="button"
                    disabled={!canExport || exportMutation.isPending}
                    onClick={() => exportMutation.mutate()}
                    className="px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
                  >
                    {exportMutation.isPending ? 'جاري التصدير...' : 'تصدير Excel'}
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canExport}
                    onClick={() => {
                      const isAdminRole = useAuthStore.getState().isAdmin();
                      navigate(isAdminRole ? `/clients/${clientId}` : `/employee/clients/${clientId}`);
                      onClose();
                    }}
                  >
                    عرض كشف الحساب المالي
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => exportMutation.mutate()}
                  isLoading={exportMutation.isPending}
                  disabled={!canExport}
                >
                  <FileSpreadsheet size={16} className="me-1" />
                  {exportMutation.isPending ? 'جاري التصدير...' : 'تصدير إلى Excel'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default ClientReportModal;
