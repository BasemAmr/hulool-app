import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useGetDashboardStats, useGetClientsWithActiveTasks } from '../queries/dashboardQueries';
import { FileText, BookOpen, Home, Briefcase } from 'lucide-react';
import { applyPageBackground } from '../utils/backgroundUtils';

import TaskStatusCards from '../components/dashboard/TaskStatusCards';
import DashboardClientCard from '../components/dashboard/DashboardClientCard';

const DashboardPage = () => {
    const { t } = useTranslation();
    const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
    const { data: groupedClients, isLoading: isLoadingClients } = useGetClientsWithActiveTasks();

    useEffect(() => {
        // Apply dashboard background when component mounts
        applyPageBackground('dashboard');
    }, []);

    // Map task types to display names and colors
    const taskTypeConfig = {
        Government: {
            icon: <FileText size={20} />,
            color: '#007bff',
            displayName: 'حكومية'
        },
        Accounting: {
            icon: <BookOpen size={20} />,
            color: '#ffc107',
            displayName: 'محاسبية'
        },
        'Real Estate': {
            icon: <Home size={20} />,
            color: '#28a745',
            displayName: 'عقارية'
        },
        Other: {
            icon: <Briefcase size={20} />,
            color: '#6c757d',
            displayName: 'أخرى'
        }
    };

    const columnTypes: (keyof typeof taskTypeConfig)[] = ['Government', 'Accounting', 'Real Estate', 'Other'];

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

            {isLoadingClients && (
                <div className="d-flex justify-content-center py-5">
                    <div className="loading-spinner size-lg"></div>
                </div>
            )}

            {!isLoadingClients && groupedClients && (
                <div className="recent-tasks-section">
                    <div className="row g-0">
                        {columnTypes.map(type => {
                            const clients = groupedClients[type] || [];
                            const config = taskTypeConfig[type];
                            
                            return (
                                <div className="col-lg-3" key={type}>
                                    <div 
                                        className="card" 
                                        style={{
                                            borderRadius: '0',
                                            border: '1px solid #dee2e6',
                                            borderRight: type === 'Other' ? '1px solid #dee2e6' : 'none'
                                        }}
                                    >
                                        <div
                                            className="card-header text-white d-flex justify-content-between align-items-center py-2 border-bottom"
                                            style={{
                                                background: config.color,
                                                color: type === 'Accounting' ? '#333' : '#fff',
                                                borderBottom: '1px solid #dee2e6'
                                            }}
                                        >
                                            <div className="d-flex align-items-center">
                                                <span
                                                    style={{
                                                        color: type === 'Accounting' ? '#333' : '#fff',
                                                    }}
                                                >
                                                    {config.icon}
                                                </span>
                                                <Link
                                                    to={`/tasks?type=${type}`}
                                                    className="text-decoration-none ms-2"
                                                    style={{
                                                        color: type === 'Accounting' ? '#333' : '#fff',
                                                    }}
                                                >
                                                    <h6 className="mb-0 fw-medium">
                                                        عملاء {config.displayName}
                                                    </h6>
                                                </Link>
                                            </div>
                                            <span
                                                className="badge bg-white text-primary rounded-pill px-2 py-1"
                                            >
                                                {clients.length}
                                            </span>
                                        </div>
                                        <div className="card-body p-0" style={{ minHeight: '400px' }}>
                                            {clients.length > 0 ? (
                                                clients.map((clientData, index) => (
                                                    <div key={clientData.client.id}>
                                                        <DashboardClientCard data={clientData} index={index} />
                                                        {index < clients.length - 1 && (
                                                            <hr className="m-0" style={{ borderColor: '#dee2e6' }} />
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="empty-state py-5 text-center">
                                                    <div className="empty-icon mb-3">
                                                        <i className="fas fa-clipboard-list fa-3x text-gray-400"></i>
                                                    </div>
                                                    <p className="empty-description text-muted mb-0">
                                                        {t('common.noResults')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-footer py-2 border-top">
                                            <Link
                                                to={`/tasks?type=${type}`}
                                                className="btn btn-outline-primary btn-sm w-100 fw-medium"
                                            >
                                                {t('dashboard.viewMore')}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;