// src/components/modals/TaskDetailsModal.tsx
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import type { Task } from '../../api/types';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { formatDate } from '../../utils/dateUtils';
import { formatTimeElapsed } from '../../utils/timeUtils';

const TaskDetailsModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const props = useModalStore((state) => state.props as { task: Task });
  const { task } = props;

  if (!task) return null;

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('tasks.taskDetailsTitle', 'تفاصيل المهمة')}
    >
      <div className="task-details-modal">
        <div className="detail-group">
          <h6>المعلومات الأساسية</h6>
          <p><strong>{t('tasks.tableHeaderService')}:</strong> {task.task_name || t(`type.${task.type}`)}</p>
          <p><strong>{t('tasks.tableHeaderType')}:</strong> {t(`type.${task.type}`)}</p>
          <p><strong>{t('common.status')}:</strong> {t(`status.${task.status}`)}</p>
        </div>
        <div className="detail-group">
          <h6>التواريخ والمبالغ</h6>
          <p><strong>{t('tasks.formDateLabel')}:</strong> {formatDate(task.start_date)} ({formatTimeElapsed(task.start_date)})</p>
          {task.end_date && <p><strong>{t('tasks.formEndDateLabel')}:</strong> {formatDate(task.end_date)}</p>}
          <p><strong>{t('tasks.formAmountLabel')}:</strong> {task.amount.toLocaleString()} ريال</p>
          {task.prepaid_amount > 0 && <p><strong>{t('tasks.formPrepaidAmountLabel')}:</strong> {task.prepaid_amount.toLocaleString()} ريال</p>}
        </div>
        <div className="detail-group">
          <h6>{t('tasks.formNotesLabel')}</h6>
          <p>{task.notes || 'لا توجد ملاحظات.'}</p>
        </div>
        <div className="detail-group">
          <h6>{t('tasks.formRequirementsLabel')}</h6>
          {task.requirements && task.requirements.length > 0 ? (
            <ul>
              {task.requirements.map(req => (
                <li key={req.id || req.temp_id} className={req.is_provided ? 'text-success' : 'text-muted'}>
                  {req.is_provided ? '✓' : '○'} {req.requirement_text}
                </li>
              ))}
            </ul>
          ) : (
            <p>لا توجد متطلبات لهذه المهمة.</p>
          )}
        </div>
      </div>
      <footer className="modal-footer">
        <Button variant="secondary" onClick={closeModal}>{t('common.close')}</Button>
      </footer>
    </BaseModal>
  );
};

export default TaskDetailsModal;