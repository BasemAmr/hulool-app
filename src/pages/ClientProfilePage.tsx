import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import { useToast } from '../hooks/useToast';

// Import all necessary query hooks
import { useGetClient } from '../queries/clientQueries';
import { useCancelTask, useGetTasks } from '../queries/taskQueries';
import { useGetClientReceivables } from '../queries/receivableQueries';
import { useGetClientCredits } from '../queries/clientCreditQueries';

// Import components
import ClientProfileHeader from '../components/clients/ClientProfileHeader';
import AllTasksTable from '../components/tasks/AllTasksTable';
import ClientReceivablesTable from '../components/receivables/ClientReceivablesTable';
import type {  Task, StatementItem } from '../api/types';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';
import ClientCreditsHistoryTable from '../components/clients/ClientCreditsHistoryTable';

// Import export service
import { exportService } from '../services/export/ExportService';
import type { ClientStatementReportData, ClientTasksReportData, ClientCreditsReportData } from '../services/export/exportTypes';

const ClientProfilePage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const openModal = useModalStore((state) => state.openModal);
    const clientId = Number(id);

    const mode = (searchParams.get('mode') || 'general') as 'general' | 'tasks' | 'receivables';
    const filter = (searchParams.get('filter') || 'all') as 'all' | 'unpaid' | 'paid';
    
    const { hasViewAllReceivablesPermission, hasViewAmountsPermission } = useReceivablesPermissions();

    // Apply client profile page background
    useEffect(() => {
        applyPageBackground('clientProfile');
    }, []);

    // Fetch all data in parallel
    const { data: client, isLoading: isLoadingClient } = useGetClient(clientId);
    const { data: tasksData, isLoading: isLoadingTasks } = useGetTasks({ client_id: clientId });
    const { data: creditsData, isLoading: isLoadingCredits } = useGetClientCredits(clientId);
    
    // Fetch the new statement data for display - only if user has permission
    const { data: statementData, isLoading: isLoadingReceivables } = useGetClientReceivables(clientId, hasViewAllReceivablesPermission);

    const isLoading = isLoadingClient || isLoadingTasks || isLoadingCredits || (hasViewAllReceivablesPermission && isLoadingReceivables);
    const { success, error: showError } = useToast();

    // Mutation hooks
  const cancelTaskMutation = useCancelTask();

    // Export mutations
    const exportStatementMutation = useMutation({
        mutationFn: async (data: ClientStatementReportData) => {
            await exportService.exportClientStatement(data, { includeSubTables: true });
        },
        onSuccess: () => {
            success(t('export.statementSuccess'));
        },
        onError: (error) => {
            console.error('Export failed:', error);
            showError(t('export.statementError'));
        },
    });

    const exportTasksMutation = useMutation({
        mutationFn: async (data: ClientTasksReportData) => {
            await exportService.exportClientTasks(data);
        },
        onSuccess: () => {
            success(t('export.tasksSuccess'));
        },
        onError: (error) => {
            console.error('Export failed:', error);
            showError(t('export.tasksError'));
        },
    });

    const exportCreditsMutation = useMutation({
        mutationFn: async (data: ClientCreditsReportData) => {
            await exportService.exportClientCredits(data);
        },
        onSuccess: () => {
            success(t('export.creditsSuccess'));
        },
        onError: (error) => {
            console.error('Export failed:', error);
            showError(t('export.creditsError'));
        },
    });

  const queryClient = useQueryClient();


    // --- Handlers ---
    const handleAddTask = () => {
        if (client) openModal('taskForm', { client });
    };

    const handleAddReceivable = () => {
        if (client) openModal('manualReceivable', { client_id: clientId, client });
    };

    const handleAddCredit = () => {
        if (client) openModal('recordCreditModal', { client });
    };

    const handleEditTask = (task: Task) => openModal('taskForm', { taskToEdit: task });
    
   const handleCancelTask = (task: Task) => {
    cancelTaskMutation.mutate({
      id: task.id,
      decisions: {
        task_action: 'cancel'
      }
    }, {
      onSuccess: () => {
        success('تم الإلغاء', 'تم إلغاء المهمة بنجاح');
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        showError('خطأ', err.message || 'حدث خطأ أثناء إلغاء المهمة');
      }
    });
  };

    const handleShowRequirements = (task: Task) => openModal('requirements', { task });
    const handleCompleteTask = (task: Task) => openModal('taskCompletion', { task });

    // Export handlers
    const handleExportStatement = () => {
        if (!client || !statementData?.statementItems) return;
        
        const statementItems = statementData.statementItems as any[];
        const totalDebit = statementItems.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = statementItems.reduce((sum, item) => sum + item.credit, 0);
        const balance = statementItems.length > 0 ? statementItems[statementItems.length - 1].balance : 0;
        
        const reportData: ClientStatementReportData = {
            client: client,
            clientName: client.name,
            clientPhone: client.phone || '',
            statementItems: statementItems.map(item => ({
                id: Number(item.id),
                description: item.description,
                debit: item.debit,
                credit: item.credit,
                date: item.date,
                type: item.type,
                transaction_type: item.transaction_type,
                reference_id: item.reference_id,
                details: item.details
            })),
            totals: {
                totalDebit,
                totalCredit,
                balance
            },
            period: {
                from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
            }
        };
        
        exportStatementMutation.mutate(reportData);
    };

    const handleExportTasks = () => {
        if (!client || !tasksData?.tasks) return;
        
        const tasks = tasksData.tasks.map(task => ({
            ...task,
            client_name: client.name,
            client_phone: client.phone || '',
            service_name: task.task_name || t(`type.${task.type}`),
            task_type: t(`type.${task.type}`),
            status_text: t(`status.${task.status}`),
            amount_text: task.amount.toLocaleString(),
            prepaid_amount_text: task.prepaid_amount.toLocaleString(),
            formatted_start_date: new Date(task.start_date).toLocaleDateString('ar-SA'),
            formatted_end_date: task.end_date ? new Date(task.end_date).toLocaleDateString('ar-SA') : '',
            requirements_text: task.requirements.map(r => r.requirement_text).join('، '),
            notes_text: task.notes || '',
            tags_text: task.tags.map(t => t.name).join('، '),
            duration_days: task.end_date 
                ? Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24))
                : undefined,
            is_completed: task.status === 'Completed',
            is_active: task.status === 'New',
            is_cancelled: task.status === 'Cancelled',
            has_receivable: !!task.receivable,
            has_prepaid: task.prepaid_amount > 0,
            has_requirements: task.requirements.length > 0,
            has_tags: task.tags.length > 0,
            has_notes: !!task.notes,
            // Use consistent payment calculation matching table display
            amount_paid: task.receivable ? task.amount - task.receivable.amount : task.amount,
            amount_remaining: task.receivable?.amount || 0,
            is_overdue: task.receivable ? new Date(task.receivable.due_date || '') < new Date() && task.status !== 'Completed' : false
        }));

        const completedTasks = tasks.filter(t => t.is_completed).length;
        const inProgressTasks = tasks.filter(t => !t.is_completed && !t.is_cancelled).length;
        const newTasks = tasks.filter(t => t.is_active).length;
        const cancelledTasks = tasks.filter(t => t.is_cancelled).length;
        const totalAmount = tasks.reduce((sum, t) => sum + t.amount, 0);
        const totalPaid = tasks.reduce((sum, t) => sum + t.amount_paid, 0);
        const totalRemaining = tasks.reduce((sum, t) => sum + t.amount_remaining, 0);
        
        const reportData: ClientTasksReportData = {
            client: client,
            tasks: tasks,
            summary: {
                total_tasks: tasks.length,
                completed_tasks: completedTasks,
                in_progress_tasks: inProgressTasks,
                new_tasks: newTasks,
                cancelled_tasks: cancelledTasks,
                total_amount: totalAmount,
                total_paid: totalPaid,
                total_remaining: totalRemaining,
                average_completion_days: 0
            }
        };
        
        exportTasksMutation.mutate(reportData);
    };

    const handleExportCredits = () => {
        if (!client || !creditsData?.credits) return;
        
        const credits = creditsData.credits.map(credit => ({
            id: credit.id,
            client_id: credit.client_id,
            credit_date: credit.received_at,
            amount_granted: credit.amount,
            amount_used: credit.allocated_amount,
            amount_available: credit.remaining_amount,
            due_date: credit.received_at, // Using received_at as placeholder
            status: credit.remaining_amount > 0 ? 'active' as const : 'used' as const,
            credit_type: 'Manual Credit',
            notes: credit.description
        }));

        const totalGranted = credits.reduce((sum, c) => sum + c.amount_granted, 0);
        const totalUsed = credits.reduce((sum, c) => sum + c.amount_used, 0);
        const totalAvailable = credits.reduce((sum, c) => sum + c.amount_available, 0);
        
        const reportData: ClientCreditsReportData = {
            client: client,
            credits: credits,
            summary: {
                total_granted: totalGranted,
                total_used: totalUsed,
                total_available: totalAvailable,
                active_credits: credits.filter(c => c.status === 'active').length,
                expired_credits: 0,
                utilization_rate: totalGranted > 0 ? (totalUsed / totalGranted) * 100 : 0
            }
        };
        
        exportCreditsMutation.mutate(reportData);
    };

    const handleAssignTask = (task: Task) => openModal('assignTask', { task });

    if (isLoading) return <div>Loading...</div>;
    if (!client) return <div>Client not found.</div>;

    return (
        <div>
            <ClientProfileHeader
                client={client}
                mode={mode}
                onAddTask={handleAddTask}
                onAddReceivable={handleAddReceivable}
                onAddCredit={handleAddCredit}
                onExportStatement={handleExportStatement}
                onExportTasks={handleExportTasks}
                onExportCredits={handleExportCredits}
                isExporting={exportStatementMutation.isPending || exportTasksMutation.isPending || exportCreditsMutation.isPending}
            />

            

            {/* Tasks Table - Show in general and tasks modes */}
            {(mode === 'general' || mode === 'tasks') && (
                <div className="card mb-3">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">{t('clientProfile.tasksSectionTitle')}</h5>
                        {mode === 'tasks' && tasksData?.tasks && tasksData.tasks.length > 0 && (
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={handleExportTasks}
                                disabled={exportTasksMutation.isPending}
                                title={t('export.exportTasks', 'تصدير المهام')}
                            >
                                <i className="fas fa-download me-1"></i>
                                {exportTasksMutation.isPending ? t('common.exporting', 'جاري التصدير...') : t('export.exportTasks', 'تصدير المهام')}
                            </button>
                        )}
                    </div>
                    <div className="card-body p-0">
                        <AllTasksTable
                            tasks={tasksData?.tasks || []}
                            isLoading={isLoadingTasks}
                            onEdit={handleEditTask}
                            onDelete={handleCancelTask}
                            onShowRequirements={handleShowRequirements}
                            onComplete={handleCompleteTask}
                            onAssign={handleAssignTask}
                        />
                    </div>
                </div>
            )}

            {/* Receivables Table - Show in general and receivables modes */}
            {(mode === 'general' || mode === 'receivables') && (
                hasViewAllReceivablesPermission ? (
                    <div className="card mb-3">
                        <div className="card-header">
                            <h5 className="mb-0">كشف الحساب</h5>
                        </div>
                        <div className="card-body p-0">
                            <ClientReceivablesTable
                                receivables={statementData?.statementItems as StatementItem[] || []}
                                isLoading={isLoadingReceivables}
                                client={client}
                                filter={filter}
                                hideAmounts={!hasViewAmountsPermission}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="alert alert-warning text-center">
                        <h5>Access Denied</h5>
                        <p>You don't have permission to view receivables for this client.</p>
                    </div>
                )
            )}

            {/* Credits History Table - Show in general - receivables modes only */}
            {(mode === 'general' || mode === 'receivables') && (
                <div className="card mb-3">
                    <div className="card-header">
                        <h5 className="mb-0">{t('clients.creditsHistory')}</h5>
                    </div>
                    <div className="card-body p-0">
                        <ClientCreditsHistoryTable
                            credits={creditsData?.credits || []}
                            isLoading={isLoadingCredits}
                            clientId={clientId}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientProfilePage;