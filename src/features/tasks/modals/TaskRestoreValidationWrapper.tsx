
import React, { useEffect } from 'react';
import { useValidateRestoreTask, useRestoreTask } from '@/features/tasks/api/taskQueries';
import TaskRestoreValidationModal from './TaskRestoreValidationModal';

import { useToast } from '@/shared/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '@/shared/stores/modalStore';

interface TaskRestoreValidationWrapperProps {
    taskId: number;
    onClose: () => void;
}

const TaskRestoreValidationWrapper: React.FC<TaskRestoreValidationWrapperProps> = ({ taskId, onClose }) => {
    const validateRestore = useValidateRestoreTask();
    const restoreTask = useRestoreTask();
    const { error, success } = useToast();
    const queryClient = useQueryClient();
    const closeModal = useModalStore(state => state.closeModal);

    useEffect(() => {
        validateRestore.mutate(taskId);
    }, [taskId]);

    const handleConfirm = async () => {
        try {
            await restoreTask.mutateAsync({ id: taskId });
            success('تمت الاستعادة', 'تم استرداد المهمة بنجاح');
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
            closeModal();
        } catch (err: any) {
            console.error('Task restore error:', err);
            // error toast is handled by mutation onError usually, or here
            error('فشل', err.message || 'فشل في استرداد المهمة');
        }
    };

    if (validateRestore.isPending) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-card p-6 rounded-lg shadow-xl flex flex-col items-center border border-border">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-text-secondary">جاري التحقق من إمكانية استعادة المهمة...</p>
                </div>
            </div>
        );
    }

    if (validateRestore.isError) {
        // If validation fails (e.g. task not found), show error and close
        // But we should probably let the user see the error in a modal or toast
        // The useEffect won't run again unless taskId changes.
        // Maybe render an error state or just rely on toast?
        return null;
    }

    if (validateRestore.isSuccess && validateRestore.data) {
        return (
            <TaskRestoreValidationModal
                isOpen={true}
                onClose={onClose}
                onConfirm={handleConfirm}
                validation={validateRestore.data}
                isPending={restoreTask.isPending}
            />
        );
    }

    return null;
};

export default TaskRestoreValidationWrapper;
