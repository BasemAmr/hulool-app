import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { 
  Client, 
  Task, 
  TaskPayload, 
  Requirement, 
  UpdateTaskPayload, 
  TaskType,
  ConflictResponse,
  PrepaidConflictData,
  TaskAmountConflictData,
  ConcurrentModificationData
} from '../../api/types';
import { 
  useCreateTask, 
  useUpdateTask, 
  useCreateRequirements, 
  useUpdateTaskWithConflicts 
} from '../../queries/taskQueries';
import { useGetEmployeesForSelection } from '../../queries/employeeQueries';
import { useModalStore } from '../../stores/modalStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/useToast';

import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { XCircle, PlusCircle, Settings } from 'lucide-react';
import ClientHistoryIcons from '../shared/ClientHistoryIcons';
import TaskSuccessModal from './TaskSuccessModal';
import TaskHistoryModal from '../shared/TaskHistoryModal';
import PaymentHistoryModal from '../shared/PaymentHistoryModal';
import AmountDetailsInput from '../shared/AmountDetailsInput';
import SubtasksModal from '../modals/SubtasksModal';
import { playNotificationSound } from '../../utils/soundUtils';

// Import step components
import TaskTypeStep from './steps/TaskTypeStep';
import ClientSelectionStep from './steps/ClientSelectionStep';

import ModalFooter from './steps/ModalFooter';

interface TaskModalProps {
  taskToEdit?: Task;
  client?: Client;
}

const TaskModal = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { isAdmin } = useAuthStore();
  
  const closeModal = useModalStore((state) => state.closeModal);
  const openModal = useModalStore((state) => state.openModal);
  const props = useModalStore((state) => state.props as TaskModalProps);

  const { taskToEdit, client } = props;
  const isEditMode = !!taskToEdit;
  const [step, setStep] = useState(isEditMode ? 2 : 0);
  const [searchedClient, setSearchedClient] = useState<Client | undefined>(client);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [localRequirements, setLocalRequirements] = useState<Requirement[]>([]);
  const [localSubtasks, setLocalSubtasks] = useState<any[]>([]);
  const [showSubtasksModal, setShowSubtasksModal] = useState(false);

  // Fetch employees for assignment dropdown
  const { data: employees = [] } = useGetEmployeesForSelection();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TaskPayload>({
    defaultValues: {
      client_id: taskToEdit?.client_id || client?.id,
      assigned_to_id: taskToEdit?.assigned_to_id || undefined,
      task_name: taskToEdit?.task_name || '',
      type: taskToEdit?.type || undefined,
      amount: taskToEdit?.amount || undefined,
      start_date: taskToEdit?.start_date || new Date().toISOString().split('T')[0],
      end_date: taskToEdit?.end_date || undefined,
      prepaid_amount: taskToEdit?.prepaid_amount || undefined,
      notes: taskToEdit?.notes || '',
      tags: [],
      amount_details: [],
      subtasks: [],
    },
  });

  const totalAmount = watch('amount') || 0;

  useEffect(() => {
    if (taskToEdit) {
      setLocalRequirements(taskToEdit.requirements.map(req => ({
        ...req,
        id: req.id,
        is_provided: typeof req.is_provided === 'string' ? req.is_provided === '1' : Boolean(req.is_provided),
        temp_id: req.id ? String(req.id) : uuidv4()
      })));
      setValue('client_id', taskToEdit.client_id);
      setValue('task_name', taskToEdit.task_name || '');
      setValue('type', taskToEdit.type);
      setValue('amount', taskToEdit.amount);
      setValue('start_date', taskToEdit.start_date);
      setValue('end_date', taskToEdit.end_date || undefined);
      setValue('prepaid_amount', taskToEdit.prepaid_amount || 0);
      setValue('notes', taskToEdit.notes || '');
      setValue('tags', taskToEdit.tags ? taskToEdit.tags.map(tag => typeof tag === 'object' ? String(tag.id || tag) : String(tag)) : []);
      setValue('amount_details', taskToEdit.amount_details || []);
      setValue('subtasks', taskToEdit.subtasks || []);
      setLocalSubtasks(taskToEdit.subtasks || []);
      setStep(2);
      setSearchedClient(taskToEdit.client);
    } else if (client) {
      setValue('client_id', client.id);
      setValue('tags', []);
      setLocalRequirements([]);
      setStep(0);
      setSearchedClient(client);
    } else {
      setValue('tags', []);
      setStep(0);
      setSearchedClient(undefined);
    }
  }, [taskToEdit, client, setValue]);

  useEffect(() => {
    if (!isEditMode && client && watch('type') && step === 1) {
      setStep(2);
    }
  }, [watch('type'), client, step, isEditMode]);

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const updateTaskWithConflictsMutation = useUpdateTaskWithConflicts();
  const createRequirementsMutation = useCreateRequirements();

  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending || updateTaskWithConflictsMutation.isPending || createRequirementsMutation.isPending;

  // Conflict handling function
  const handleConflictResponse = (
    conflictResponse: ConflictResponse<PrepaidConflictData | TaskAmountConflictData | ConcurrentModificationData>,
    originalPayload: UpdateTaskPayload
  ) => {
    const conflictData = conflictResponse.data;

    if ('conflict_type' in conflictData) {
      if (conflictData.conflict_type === 'prepaid_amount_change_conflict') {
        // Handle prepaid conflict
        const prepaidConflictData = conflictData as PrepaidConflictData;
        openModal('prepaidConflict', {
          taskId: taskToEdit!.id,
          conflictData: prepaidConflictData,
          newPrepaidAmount: originalPayload.prepaid_amount || 0,
          onResolved: () => {
            toast.showToast({
              type: 'success',
              title: t('tasks.conflictResolved')
            });
            closeModal();
          }
        });
      } else if (conflictData.conflict_type === 'main_receivable_overpayment') {
        // Handle task amount conflict
        const amountConflictData = conflictData as TaskAmountConflictData;
        openModal('taskAmountConflict', {
          taskId: taskToEdit!.id,
          conflictData: amountConflictData,
          newTaskAmount: originalPayload.amount || 0,
          onResolved: () => {
            toast.showToast({
              type: 'success',
              title: t('tasks.conflictResolved')
            });
            closeModal();
          }
        });
      }
    } else if ('expected_updated_at' in conflictData) {
      // Handle concurrent modification
      const concurrentData = conflictData as ConcurrentModificationData;
      openModal('concurrentModification', {
        conflictData: concurrentData,
        onRetry: (useCurrentData: boolean) => {
          if (useCurrentData) {
            // Update form with current data and retry
            const currentTask = concurrentData.current_task_data;
            setValue('task_name', currentTask.task_name || '');
            setValue('amount', currentTask.amount);
            setValue('prepaid_amount', currentTask.prepaid_amount || 0);
            setValue('notes', currentTask.notes || '');
            // Update other fields as needed
            
            // Retry the update with current timestamp
            const retryPayload = {
              ...originalPayload,
              expected_updated_at: concurrentData.current_updated_at
            };
            updateTaskWithConflictsMutation.mutate({ id: taskToEdit!.id, taskData: retryPayload });
          } else {
            // Force overwrite - retry with original payload but new timestamp
            const forcePayload = {
              ...originalPayload,
              expected_updated_at: concurrentData.current_updated_at
            };
            updateTaskWithConflictsMutation.mutate({ id: taskToEdit!.id, taskData: forcePayload });
          }
        },
        onCancel: () => {
          // User cancelled, do nothing
        }
      });
    }
  };

  // Helper to safely parse amount_details
  const parseAmountDetails = (details: any): any[] => {
    if (Array.isArray(details)) {
      return details;
    }
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Helper function to handle prepaid payment flow with credit support
  const handlePrepaidPayment = (createdTask: any) => {
    if (createdTask.prepaid_receivable_id && createdTask.receivable) {
      // For now, skip credit check and proceed with regular payment flow
      // This can be enhanced later to check client credits via API
      closeModal();
      openModal('paymentForm', { 
        receivable: createdTask.receivable,
        isRequired: true
      });
    } else {
      // No prepaid amount, show success modal as usual
      setShowSuccessModal(true);
    }
  };

  const onSubmit = (data: TaskPayload) => {
    const validRequirements = localRequirements
      .filter(req => req.requirement_text && String(req.requirement_text).trim() !== '')
      .map(req => ({
        requirement_text: String(req.requirement_text || '').trim(),
        is_provided: Boolean(req.is_provided || false)
      }));

    // console.log('Valid requirements being sent:', validRequirements);
    // console.log('Tags being sent:', data.tags);
    
    if (isEditMode && taskToEdit) {
      const updatePayload: UpdateTaskPayload = {
        ...data,
        amount: Number(data.amount),
        end_date: data.end_date || undefined,
        prepaid_amount: data.prepaid_amount ? Number(data.prepaid_amount) : undefined,
        tags: data.tags || [],
        amount_details: parseAmountDetails(data.amount_details),
        subtasks: localSubtasks || [],
        assigned_to_id: isAdmin() ? (data.assigned_to_id !== undefined ? data.assigned_to_id : taskToEdit?.assigned_to_id) : undefined,
        requirements: localRequirements
          .filter(req => req.requirement_text && String(req.requirement_text).trim() !== '')
          .map(req => ({
            id: req.id,
            requirement_text: String(req.requirement_text || '').trim(),
            is_provided: Boolean(req.is_provided || false)
          })),
      };

      console.log('Debug assignment logic:', {
        isAdmin: isAdmin(),
        updatePayload_assigned_to_id: updatePayload.assigned_to_id,
        taskToEdit_assigned_to_id: taskToEdit?.assigned_to_id,
        areEqual: updatePayload.assigned_to_id === taskToEdit?.assigned_to_id
      });
      
      // Add optimistic locking timestamp
      const updatePayloadWithLocking = {
        ...updatePayload,
        expected_updated_at: taskToEdit.updated_at
      };

      console.log('Final update payload:', updatePayloadWithLocking);

      // Use the new conflict-aware update mutation
      updateTaskWithConflictsMutation.mutate({ id: taskToEdit.id, taskData: updatePayloadWithLocking }, {
        onSuccess: (result) => {
          // Check if it's a conflict response
          if ('success' in result && result.success === false) {
            const conflictResponse = result as ConflictResponse<PrepaidConflictData | TaskAmountConflictData | ConcurrentModificationData>;
            handleConflictResponse(conflictResponse, updatePayload);
            return;
          }

          // It's a successful update
          toast.success('تم التحديث بنجاح', 'تم تحديث المهمة بنجاح');
          closeModal();
        },
        onError: (error: any) => {
          console.error('Update error:', error);
          toast.error('خطأ في التحديث', error?.response?.data?.message || 'حدث خطأ أثناء تحديث المهمة');
        }
      });
    } else {
      const createPayload: TaskPayload = {
        client_id: data.client_id,
        task_name: data.task_name,
        type: data.type,
        amount: Number(data.amount),
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        prepaid_amount: data.prepaid_amount ? Number(data.prepaid_amount) : undefined,
        notes: data.notes,
        tags: data.tags || [],
        amount_details: parseAmountDetails(data.amount_details),
        subtasks: localSubtasks || [],
        assigned_to_id: isAdmin() ? data.assigned_to_id : undefined,
      };
      
      // console.log('Create payload (with tags):', createPayload);
      
      createTaskMutation.mutate(createPayload, {
        onSuccess: (createdTask) => {
          // console.log('Task created successfully:', createdTask);
          
          // Play notification sound when task is created successfully
          playNotificationSound();
          
          if (validRequirements.length > 0) {
            // console.log('Creating requirements for task:', createdTask.id);
            
            createRequirementsMutation.mutate(
              {
                task_id: createdTask.id,
                requirements: validRequirements
              },
              {
                onSuccess: () => {
                  // console.log('Requirements created successfully');
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                  handlePrepaidPayment(createdTask);
                },
                onError: (error: any) => {
                  console.error('Requirements creation error:', error);
                  toast.error('خطأ في إنشاء المتطلبات', error?.response?.data?.message || 'تم إنشاء المهمة لكن حدث خطأ في المتطلبات');
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                  handlePrepaidPayment(createdTask);
                }
              }
            );
          } else {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            handlePrepaidPayment(createdTask);
          }
        },
        onError: (error: any) => {
          console.error('Create error:', error);
          toast.error('خطأ في الإنشاء', error?.response?.data?.message || 'حدث خطأ أثناء إنشاء المهمة');
        }
      });
    }
  };

  const addRequirementField = () => {
    setLocalRequirements((prev) => [
      ...prev,
      { 
        temp_id: uuidv4(), 
        requirement_text: '', 
        is_provided: false,
        id: undefined
      },
    ]);
  };

  const updateRequirementText = (id: string | number | undefined, text: string) => {
    if (id === undefined) return;
    setLocalRequirements((prev) =>
      prev.map((req) => (
        (req.temp_id === id || req.id === id) ? { ...req, requirement_text: text } : req
      ))
    );
  };

  const toggleRequirementProvided = (id: string | number | undefined) => {
    if (id === undefined) return;
    setLocalRequirements((prev) =>
      prev.map((req) => (
        (req.temp_id === id || req.id === id) ? { ...req, is_provided: !req.is_provided } : req
      ))
    );
  };

  const removeRequirementField = (id: string | number | undefined) => {
    if (id === undefined) return;
    setLocalRequirements((prev) => prev.filter((req) => req.temp_id !== id && req.id !== id));
  };

  // Subtasks management functions
  const openSubtasksModal = () => {
    setShowSubtasksModal(true);
  };

  // Check if amount should be disabled (when subtasks exist and sum matches amount)
  const shouldDisableAmount = () => {
    if (!localSubtasks || localSubtasks.length === 0) {
      return false;
    }

    const subtasksTotal = localSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
    const currentAmount = watch('amount') || 0;
    
    // Allow for small floating point differences
    return Math.abs(currentAmount - subtasksTotal) < 0.01;
  };

  const hasSubtasks = () => {
    return localSubtasks && localSubtasks.length > 0;
  };

  const taskTypes: TaskType[] = ['Government', 'RealEstate', 'Accounting', 'Other'];
  const currentClientDisplay = searchedClient || client || taskToEdit?.client;

  return (
    <>
      <BaseModal
        isOpen={true}
        onClose={closeModal}
        title={isEditMode ? t('tasks.editTask') : t('tasks.addNew')}
        className="task-modal-compact"
      >
        <div className="modal-content-wrapper">
          <form onSubmit={handleSubmit(onSubmit)} className="h-100">
            {/* Step 0: Task Type Selection */}
            {step === 0 && !isEditMode && (
              <div className="step-content">
                <TaskTypeStep
                  control={control}
                  errors={errors}
                  onTypeSelected={() => setStep(1)}
                />
              </div>
            )}

            {/* Step 1: Client Search/Select */}
            {step === 1 && !isEditMode && (
              <div className="step-content">
                <ClientSelectionStep
                  control={control}
                  errors={errors}
                  watch={watch}
                  client={client}
                  onClientSelected={(clientObj: Client) => {
                    setSearchedClient(clientObj);
                    setValue('client_id', clientObj.id);
                    setStep(2);
                  }}
                />
              </div>
            )}

            {/* Step 2: Main form content */}
            {(step === 2 || isEditMode) && (
              <div className="step-content main-form fade-in">
                {/* Compact grid layout for main fields */}
                <div className="form-grid">
                  {/* Task Type - smaller */}
                  <div className="form-group-compact">
                    <label className="form-label-compact">{t('tasks.formTypeLabel')}</label>
                    <Controller
                      name="type"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className={`form-select form-select-sm ${errors.type ? 'is-invalid' : ''}`}
                        >
                          <option value="">{t('tasks.formTypeLabel')}</option>
                          {taskTypes.map((type) => (
                            <option key={type} value={type}>{t(`type.${type}`)}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.type && <div className="invalid-feedback-compact">{t('tasks.formTypeLabel')} is required</div>}
                  </div>

                  {/* Client Display with History Icons - compact */}
                  <div className="form-group-compact client-section">
                    <div className="d-flex align-items-end gap-2">
                      <div className="flex-grow-1">
                        <label className="form-label-compact">{t('tasks.formClientLabel')}</label>
                        <div className="client-input-wrapper">
                          <input
                            className="form-control form-control-sm"
                            value={currentClientDisplay?.name || ''}
                            readOnly={isEditMode}
                            disabled={isEditMode}
                          />
                          {!isEditMode && step === 2 && (
                            <small className="text-muted mt-1">
                              <button 
                                type="button" 
                                className="btn btn-link btn-sm p-0 text-decoration-none"
                                onClick={() => setStep(1)}
                              >
                                تغيير العميل
                              </button>
                            </small>
                          )}
                        </div>
                      </div>
                      {currentClientDisplay && (
                        <div className="client-icons">
                          <ClientHistoryIcons
                            onViewTaskHistory={() => setShowTaskHistory(true)}
                            onViewPaymentHistory={() => setShowPaymentHistory(true)}
                          />
                        </div>
                      )}
                    </div>
                    <Controller
                      name="client_id"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
                    />
                  </div>

                  {/* Employee Assignment Field */}
                  {isAdmin() && (
                    <div className="form-group-compact">
                      <label className="form-label-compact">تكليف الموظف</label>
                      <Controller
                        name="assigned_to_id"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="form-select form-select-sm"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          >
                            <option value="">غير مكلف</option>
                            {employees.map((employee) => (
                              <option key={employee.user_id} value={employee.user_id}>
                                {employee.display_name}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Date fields row */}
                <div className="form-row">
                  <div className="form-group-half">
                    <label className="form-label-compact">{t('tasks.formDateLabel')}</label>
                    <input
                      className={`form-control form-control-sm ${errors.start_date ? 'is-invalid' : ''}`}
                      type="date"
                      {...register('start_date', { required: true })}
                    />
                    {errors.start_date && <div className="invalid-feedback-compact">Start date is required</div>}
                  </div>
                  <div className="form-group-half">
                    <label className="form-label-compact">{t('tasks.formEndDateLabel', 'تاريخ الانتهاء (اختياري)')}</label>
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      {...register('end_date')}
                    />
                  </div>
                </div>

                {/* Amount and Prepaid row */}
                <div className="form-row">
                  <div className="form-group-half">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label-compact mb-0">{t('tasks.formAmountLabel')}</label>
                      {hasSubtasks() && (
                        <span className="badge bg-info text-dark small">
                          محسوب من المهام الفرعية
                        </span>
                      )}
                    </div>
                    <div className="input-group">
                      <input
                        className={`form-control form-control-sm ${errors.amount ? 'is-invalid' : ''} ${shouldDisableAmount() ? 'bg-light' : ''}`}
                        type="number"
                        step="1"
                        placeholder="المبلغ المطلوب"
                        disabled={shouldDisableAmount()}
                        {...register('amount', { 
                          required: true, 
                          valueAsNumber: true
                        })}
                      />
                      <Button
                        type="button"
                        variant="outline-secondary"
                        size="sm"
                        onClick={openSubtasksModal}
                        className={`btn-subtasks ${hasSubtasks() ? 'has-subtasks' : ''}`}
                        title="إدارة المهام الفرعية"
                      >
                        <Settings size={14} />
                        {hasSubtasks() && <span className="ms-1">({localSubtasks.length})</span>}
                      </Button>
                    </div>
                    {shouldDisableAmount() && (
                      <small className="text-muted mt-1">
                        المبلغ محسوب تلقائياً من المهام الفرعية ({localSubtasks.length} مهمة)
                      </small>
                    )}
                    {hasSubtasks() && !shouldDisableAmount() && (
                      <small className="text-info mt-1">
                        هذه المهمة تحتوي على {localSubtasks.length} مهام فرعية
                      </small>
                    )}
                    {errors.amount && <div className="invalid-feedback-compact">Amount is required</div>}
                  </div>
                  <div className="form-group-half">
                    <label className="form-label-compact">{t('tasks.formPrepaidAmountLabel', 'المدفوع مقدما')}</label>
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      step="1"
                      placeholder="المبلغ المقدم"
                      {...register('prepaid_amount', { 
                        validate: value => {
                          const amount = watch('amount') || 0;
                          return !value || value <= amount || 'Prepaid amount cannot exceed task amount';
                        }
                      })}
                    />
                    {errors.prepaid_amount && <div className="invalid-feedback-compact">{errors.prepaid_amount.message}</div>}
                  </div>
                  
                </div>

                {/* { Name Row } */}
                <div className="form-row">
                  <div className="form-group-half">
                    <label className="form-label-compact">{t('tasks.formTaskNameLabel')}</label>
                    <input
                      className="form-control form-control-sm"
                      {...register('task_name')}
                    />
                  </div>
                  </div>


                {/* Amount Details & Notes row */}
                <div className="form-row">
                  <div className="form-group-half" style={{ width: '100%' }}>
                    <label className="form-label-compact">{t('tasks.formNotesLabel')}</label>
                    <textarea
                      className="form-control form-control-sm"
                      {...register('notes')}
                      rows={2}
                    />
                  </div>
                  <div className="form-group-half" style={{ width: '100%' }}>
                    <AmountDetailsInput 
                      control={control}
                      register={register}
                      totalAmount={totalAmount}
                    />
                  </div>
                </div>
                      
                {/* Requirements Section - Compact */}
                <div className="form-group-compact requirements-section">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label-compact mb-0">{t('tasks.formRequirementsLabel')}</label>
                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      onClick={addRequirementField}
                      className="btn-xs"
                    >
                      <PlusCircle size={14} className="me-1" /> {t('tasks.addRequirement')}
                    </Button>
                  </div>

                  {localRequirements.length === 0 ? (
                    <div className="empty-requirements">
                      <p className="text-muted mb-0 small">{t('tasks.noRequirements')}</p>
                    </div>
                  ) : (
                    <div className="requirements-list-compact">
                      {localRequirements.map((req, index) => (
                        <div key={req.temp_id || String(req.id)} className="requirement-item-compact">
                          <div className="d-flex align-items-center gap-2">
                            <div className="form-check form-check-sm">
                              <input
                                type="checkbox"
                                className="form-check-input form-check-input-sm"
                                id={`req-${req.temp_id || req.id}`}
                                checked={req.is_provided}
                                onChange={() => toggleRequirementProvided(req.temp_id || req.id)}
                              />
                            </div>
                            <div className="flex-grow-1">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={req.requirement_text}
                                onChange={(e) => updateRequirementText(req.temp_id || req.id, e.target.value)}
                                placeholder={`${t('tasks.requirementPlaceholder')} ${index + 1}`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => removeRequirementField(req.temp_id || req.id)}
                              className="btn-xs"
                              title="حذف المتطلب"
                            >
                              <XCircle size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <ModalFooter
              step={step}
              isEditMode={isEditMode}
              isLoading={isLoading}
              onBack={() => setStep(step - 1)}
              onClose={closeModal}
            />
          </form>
        </div>

        {/* Compact styling */}
        <style>{`
          .task-modal-compact {
            width: 90vw;
            max-width: 900px;
            margin: auto;
          }
          
          .modal-content-wrapper {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .step-content {
            flex: 1;
            overflow-y: auto;
            padding: 0.75rem 0;
          }
          
          .main-form {
            padding-bottom: 1rem;
          }
          
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          
          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          
          .form-group-compact {
            margin-bottom: 0.75rem;
          }
          
          .form-group-half {
            min-width: 0;
          }
          
          .form-label-compact {
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 0.25rem;
            display: block;
            color: #495057;
          }
          
          .form-control-sm {
            font-size: 0.875rem;
            padding: 0.375rem 0.5rem;
          }
          
          .form-select-sm {
            font-size: 0.875rem;
            padding: 0.375rem 0.5rem;
          }
          
          .invalid-feedback-compact {
            font-size: 0.75rem;
            color: #dc3545;
            margin-top: 0.125rem;
          }
          
          .client-section {
            position: relative;
          }
          
          .client-input-wrapper {
            position: relative;
          }
          
          .client-icons {
            margin-bottom: 0.25rem;
          }
          
          .requirements-section {
            border: 1px solid #e9ecef;
            border-radius: 0.375rem;
            padding: 0.75rem;
            background-color: #f8f9fa;
          }
          
          .requirements-list-compact {
            max-height: 120px;
            overflow-y: auto;
          }
          
          .requirement-item-compact {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            background: white;
            border-radius: 0.25rem;
            border: 1px solid #e9ecef;
          }
          
          .requirement-item-compact:last-child {
            margin-bottom: 0;
          }
          
          .empty-requirements {
            text-align: center;
            padding: 1rem;
            color: #6c757d;
          }
          
          .btn-xs {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            line-height: 1.2;
          }
          
          .form-check-sm {
            margin-bottom: 0;
          }
          
          .form-check-input-sm {
            width: 1rem;
            height: 1rem;
          }
          
          .fade-in {
            animation: fadeIn 0.3s ease-in-out;
          }
          
          @keyframes fadeIn {
            from { 
              opacity: 0; 
              transform: translateY(10px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
            .task-modal-compact {
              width: 95vw;
              height: 90vh;
            }
            
            .form-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }
            
            .form-row {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }
          }
        `}</style>
      </BaseModal>

      {/* Success Modal */}
      <TaskSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          closeModal();
        }}
        onViewAllTasks={() => {
          setShowSuccessModal(false);
          closeModal();
          navigate(
            isAdmin() ? '/tasks' : '/employee/tasks'
          );
        }}
        onAddNewTask={() => {
          setShowSuccessModal(false);
          setStep(0);
          setSearchedClient(undefined);
          setLocalRequirements([]);
        }}
      />

      {/* Task History Modal */}
      <TaskHistoryModal
        isOpen={showTaskHistory}
        onClose={() => setShowTaskHistory(false)}
        clientName={currentClientDisplay?.name || ''}
        clientId={currentClientDisplay?.id || 0}
      />

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={showPaymentHistory}
        onClose={() => setShowPaymentHistory(false)}
        clientName={currentClientDisplay?.name || ''}
        clientId={currentClientDisplay?.id || 0}
      />

      {/* Subtasks Modal */}
      {showSubtasksModal && (
        <SubtasksModal
          subtasks={localSubtasks}
          onSave={(updatedSubtasks) => {
            setLocalSubtasks(updatedSubtasks);
            setValue('subtasks', updatedSubtasks);
            
            // Calculate and update amount from subtasks
            if (updatedSubtasks.length > 0) {
              const calculatedAmount = updatedSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
              setValue('amount', calculatedAmount);
            }
            
            setShowSubtasksModal(false);
          }}
          onClose={() => setShowSubtasksModal(false)}
        />
      )}
    </>
  );
};

export default TaskModal;