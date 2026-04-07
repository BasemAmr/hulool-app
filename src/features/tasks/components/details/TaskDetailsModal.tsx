// src/components/modals/TaskDetailsModal.tsx
import { useTranslation } from 'react-i18next';
import { useModalStore } from '@/shared/stores/modalStore';
import type { Task } from '@/api/types';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatTimeElapsed } from '@/shared/utils/timeUtils';

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
      <div className="task-details-modal space-y-4">
        <div className="space-y-2">
          <h6 className="font-semibold text-text-primary">المعلومات الأساسية</h6>
          <p className="text-sm"><strong>{t('tasks.tableHeaderService')}:</strong> {task.task_name || t(`type.${task.type}`)}</p>
          <p className="text-sm"><strong>{t('tasks.tableHeaderType')}:</strong> {t(`type.${task.type}`)}</p>
          <p className="text-sm"><strong>{t('common.status')}:</strong> {t(`status.${task.status}`)}</p>
        </div>
        <div className="space-y-2">
          <h6 className="font-semibold text-text-primary">التواريخ والمبالغ</h6>
          <p className="text-sm"><strong>{t('tasks.formDateLabel')}:</strong> {formatDate(task.start_date)} ({formatTimeElapsed(task.start_date)})</p>
          {task.end_date && <p className="text-sm"><strong>{t('tasks.formEndDateLabel')}:</strong> {formatDate(task.end_date)}</p>}
          <p className="text-sm"><strong>{t('tasks.formAmountLabel')}:</strong> {task.amount.toLocaleString()} ريال</p>
          {task.prepaid_amount > 0 && <p className="text-sm"><strong>{t('tasks.formPrepaidAmountLabel')}:</strong> {task.prepaid_amount.toLocaleString()} ريال</p>}
        </div>
        <div className="space-y-2">
          <h6 className="font-semibold text-text-primary">{t('tasks.formNotesLabel')}</h6>
          <p className="text-sm">{task.notes || 'لا توجد ملاحظات.'}</p>
        </div>
        <div className="space-y-2">
          <h6 className="font-semibold text-text-primary">{t('tasks.formRequirementsLabel')}</h6>
          {task.requirements && task.requirements.length > 0 ? (
            <ul className="text-sm space-y-1">
              {task.requirements.map(req => (
                <li key={req.id || req.temp_id} className={req.is_provided ? 'text-status-success-text' : 'text-text-secondary'}>
                  {req.is_provided ? '✓' : '○'} {req.requirement_text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">لا توجد متطلبات لهذه المهمة.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button variant="secondary" onClick={closeModal}>{t('common.close')}</Button>
      </div>
    </BaseModal>
  );
};

export default TaskDetailsModal;