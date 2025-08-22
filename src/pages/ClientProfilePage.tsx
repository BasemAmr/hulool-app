import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';

// Import all necessary query hooks
import { useGetClient } from '../queries/clientQueries';
import { useDeleteTask, useGetTasks } from '../queries/taskQueries';
import { useGetClientReceivables, useGetAllClientReceivables } from '../queries/receivableQueries';
import { useGetClientCredits } from '../queries/clientCreditQueries';

// Import components
import ClientProfileHeader from '../components/clients/ClientProfileHeader';
import ClientTaskSummaryCards from '../components/clients/ClientTaskSummaryCards';
import AllTasksTable from '../components/tasks/AllTasksTable';
import ClientReceivablesTable from '../components/receivables/ClientReceivablesTable';
import { exportToExcel, exportToPDF } from '../components/receivables/exportUtils';
import type {  Task, StatementItem } from '../api/types';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';
import ClientCreditBalance from '../components/clients/ClientCreditBalance';
import ClientCreditsHistoryTable from '../components/clients/ClientCreditsHistoryTable';

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

    // Fetch the raw receivables data specifically for export functions - only if user has permission
    const { data: rawReceivablesData } = useGetAllClientReceivables(clientId, hasViewAllReceivablesPermission); 
    const clientRawReceivables = rawReceivablesData?.receivables || [];

    const isLoading = isLoadingClient || isLoadingTasks || isLoadingCredits || (hasViewAllReceivablesPermission && isLoadingReceivables);

    // Mutation hooks
    const deleteTaskMutation = useDeleteTask();

    // --- Handlers ---
    const handleAddTask = () => {
        if (client) openModal('taskForm', { client });
    };

    const handleAddReceivable = () => {
        if (client) openModal('manualReceivable', {});
    };

    const handleEditTask = (task: Task) => openModal('taskForm', { taskToEdit: task });
    const handleDeleteTask = (task: Task) => {
        openModal('confirmDelete', {
            title: t('common.confirm'),
            message: t('clients.deleteConfirmMessage', { clientName: task.client.name }) + ` - Task: ${task.task_name || t(`type.${task.type}`)}`, // Customize message
            onConfirm: () => {
                deleteTaskMutation.mutate(Number(task.id));
            },
        });
    };
    const handleShowRequirements = (task: Task) => openModal('requirements', { task });

    // const handleSettlePayment = (receivable: Receivable) => {
    //     // Find the full receivable object from raw data to pass to the modal
    //     const fullReceivable = clientRawReceivables.find(r => r.id === receivable.id);
    //     if (fullReceivable) {
    //         openModal('paymentForm', { receivable: fullReceivable });
    //     }
    // };

    const handleCompleteTask = (task: Task) => {
        openModal('taskCompletion', { task });
    };

    // Export handlers for receivables
    const handleExportExcel = () => {
        if (statementData?.statementItems && client) {
            const statementItems = statementData.statementItems as StatementItem[];
            const totals = {
                totalDebit: statementItems.reduce((s, it) => s + it.debit, 0),
                totalCredit: statementItems.reduce((s, it) => s + it.credit, 0),
                totalNet: statementItems.length ? statementItems[statementItems.length - 1].balance : 0
            };
            exportToExcel(statementItems, client.name, totals);
        }
    };

    const handleExportPDF = () => {
        if (statementData?.statementItems && client) {
            const statementItems = statementData.statementItems as StatementItem[];
            const totals = {
                totalDebit: statementItems.reduce((s, it) => s + it.debit, 0),
                totalCredit: statementItems.reduce((s, it) => s + it.credit, 0),
                totalNet: statementItems.length ? statementItems[statementItems.length - 1].balance : 0
            };
            exportToPDF(statementItems, client.name, totals);
        }
    };

    const handlePrint = () => {
        if (clientRawReceivables && client) {
            // TODO: Implement print functionality
            console.log("Print functionality not yet implemented");
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (!client) return <div>Client not found.</div>;

    return (
        <div>
            <ClientProfileHeader
                client={client}
                mode={mode}
                onAddTask={handleAddTask}
                onAddReceivable={handleAddReceivable}
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                onPrint={handlePrint}
            />

            <ClientCreditBalance clientId={clientId} />

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

            {/* Task Summary Cards - Only in general mode */}
            {mode === 'general' && (
                <ClientTaskSummaryCards
                    tasks={tasksData?.tasks || []}
                    isLoading={isLoadingTasks}
                    clientId={clientId}
                />
            )}

            {(mode === 'general' || mode === 'tasks') && (
                <div className="card mb-3">
                    <div className="card-header">
                        <h5 className="mb-0">{t('clientProfile.tasksSectionTitle')}</h5>
                    </div>
                    <div className="card-body p-0">
                        <AllTasksTable
                            tasks={tasksData?.tasks || []}
                            isLoading={isLoadingTasks}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onShowRequirements={handleShowRequirements}
                            onComplete={handleCompleteTask}
                        />
                    </div>
                </div>
            )}

            {(mode === 'general' || mode === 'receivables') && (
                hasViewAllReceivablesPermission ? (
                    <ClientReceivablesTable
                        receivables={statementData?.statementItems as StatementItem[] || []}
                        isLoading={isLoadingReceivables}
                        client={client}
                        filter={filter}
                        hideAmounts={!hasViewAmountsPermission}
                    />
                ) : (
                    <div className="alert alert-warning text-center">
                        <h5>Access Denied</h5>
                        <p>You don't have permission to view receivables for this client.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default ClientProfilePage;