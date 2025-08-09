import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';

// Import all necessary query hooks
import { useGetClient } from '../queries/clientQueries';
import { useDeleteTask, useGetTasks } from '../queries/taskQueries';
import { useGetClientReceivables, useGetAllClientReceivables } from '../queries/receivableQueries';

// Import components
import ClientProfileHeader from '../components/clients/ClientProfileHeader';
import ClientTaskSummaryCards from '../components/clients/ClientTaskSummaryCards';
import AllTasksTable from '../components/tasks/AllTasksTable';
import ClientReceivablesTable from '../components/receivables/ClientReceivablesTable';
import { exportToExcel, exportToPDF } from '../components/receivables/exportUtils';
import type {  Task, Receivable, StatementItem } from '../api/types';

const ClientProfilePage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const openModal = useModalStore((state) => state.openModal);
    const clientId = Number(id);

    const mode = (searchParams.get('mode') || 'general') as 'general' | 'tasks' | 'receivables';
    const filter = (searchParams.get('filter') || 'all') as 'all' | 'unpaid' | 'paid';

    // Apply client profile page background
    useEffect(() => {
        applyPageBackground('clientProfile');
    }, []);

    // Fetch all data in parallel
    const { data: client, isLoading: isLoadingClient } = useGetClient(clientId);
    const { data: tasksData, isLoading: isLoadingTasks } = useGetTasks({ client_id: clientId });
    
    // Fetch the new statement data for display
    const { data: statementData, isLoading: isLoadingReceivables } = useGetClientReceivables(clientId);

    // Fetch the raw receivables data specifically for export functions
    const { data: rawReceivablesData } = useGetAllClientReceivables(clientId); 
    const clientRawReceivables = rawReceivablesData?.receivables || [];

    const isLoading = isLoadingClient || isLoadingTasks || isLoadingReceivables;

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
                deleteTaskMutation.mutate(task.id);
            },
        });
    };
    const handleShowRequirements = (task: Task) => openModal('requirements', { task });

    const handleSettlePayment = (receivable: Receivable) => {
        // Find the full receivable object from raw data to pass to the modal
        const fullReceivable = clientRawReceivables.find(r => r.id === receivable.id);
        if (fullReceivable) {
            openModal('paymentForm', { receivable: fullReceivable });
        }
    };

    const handleCompleteTask = (task: Task) => {
        openModal('taskCompletion', { task });
    };

    // Export handlers for receivables
    const handleExportExcel = () => {
        if (statementData?.receivables && client) {
            const statementItems = statementData.receivables as StatementItem[];
            const totals = {
                totalDebit: statementItems.reduce((s, it) => s + it.debit, 0),
                totalCredit: statementItems.reduce((s, it) => s + it.credit, 0),
                totalNet: statementItems.length ? statementItems[statementItems.length - 1].balance : 0
            };
            exportToExcel(statementItems, client.name, totals);
        }
    };

    const handleExportPDF = () => {
        if (statementData?.receivables && client) {
            const statementItems = statementData.receivables as StatementItem[];
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
                <ClientReceivablesTable
                    receivables={statementData?.receivables as StatementItem[] || []}
                    isLoading={isLoadingReceivables}
                    clientName={client.name}
                    onSettlePayment={handleSettlePayment}
                    filter={filter}
                />
            )}
        </div>
    );
};

export default ClientProfilePage;