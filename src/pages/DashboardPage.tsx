import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetDashboardStats, useGetClientsWithActiveTasks } from '../queries/dashboardQueries';
import { applyPageBackground } from '../utils/backgroundUtils';

import TaskStatusCards from '../components/dashboard/TaskStatusCards';
import ClientTypeColumn from '../components/dashboard/ClientTypeColumn';
import { FileText } from 'lucide-react'; // For empty state

const DashboardPage = () => {
    const { t } = useTranslation();
    const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
    // Use the new hook for clients with tasks grouped by type
    const { data: groupedClients, isLoading: isLoadingClients } = useGetClientsWithActiveTasks();

    useEffect(() => {
        applyPageBackground('dashboard');
    }, []);

    const isLoading = isLoadingStats || isLoadingClients;
    
    // Calculate total clients across all types
    const totalClients = groupedClients ? 
        Object.values(groupedClients).flat().length : 0;

    return (
        <div className="dashboard-page">
            <div className="task-status-cards mb-4">
                <TaskStatusCards
                    stats={stats || { 
                        new_tasks: 0, 
                        deferred_tasks: 0, 
                        completed_tasks: 0, 
                        late_tasks: 0, 
                        late_receivables: 0,
                        total_unpaid_amount: 0
                    }}
                    totalPaidAmount={stats?.total_paid_amount || 0}
                    isLoading={isLoadingStats}
                />
            </div>

            {isLoading && (
                <div className="d-flex justify-content-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}

            {!isLoading && groupedClients && totalClients > 0 && (
                <div className="recent-tasks-section">
                    <div className="row g-4">
                        {/* Government Column */}
                        <div className="col-lg-3 col-md-6">
                            <ClientTypeColumn 
                                type="Government" 
                                clients={groupedClients.Government || []} 
                            />
                        </div>
                        
                        {/* Accounting Column */}
                        <div className="col-lg-3 col-md-6">
                            <ClientTypeColumn 
                                type="Accounting" 
                                clients={groupedClients.Accounting || []} 
                            />
                        </div>
                        
                        {/* Real Estate Column */}
                        <div className="col-lg-3 col-md-6">
                            <ClientTypeColumn 
                                type="Real Estate" 
                                clients={groupedClients['Real Estate'] || []} 
                            />
                        </div>
                        
                        {/* Other Column */}
                        <div className="col-lg-3 col-md-6">
                            <ClientTypeColumn 
                                type="Other" 
                                clients={groupedClients.Other || []} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && (!groupedClients || totalClients === 0) && (
                <div className="text-center py-5 text-muted">
                    <FileText size={48} className="mb-3 opacity-50" />
                    <p className="mb-0">{t('dashboard.noActiveTasks', 'لا توجد مهام نشطة حالياً.')}</p>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;