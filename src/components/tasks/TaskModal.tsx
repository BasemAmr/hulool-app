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
import { XCircle, PlusCircle, Trash2, CheckCircle, Layers, Plus } from 'lucide-react';
import ClientHistoryIcons from '../shared/ClientHistoryIcons';
import TaskSuccessModal from './TaskSuccessModal';
import TaskHistoryModal from '../shared/TaskHistoryModal';
import PaymentHistoryModal from '../shared/PaymentHistoryModal';
import { playNotificationSound } from '../../utils/soundUtils';
import { Accordion } from 'react-bootstrap';

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

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const updateTaskWithConflictsMutation = useUpdateTaskWithConflicts();
  const createRequirementsMutation = useCreateRequirements();

  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending || updateTaskWithConflictsMutation.isPending || createRequirementsMutation.isPending;

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
      // If existing task has subtasks use them, otherwise for legacy tasks create a virtual subtask representing the main amount
      const existingSubtasks = taskToEdit.subtasks && taskToEdit.subtasks.length > 0 ? taskToEdit.subtasks : [];
      if (existingSubtasks.length > 0) {
        setValue('subtasks', existingSubtasks);
        setLocalSubtasks(existingSubtasks);
      } else if (taskToEdit.amount && Number(taskToEdit.amount) > 0) {
        // create a virtual subtask so UI shows progress and allows editing; marked as not-completed
        const virtual = [{ description: taskToEdit.task_name || 'المهمة الرئيسية', amount: Number(taskToEdit.amount), is_completed: false }];
        setValue('subtasks', virtual);
        setLocalSubtasks(virtual);
      } else {
        setValue('subtasks', []);
        setLocalSubtasks([]);
      }
      setStep(2);
      setSearchedClient(taskToEdit.client);
    } else if (client) {
      setValue('client_id', client.id);
      setValue('tags', []);
      setLocalRequirements([]);
      setLocalSubtasks([{ description: '', amount: 0, is_completed: false }]); // Initialize with one empty subtask
      setStep(0);
      setSearchedClient(client);
    } else {
      setValue('tags', []);
      setLocalSubtasks([{ description: '', amount: 0, is_completed: false }]); // Initialize with one empty subtask
      setStep(0);
      setSearchedClient(undefined);
    }
  }, [taskToEdit, client, setValue]);

  useEffect(() => {
    if (!isEditMode && client && watch('type') && step === 1) {
      setStep(2);
    }
  }, [watch('type'), client, step, isEditMode]);

  // Effect to update amount when subtasks change
  useEffect(() => {
    if (localSubtasks.length > 0) {
      const validSubtasks = localSubtasks.filter(subtask => 
        subtask.description && subtask.description.trim() && subtask.amount >= 0
      );
      if (validSubtasks.length > 0) {
        const total = calculateTotal();
        setValue('amount', total);
      }
    }
  }, [localSubtasks, setValue]);

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

    // Filter valid subtasks and calculate final amount
    const validSubtasks = localSubtasks.filter(subtask => 
      subtask.description && subtask.description.trim() && subtask.amount >= 0
    );
    const finalAmount = validSubtasks.length > 0 ? calculateTotal() : Number(data.amount);
    
    if (isEditMode && taskToEdit) {
      const updatePayload: UpdateTaskPayload = {
        ...data,
        amount: finalAmount,
        end_date: data.end_date || undefined,
        prepaid_amount: data.prepaid_amount ? Number(data.prepaid_amount) : undefined,
        tags: data.tags || [],
        amount_details: [], // Remove amount_details as per requirements
        subtasks: validSubtasks,
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
        amount: finalAmount,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        prepaid_amount: data.prepaid_amount ? Number(data.prepaid_amount) : undefined,
        notes: data.notes,
        tags: data.tags || [],
        amount_details: [], // Remove amount_details as per requirements
        subtasks: validSubtasks,
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
  const addSubtask = () => {
    setLocalSubtasks([...localSubtasks, { description: '', amount: 0, is_completed: false }]);
  };

  const removeSubtask = (index: number) => {
    if (localSubtasks.length > 1) {
      const updatedSubtasks = localSubtasks.filter((_, i) => i !== index);
      setLocalSubtasks(updatedSubtasks);
      // Update the amount field when subtasks change
      const newTotal = updatedSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
      setValue('amount', newTotal);
    }
  };

  const handleSubtaskChange = (index: number, field: keyof any, value: string | number | boolean) => {
    const updatedSubtasks = [...localSubtasks];
    if (field === 'amount') {
      updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: Number(value) };
    } else {
      updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: value };
    }
    setLocalSubtasks(updatedSubtasks);
    
    // Update the total amount automatically
    const newTotal = updatedSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
    setValue('amount', newTotal);
  };

  const calculateTotal = () => {
    return localSubtasks.reduce((sum, subtask) => sum + (subtask.amount || 0), 0);
  };

  const calculateProgress = () => {
    const validSubtasks = localSubtasks.filter(subtask => 
      subtask.description && subtask.description.trim() && subtask.amount >= 0
    );
    
    if (validSubtasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = validSubtasks.filter(subtask => subtask.is_completed).length;
    const total = validSubtasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const hasSubtasks = () => {
    return localSubtasks && localSubtasks.length > 0 && localSubtasks.some(s => s.description && s.description.trim());
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
                {/* Row 1: Task Type, Client Name, Assigned Employee */}
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-bold mb-1">نوع مهمة</label>
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
                    {errors.type && <div className="invalid-feedback">مطلوب</div>}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-bold mb-1">اسم العميل</label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        className="form-control form-control-sm"
                        value={currentClientDisplay?.name || ''}
                        readOnly={isEditMode}
                        disabled={isEditMode}
                      />
                      {currentClientDisplay && (
                        <ClientHistoryIcons
                          onViewTaskHistory={() => setShowTaskHistory(true)}
                          onViewPaymentHistory={() => setShowPaymentHistory(true)}
                        />
                      )}
                    </div>
                    {!isEditMode && step === 2 && (
                      <small className="text-muted">
                        <button 
                          type="button" 
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          onClick={() => setStep(1)}
                        >
                          تغيير العميل
                        </button>
                      </small>
                    )}
                    <Controller
                      name="client_id"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
                    />
                  </div>

                  {isAdmin() && (
                    <div className="col-md-4">
                      <label className="form-label small fw-bold mb-1">تكليف الموظف</label>
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

                {/* Row: Task Name (Required) + Start Date */}
                <div className="row g-2 mb-3">
                  <div className="col-md-8">
                    <label className="form-label small fw-bold mb-1">
                      المهمة الرئيسية <span className="text-danger">*</span>
                    </label>
                    <input
                      className={`form-control form-control-sm ${errors.task_name ? 'is-invalid' : ''}`}
                      {...register('task_name', { required: true })}
                      placeholder="أدخل اسم المهمة..."
                    />
                    {errors.task_name && <div className="invalid-feedback">اسم المهمة مطلوب</div>}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-bold mb-1">التاريخ الإنشاء</label>
                    <input
                      className={`form-control form-control-sm ${errors.start_date ? 'is-invalid' : ''}`}
                      type="date"
                      {...register('start_date', { required: true })}
                    />
                    {errors.start_date && <div className="invalid-feedback">مطلوب</div>}
                  </div>
                </div>

                {/* Progress Bar for Subtasks (if exists) */}
                {hasSubtasks() && (
                  <div 
                    className="mb-3 p-3 rounded"
                    style={{ 
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      border: '1px solid #dee2e6'
                    }}
                  >
                    <div className="row">
                      <div className="col-md-8">
                        <div className="fw-bold mb-2 d-flex align-items-center">
                          <Layers size={16} className="me-2" style={{ color: '#0ea5e9' }} />
                          تقدم إنجاز المهام الفرعية
                        </div>
                        <div className="progress mb-2" style={{ height: '8px' }}>
                          <div 
                            className="progress-bar bg-success" 
                            style={{ width: `${calculateProgress().percentage}%` }}
                          ></div>
                        </div>
                        <small className="text-muted">
                          {calculateProgress().completed} من {calculateProgress().total} مهام مكتملة
                        </small>
                      </div>
                      <div className="col-md-4 text-end">
                        <div className="d-flex flex-column align-items-end">
                          <div className="h5 mb-1">{calculateProgress().percentage}%</div>
                          <small className="text-success fw-bold">
                            {calculateProgress().completed}/{calculateProgress().total}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtasks Table */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label small fw-bold mb-0">
                      <span 
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: '#1976d2', color: 'white', fontSize: '0.75rem' }}
                      >
                        إضافة مهمة فرعية
                      </span>
                    </label>
                  </div>

                  {/* Subtasks Header */}
                  <div 
                    className="row py-2 fw-bold text-center"
                    style={{ 
                      backgroundColor: '#1976d2', 
                      color: 'white',
                      margin: '0',
                      borderRadius: '4px 4px 0 0'
                    }}
                  >
                    <div className="col-6">البيان</div>
                    <div className="col-3">المبلغ</div>
                    <div className="col-3">الإجراءات</div>
                  </div>

                  {/* Subtasks List */}
                  <div style={{ border: '1px solid #1976d2', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                    {localSubtasks.map((subtask, index) => (
                      <div 
                        key={index} 
                        className={`row py-2 align-items-center ${index % 2 === 0 ? 'bg-light' : 'bg-white'}`}
                        style={{ margin: '0', borderBottom: index === localSubtasks.length - 1 ? 'none' : '1px solid #e9ecef' }}
                      >
                        <div className="col-6">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={subtask.description || ''}
                            onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                            placeholder="وصف المهمة الفرعية..."
                          />
                        </div>
                        <div className="col-3">
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={subtask.amount || ''}
                            onChange={(e) => handleSubtaskChange(index, 'amount', Number(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-3 text-center">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              type="button"
                              className={`btn btn-sm ${subtask.is_completed ? 'btn-success' : 'btn-outline-success'}`}
                              onClick={() => handleSubtaskChange(index, 'is_completed', !subtask.is_completed)}
                              title={subtask.is_completed ? 'مكتملة' : 'غير مكتملة'}
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeSubtask(index)}
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add New Subtask Row */}
                    <div 
                      className="row py-2 text-center"
                      style={{ 
                        margin: '0',
                        backgroundColor: '#f8f9fa',
                        borderTop: localSubtasks.length > 0 ? '1px solid #e9ecef' : 'none'
                      }}
                    >
                      <div className="col-12">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={addSubtask}
                        >
                          <Plus size={14} className="me-1" />
                          إضافة مهمة فرعية جديدة
                        </button>
                      </div>
                    </div>

                    {/* Total Row */}
                    {localSubtasks.length > 0 && (
                      <div 
                        className="row py-2 fw-bold text-center"
                        style={{ 
                          backgroundColor: '#1976d2', 
                          color: 'white',
                          margin: '0'
                        }}
                      >
                        <div className="col-6">الإجمالي</div>
                        <div className="col-3">{calculateTotal()}</div>
                        <div className="col-3">-</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* بيانات أخرى Accordion */}
                <Accordion className="mb-3">
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>بيانات أخرى</Accordion.Header>
                    <Accordion.Body>
                      {/* Prepaid Amount */}
                      <div className="row g-2 mb-3">
                        <div className="col-12">
                          <label className="form-label small fw-bold mb-1">المدفوع مقدماً</label>
                          <input
                            className={`form-control form-control-sm ${errors.prepaid_amount ? 'is-invalid' : ''}`}
                            type="number"
                            step="1"
                            placeholder="المبلغ المقدم"
                            {...register('prepaid_amount', { 
                              validate: value => {
                                const amount = calculateTotal() || 0;
                                return !value || value <= amount || 'المبلغ المقدم لا يمكن أن يتجاوز مبلغ المهمة';
                              }
                            })}
                          />
                          {errors.prepaid_amount && <div className="invalid-feedback">{errors.prepaid_amount.message}</div>}
                        </div>
                      </div>

                      {/* End Date (moved here) */}
                      <div className="row g-2 mb-3">
                        <div className="col-12">
                          <label className="form-label small fw-bold mb-1">تاريخ الانتهاء</label>
                          <input
                            className="form-control form-control-sm"
                            type="date"
                            {...register('end_date')}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="row g-2 mb-3">
                        <div className="col-12">
                          <label className="form-label small fw-bold mb-1">ملاحظات</label>
                          <textarea
                            className="form-control form-control-sm"
                            {...register('notes')}
                            rows={3}
                            placeholder="أدخل ملاحظات إضافية..."
                          />
                        </div>
                      </div>

                      {/* Requirements Section */}
                      <div className="requirements-section">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label small fw-bold mb-0">المتطلبات</label>
                          <Button
                            type="button"
                            variant="outline-primary"
                            size="sm"
                            onClick={addRequirementField}
                            className="btn-xs"
                          >
                            <PlusCircle size={14} className="me-1" /> إضافة متطلب
                          </Button>
                        </div>

                        {localRequirements.length === 0 ? (
                          <div className="text-muted text-center py-3">
                            <p className="mb-0 small">لا توجد متطلبات</p>
                          </div>
                        ) : (
                          <div className="requirements-list">
                            {localRequirements.map((req, index) => (
                              <div key={req.temp_id || String(req.id)} className="requirement-item mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <div className="form-check">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
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
                                      placeholder={`متطلب ${index + 1}`}
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
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
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
    </>
  );
};

export default TaskModal;