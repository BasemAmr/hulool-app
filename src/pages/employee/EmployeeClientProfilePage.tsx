import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useToast } from '../../hooks/useToast';

// Import query hooks
import { useGetClient } from '../../queries/clientQueries';
import { useGetClientCredits } from '../../queries/clientCreditQueries';
import { useGetMyReceivablesDashboardInfinite } from '../../queries/employeeFinancialQueries';

// Import components
import ClientProfileHeader from '../../components/clients/ClientProfileHeader';
import EmployeeOwnTasksTable from '../../components/employee/EmployeeOwnTasksTable';
import EmployeeClientsStatementsTable from '../../components/employee/EmployeeClientsStatementsTable';
import ClientCreditsHistoryTable from '../../components/clients/ClientCreditsHistoryTable';

// Import types
import { useReceivablesPermissions } from '../../hooks/useReceivablesPermissions';

// Import export service
import { exportService } from '../../services/export/ExportService';
import type { ClientStatementReportData, ClientCreditsReportData } from '../../services/export/exportTypes';

const EmployeeClientProfilePage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const openModal = useModalStore((state) => state.openModal);
    const clientId = Number(id);

    const mode = (searchParams.get('mode') || 'general') as 'general' | 'tasks' | 'receivables';
    const filter = (searchParams.get('filter') || 'all') as 'all' | 'unpaid' | 'paid';
    
    const { hasViewAmountsPermission } = useReceivablesPermissions();
    
    // For employee pages, employees should always be able to view their own receivables
    // but amounts visibility is still controlled by permissions
    const hasViewAllReceivablesPermission = true; // Employees can view their own receivables

    // Apply client profile page background
    useEffect(() => {
        applyPageBackground('clientProfile');
    }, []);

    // Fetch all data in parallel
    const { data: client, isLoading: isLoadingClient } = useGetClient(clientId);
    const { data: creditsData, isLoading: isLoadingCredits } = useGetClientCredits(clientId);
    
    // Fetch employee-specific receivables for this client
    const { data: statementData, isLoading: isLoadingReceivables } = useGetMyReceivablesDashboardInfinite({ client_id: clientId.toString() });

    const isLoading = isLoadingClient || isLoadingCredits || (hasViewAllReceivablesPermission && isLoadingReceivables);
    const { success, error: showError } = useToast();

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

    // --- Handlers ---
    const handleAddTask = () => {
        if (client) openModal('taskForm', { client });
    };

    const handleAddInvoice = () => {
        if (client) openModal('invoiceForm', { client_id: client.id, client });
    };

    const handleAddCredit = () => {
        if (client) openModal('recordCreditModal', { client });
    };

    const handleExportStatement = () => {
        if (!client || !statementData?.pages) return;
        
        // Flatten all pages of receivables data
        const allReceivables = statementData.pages.flatMap(page => page.data.receivables);
        
        // Convert employee receivables data to statement format
        const statementItems = allReceivables.map(item => ({
            id: parseInt(item.id),
            client_id: item.client_id,
            type: 'receivable' as const,
            description: item.description || item.task_name || '',
            debit: Number(item.amount),
            credit: item.total_paid + item.total_allocated,
            date: item.created_at,
            due_date: item.due_date,
            task_id: item.task_id || null,
            task_name: item.task_name || null,
            task_type: item.task_type || null,
            notes: item.notes || ''
        }));

        const totalDebit = statementItems.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = statementItems.reduce((sum, item) => sum + item.credit, 0);
        
        const reportData: ClientStatementReportData = {
            client: client,
            clientName: client.name,
            clientPhone: client.phone || '',
            statementItems: statementItems,
            totals: {
                totalDebit: totalDebit,
                totalCredit: totalCredit,
                balance: totalDebit - totalCredit,
            },
            period: {
                from: new Date().toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0],
            }
        };
        
        exportStatementMutation.mutate(reportData);
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
            due_date: credit.received_at,
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

    if (isLoading) return <div>Loading...</div>;
    if (!client) return <div>Client not found.</div>;

    return (
        <div>
            <ClientProfileHeader
                client={client}
                mode={mode}
                onAddTask={handleAddTask}
                onAddInvoice={handleAddInvoice}
                onAddCredit={handleAddCredit}
                onExportStatement={handleExportStatement}
                onExportTasks={() => {}} // Tasks export not implemented for employee view
                onExportCredits={handleExportCredits}
                isExporting={exportStatementMutation.isPending || exportCreditsMutation.isPending}
            />

            {/* Employee Tasks Table - Show in general and tasks modes */}
            {(mode === 'general' || mode === 'tasks') && (
                <div className="rounded-lg border border-border bg-card shadow-sm mb-3">
                    <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                        <h5 className="mb-0 text-lg font-bold text-primary">مهامي مع هذا العميل</h5>
                    </div>
                    <div className="p-0">
                        <EmployeeOwnTasksTable
                            clientId={clientId}
                            searchTerm=""
                            statusFilter=""
                        />
                    </div>
                </div>
            )}

            {/* Employee Receivables Table - Show in general and receivables modes */}
            {(mode === 'general' || mode === 'receivables') && (
                hasViewAllReceivablesPermission ? (
                    <div className="rounded-lg border border-border bg-card shadow-sm mb-3">
                        <div className="px-4 py-3 border-b border-border">
                            <h5 className="mb-0 text-lg font-bold text-primary">كشف حساب العميل</h5>
                        </div>
                        <div className="p-0">
                            <EmployeeClientsStatementsTable
                                receivables={statementData?.pages?.flatMap(page => page.data.receivables) || []}
                                isLoading={isLoadingReceivables}
                                filter={filter}
                                hideAmounts={!hasViewAmountsPermission}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-yellow-600 bg-yellow-50 p-4 text-center">
                        <h5 className="text-yellow-800 font-bold">Access Denied</h5>
                        <p className="text-yellow-700">You don't have permission to view receivables for this client.</p>
                    </div>
                )
            )}

            {/* Credits History Table - Show in general and receivables modes only */}
            {(mode === 'general' || mode === 'receivables') && (
                <div className="rounded-lg border border-border bg-card shadow-sm mb-3">
                    <div className="px-4 py-3 border-b border-border">
                        <h5 className="mb-0 text-lg font-bold text-primary">{t('clients.creditsHistory')}</h5>
                    </div>
                    <div className="p-0">
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

export default EmployeeClientProfilePage;