import { useState } from 'react';
import { History } from 'lucide-react';
import Button from '../ui/Button';
import { useGetTasks } from '../../queries/taskQueries';
import type { Task } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId: number;
}

const TaskHistoryModal = ({ isOpen, onClose, clientName, clientId }: TaskHistoryModalProps) => {
  const [filter, setFilter] = useState<string>('all');

  // Fetch real tasks data for this client
  const { data: tasksData, isLoading, error } = useGetTasks({
    client_id: clientId,
  });

  const tasks: Task[] = tasksData?.tasks || [];

  // Calculate real stats from fetched data
  const stats = {
    new: tasks.filter((task: Task) => task.status === 'New').length,
    deferred: tasks.filter((task: Task) => task.status === 'Deferred').length,
    completed: tasks.filter((task: Task) => task.status === 'Completed').length,
    total: tasks.length
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((task: Task) => task.status.toLowerCase() === filter);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1070 }}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header" style={{ 
              background: 'var(--gradient-gold)', 
              color: 'var(--color-white)' 
            }}>
              <div className="d-flex align-items-center">
                <History size={20} className="me-2" />
                <h5 className="modal-title mb-0 fw-bold">
                  تاريخ المهام - {clientName}
                </h5>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} />
            </div>

            <div className="modal-body p-0">
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-warning" role="status">
                    <span className="visually-hidden">جاري التحميل...</span>
                  </div>
                  <p className="mt-2 text-muted">جاري تحميل تاريخ المهام...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <div className="text-danger mb-3">
                    <i className="fas fa-exclamation-triangle fa-2x"></i>
                  </div>
                  <p className="text-danger">حدث خطأ في تحميل البيانات</p>
                  <Button variant="outline-primary" size="sm" onClick={() => window.location.reload()}>
                    إعادة المحاولة
                  </Button>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="row g-2 p-3" style={{ background: 'var(--color-gray-50)' }}>
                <div className="col-3">
                  <button 
                    className={`btn w-100 ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilter('all')}
                  >
                    <div className="text-center">
                      <div className="fw-bold">{stats.total}</div>
                      <small>الكل</small>
                    </div>
                  </button>
                </div>
                <div className="col-3">
                  <button 
                    className={`btn w-100 ${filter === 'new' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilter('new')}
                  >
                    <div className="text-center">
                      <div className="fw-bold">{stats.new}</div>
                      <small>جديدة</small>
                    </div>
                  </button>
                </div>
                <div className="col-3">
                  <button 
                    className={`btn w-100 ${filter === 'deferred' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setFilter('deferred')}
                  >
                    <div className="text-center">
                      <div className="fw-bold">{stats.deferred}</div>
                      <small>مؤجلة</small>
                    </div>
                  </button>
                </div>
                <div className="col-3">
                  <button 
                    className={`btn w-100 ${filter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setFilter('completed')}
                  >
                    <div className="text-center">
                      <div className="fw-bold">{stats.completed}</div>
                      <small>مكتملة</small>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tasks Table */}
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>اسم المهمة</th>
                      <th>النوع</th>
                      <th>التاريخ</th>
                      <th>الحالة</th>
                      <th>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task: Task) => (
                      <tr key={task.id}>
                        <td className="fw-semibold">{task.task_name || 'مهمة بدون اسم'}</td>
                        <td>
                          <span className="badge bg-info">{task.type}</span>
                        </td>
                        <td>{formatDate(task.start_date)}</td>
                        <td>
                          <span className={`badge ${
                            task.status === 'Completed' ? 'bg-success' : 
                            task.status === 'Deferred' ? 'bg-secondary' : 'bg-primary'
                          }`}>
                            {task.status === 'Completed' ? 'مكتملة' : 
                             task.status === 'Deferred' ? 'مؤجلة' : 'جديدة'}
                          </span>
                        </td>
                        <td className="text-muted small">{task.notes || 'لا توجد ملاحظات'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </div>

            <div className="modal-footer bg-light">
              <Button variant="secondary" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskHistoryModal;
