import { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useGetDashboardStats, useGetRecentTasks } from '../queries/dashboardQueries';
import type { Task, TaskType } from '../api/types';
import { FileText, BookOpen, Home, Briefcase } from 'lucide-react';
import { applyPageBackground } from '../utils/backgroundUtils';

import TaskStatusCards from '../components/dashboard/TaskStatusCards';
import DashboardTaskCard from '../components/dashboard/DashboardTaskCard';

const DashboardPage = () => {
    const { t } = useTranslation();
    const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
    const { data: recentTasks, isLoading: isLoadingTasks } = useGetRecentTasks();

    useEffect(() => {
        // Apply dashboard background when component mounts
        applyPageBackground('dashboard');
    }, []);

    const taskColumns: Record<TaskType, Task[]> = useMemo(() => {
        const columns: Record<TaskType, Task[]> = {
            Government: [],
            RealEstate: [],
            Accounting: [],
            Other: [],
        };
        
        if (recentTasks) {
            recentTasks.forEach(task => {
                if (task.status === 'New' && columns[task.type]) {
                    columns[task.type].push(task);
                }
            });
            
            // Sort each column: urgent newest first, then urgent, then newest
            Object.keys(columns).forEach(type => {
                columns[type as TaskType].sort((a, b) => {
                    // Check if tasks have urgent tag
                    const aIsUrgent = a.tags?.some(tag => tag.name === 'قصوى' && tag.is_system) || false;
                    const bIsUrgent = b.tags?.some(tag => tag.name === 'قصوى' && tag.is_system) || false;
                    
                    // If both urgent or both not urgent, sort by date (newest first)
                    if (aIsUrgent === bIsUrgent) {
                        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
                    }
                    
                    // If one is urgent and one is not, urgent comes first
                    return bIsUrgent ? 1 : -1;
                });
            });
        }
        
        return columns;
    }, [recentTasks]);

    const columnTypes: TaskType[] = ['Government', 'RealEstate', 'Accounting', 'Other'];
    
    const taskTypeIcons = {
        Government: <FileText size={20} />,
        RealEstate: <Home size={20} />,
        Accounting: <BookOpen size={20} />,
        Other: <Briefcase size={20} />
    };

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

            {isLoadingTasks && (
                <div className="d-flex justify-content-center py-5">
                    <div className="loading-spinner size-lg"></div>
                </div>
            )}

            {!isLoadingTasks && (
                <div className="recent-tasks-section">
                    <div className="row g-0">
                        {columnTypes.map(type => (
                            <div className="col-lg-3" key={type}>
                                <div 
                                    className="card h-100" 
                                    style={{
                                        borderRadius: '0',
                                        border: '1px solid #dee2e6',
                                        borderRight: type === 'Other' ? '1px solid #dee2e6' : 'none'
                                    }}
                                >
                                    <div
                                        className="card-header text-white d-flex justify-content-between align-items-center py-2 border-bottom"
                                        style={{
                                            background:
                                                type === 'Government'
                                                    ? '#007bff'
                                                    : type === 'RealEstate'
                                                    ? '#28a745'
                                                    : type === 'Accounting'
                                                    ? '#ffc107'
                                                    : '#6c757d',
                                            color:
                                                type === 'Accounting'
                                                    ? '#333'
                                                    : '#fff',
                                            borderBottom: '1px solid #dee2e6'
                                        }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <span
                                                style={{
                                                    color:
                                                        type === 'Accounting'
                                                            ? '#333'
                                                            : '#fff',
                                                }}
                                            >
                                                {taskTypeIcons[type]}
                                            </span>
                                            <Link
                                                to={`/tasks?type=${type}`}
                                                className="text-decoration-none ms-2"
                                                style={{
                                                    color:
                                                        type === 'Accounting'
                                                            ? '#333'
                                                            : '#fff',
                                                }}
                                            >
                                                <h6 className="mb-0 fw-medium">
                                                    مهام {t(`dashboard.${type}`)}
                                                </h6>
                                            </Link>
                                        </div>
                                        <span
                                            className="badge bg-white text-primary rounded-pill px-2 py-1"
                                        >
                                            {taskColumns[type].length}
                                        </span>
                                    </div>
                                    <div className="card-body p-0" style={{ minHeight: '400px' }}>
                                        {taskColumns[type].length > 0 ? (
                                            taskColumns[type].map((task, index) => (
                                                <div key={task.id}>
                                                    <DashboardTaskCard task={task} index={index} />
                                                    {index < taskColumns[type].length - 1 && (
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
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;