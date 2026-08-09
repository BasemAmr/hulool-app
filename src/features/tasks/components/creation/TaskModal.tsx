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
} from '@/api/types';
import {
  useCreateTask,
  useUpdateTask,
  useCreateRequirements,
  useUpdateTaskWithConflicts,
  useAssignTask
} from '@/features/tasks/api/taskQueries';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/shared/hooks/useToast';

import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { XCircle, PlusCircle, Trash2, CheckCircle, Layers, Plus, UserCheck } from 'lucide-react';
import ClientHistoryIcons from '@/features/clients/components/ClientHistoryIcons';
import TaskSuccessModal from './TaskSuccessModal';
import TaskHistoryModal from '@/features/tasks/components/details/TaskHistoryModal';
import PaymentHistoryModal from '@/features/receivables/modals/SharedPaymentHistoryModal';
import ClientSearchCombobox from '@/shared/search/ClientSearchCombobox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/shadcn/accordion';

import { TOAST_MESSAGES } from '@/shared/constants/toastMessages';

import { NumberInput } from '@/shared/ui/primitives/NumberInput';
import { DateInput } from '@/shared/ui/primitives/DateInput';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';

interface TaskModalProps {
  taskToEdit?: Task;
  client?: Client;
}

const SELECT_NONE_ASSIGNEE = '__assignee_none__';

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
      amount: taskToEdit?.amount || 0,
      expense_amount: taskToEdit?.expense_amount || 0,
      start_date: taskToEdit?.start_date || new Date().toISOString().split('T')[0],
      end_date: taskToEdit?.end_date || undefined,
      prepaid_amount: taskToEdit?.prepaid_amount || 0,
      notes: taskToEdit?.notes || '',
      tags: [],
      amount_details: [],
      subtasks: [],
    },
  });

  const selectedType = watch('type');
  const selectedClientId = watch('client_id');
  const watchAmount = watch('amount');
  const watchExpenseAmount = watch('expense_amount');

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const updateTaskWithConflictsMutation = useUpdateTaskWithConflicts();
  const createRequirementsMutation = useCreateRequirements();
  const assignTaskMutation = useAssignTask();

  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending || updateTaskWithConflictsMutation.isPending || createRequirementsMutation.isPending;

  useEffect(() => {
    if (taskToEdit) {
      setLocalRequirements(taskToEdit?.requirements?.map(req => ({
        ...req,
        id: req.id,
        is_provided: typeof req.is_provided === 'string' ? req.is_provided === '1' : Boolean(req.is_provided),
        temp_id: req.id ? String(req.id) : uuidv4()
      })) || []);
      setValue('client_id', taskToEdit.client_id);
      setValue('task_name', taskToEdit.task_name || '');
      setValue('type', taskToEdit.type);
      setValue('amount', taskToEdit.amount);
      setValue('expense_amount', taskToEdit.expense_amount || 0);
      setValue('start_date', taskToEdit.start_date);
      setValue('end_date', taskToEdit.end_date || undefined);
      setValue('prepaid_amount', taskToEdit.prepaid_amount || 0);
      setValue('notes', taskToEdit.notes || '');
      setValue('assigned_to_id', taskToEdit.assigned_to_id || undefined);
      setValue('tags', taskToEdit?.tags ? taskToEdit.tags.map(tag => typeof tag === 'object' ? String(tag.id || tag) : String(tag)) : []);
      setValue('amount_details', taskToEdit.amount_details || []);
      const existingSubtasks = taskToEdit.subtasks && taskToEdit.subtasks.length > 0 ? taskToEdit.subtasks : [];
      if (existingSubtasks.length > 0) {
        setValue('subtasks', existingSubtasks);
        setLocalSubtasks(existingSubtasks);
      } else {
        setValue('subtasks', []);
        setLocalSubtasks([]);
      }
      setSearchedClient(taskToEdit.client);
    } else if (client) {
      setValue('client_id', client.id);
      setValue('tags', []);
      setLocalRequirements([]);
      setLocalSubtasks([]);
      setSearchedClient(client);
    } else {
      setValue('tags', []);
      setLocalRequirements([]);
      setLocalSubtasks([]);
      setSearchedClient(undefined);
    }
  }, [taskToEdit, client, setValue]);

  // Effect to update amount dynamically when subtasks change
  useEffect(() => {
    if (localSubtasks && localSubtasks.length > 0) {
      const total = localSubtasks.reduce((sum, subtask) => sum + (Number(subtask.amount) || 0), 0);
      setValue('amount', total);
    }
  }, [localSubtasks, setValue]);

  const handleConflictResponse = (
    conflictResponse: ConflictResponse<PrepaidConflictData | TaskAmountConflictData | ConcurrentModificationData>,
    originalPayload: UpdateTaskPayload
  ) => {
    const conflictData = conflictResponse.data;

    if ('conflict_type' in conflictData) {
      if (conflictData.conflict_type === 'prepaid_amount_change_conflict') {
        const prepaidConflictData = conflictData as PrepaidConflictData;
        openModal('prepaidConflict', {
          taskId: taskToEdit!.id,
          conflictData: prepaidConflictData,
          newPrepaidAmount: originalPayload.prepaid_amount || 0,
          onResolved: () => {
            toast.success(TOAST_MESSAGES.SUCCESS);
            closeModal();
          }
        });
      } else if (conflictData.conflict_type === 'main_receivable_overpayment') {
        const amountConflictData = conflictData as TaskAmountConflictData;
        openModal('taskAmountConflict', {
          taskId: taskToEdit!.id,
          conflictData: amountConflictData,
          newTaskAmount: originalPayload.amount || 0,
          onResolved: () => {
            toast.success(TOAST_MESSAGES.SUCCESS);
            closeModal();
          }
        });
      }
    } else if ('expected_updated_at' in conflictData) {
      const concurrentData = conflictData as ConcurrentModificationData;
      openModal('concurrentModification', {
        conflictData: concurrentData,
        onRetry: (useCurrentData: boolean) => {
          if (useCurrentData) {
            const currentTask = concurrentData.current_task_data;
            setValue('task_name', currentTask.task_name || '');
            setValue('amount', currentTask.amount);
            setValue('prepaid_amount', currentTask.prepaid_amount || 0);
            setValue('notes', currentTask.notes || '');

            const retryPayload = {
              ...originalPayload,
              expected_updated_at: concurrentData.current_updated_at
            };
            updateTaskWithConflictsMutation.mutate({ id: taskToEdit!.id, taskData: retryPayload });
          } else {
            const forcePayload = {
              ...originalPayload,
              expected_updated_at: concurrentData.current_updated_at
            };
            updateTaskWithConflictsMutation.mutate({ id: taskToEdit!.id, taskData: forcePayload });
          }
        },
        onCancel: () => { }
      });
    }
  };

  const handlePrepaidPayment = (createdTask: any) => {
    if (createdTask.prepaid_amount > 0 && createdTask.prepaid_invoice) {
      closeModal();
      openModal('recordPayment', {
        invoiceId: createdTask.prepaid_invoice.id,
        clientId: createdTask.client_id,
        clientName: createdTask.client?.name
      });
    } else {
      setShowSuccessModal(true);
    }
  };

  const calculateTotal = (subtasksList = localSubtasks) => {
    return subtasksList.reduce((sum, subtask) => sum + (Number(subtask.amount) || 0), 0);
  };

  const onSubmit = (data: TaskPayload) => {
    const validSubtasks = localSubtasks
      .filter(subtask => subtask.description && String(subtask.description).trim() !== '')
      .map(subtask => ({
        description: String(subtask.description).trim(),
        amount: Number(subtask.amount) || 0,
        is_completed: Boolean(subtask.is_completed)
      }));
    const finalAmount = validSubtasks.length > 0
      ? validSubtasks.reduce((sum, s) => sum + s.amount, 0)
      : Number(data.amount) || 0;

    if (isEditMode && taskToEdit) {
      const updatePayload: UpdateTaskPayload = {
        ...data,
        amount: finalAmount,
        expense_amount: data.expense_amount !== undefined ? Number(data.expense_amount) : undefined,
        end_date: data.end_date || undefined,
        prepaid_amount: data.prepaid_amount ? Number(data.prepaid_amount) : undefined,
        tags: data.tags || [],
        amount_details: [],
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

      const updatePayloadWithLocking = {
        ...updatePayload,
        expected_updated_at: taskToEdit.updated_at
      };

      updateTaskWithConflictsMutation.mutate({ id: taskToEdit.id, taskData: updatePayloadWithLocking }, {
        onSuccess: (result) => {
          if ('success' in result && result.success === false) {
            const conflictResponse = result as ConflictResponse<PrepaidConflictData | TaskAmountConflictData | ConcurrentModificationData>;
            handleConflictResponse(conflictResponse, updatePayload);
            return;
          }
          toast.success(TOAST_MESSAGES.TASK_UPDATED);
          closeModal();
        },
        onError: (error: any) => {
          toast.error(TOAST_MESSAGES.ERROR, error?.response?.data?.message || TOAST_MESSAGES.OPERATION_FAILED);
        }
      });
    } else {
      const createPayload: TaskPayload = {
        client_id: data.client_id,
        task_name: data.task_name,
        type: data.type,
        amount: finalAmount,
        expense_amount: data.expense_amount ? Number(data.expense_amount) : undefined,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        prepaid_amount: data.prepaid_amount ? Number(data.prepaid_amount) : undefined,
        notes: data.notes,
        tags: data.tags || [],
        amount_details: [],
        subtasks: validSubtasks,
        assigned_to_id: isAdmin() ? data.assigned_to_id : undefined,
      };

      createTaskMutation.mutate(createPayload, {
        onSuccess: (response: any) => {
          const createdTask = response?.data || response;
          const taskId = createdTask?.id;

          const validRequirements = localRequirements
            .filter(req => req.requirement_text && String(req.requirement_text).trim() !== '')
            .map(req => ({
              requirement_text: String(req.requirement_text || '').trim(),
              is_provided: Boolean(req.is_provided || false)
            }));

          if (validRequirements.length > 0 && taskId) {
            createRequirementsMutation.mutate(
              { task_id: taskId, requirements: validRequirements },
              {
                onSuccess: () => {
                  toast.success(TOAST_MESSAGES.TASK_CREATED);
                  handlePrepaidPayment(createdTask);
                },
                onError: (error: any) => {
                  toast.success(TOAST_MESSAGES.TASK_CREATED, 'تم إنشاء المهمة ولكن حدث خطأ في إيقاف المتطلبات');
                  handlePrepaidPayment(createdTask);
                }
              }
            );
          } else {
            toast.success(TOAST_MESSAGES.TASK_CREATED);
            handlePrepaidPayment(createdTask);
          }
        },
        onError: (error: any) => {
          toast.error(TOAST_MESSAGES.ERROR, error?.response?.data?.message || TOAST_MESSAGES.OPERATION_FAILED);
        }
      });
    }
  };

  const addSubtask = () => {
    const updated = [...localSubtasks, { description: '', amount: 0, is_completed: false }];
    setLocalSubtasks(updated);
    setValue('amount', calculateTotal(updated));
  };

  const removeSubtask = (index: number) => {
    const updated = localSubtasks.filter((_, i) => i !== index);
    setLocalSubtasks(updated);
    setValue('amount', calculateTotal(updated));
  };

  const handleSubtaskChange = (index: number, field: string, value: any) => {
    const updatedSubtasks = [...localSubtasks];
    if (field === 'amount') {
      const rawVal = value && typeof value === 'object' && 'target' in value ? value.target.value : value;
      updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: Number(rawVal) || 0 };
    } else {
      updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: value };
    }
    setLocalSubtasks(updatedSubtasks);
    setValue('amount', calculateTotal(updatedSubtasks));
  };

  const addRequirementField = () => {
    setLocalRequirements([
      ...localRequirements,
      { temp_id: uuidv4(), requirement_text: '', is_provided: false }
    ]);
  };

  const updateRequirementText = (identifier: string | number, text: string) => {
    setLocalRequirements(localRequirements.map(req => {
      const match = req.temp_id ? req.temp_id === identifier : req.id === identifier;
      return match ? { ...req, requirement_text: text } : req;
    }));
  };

  const toggleRequirementProvided = (identifier: string | number) => {
    setLocalRequirements(localRequirements.map(req => {
      const match = req.temp_id ? req.temp_id === identifier : req.id === identifier;
      return match ? { ...req, is_provided: !req.is_provided } : req;
    }));
  };

  const removeRequirementField = (identifier: string | number) => {
    setLocalRequirements(localRequirements.filter(req => {
      return req.temp_id ? req.temp_id !== identifier : req.id !== identifier;
    }));
  };

  const taskTypes: { type: TaskType; label: string; activeClasses: string; inactiveClasses: string }[] = [
    {
      type: 'Government',
      label: 'حكومية',
      activeClasses: 'border-status-info-border bg-status-info-bg text-status-info-text shadow-sm',
      inactiveClasses: 'border-border-default hover:border-status-info-border hover:bg-status-info-bg/30 text-text-secondary',
    },
    {
      type: 'Accounting',
      label: 'محاسبية',
      activeClasses: 'border-status-success-border bg-status-success-bg text-status-success-text shadow-sm',
      inactiveClasses: 'border-border-default hover:border-status-success-border hover:bg-status-success-bg/30 text-text-secondary',
    },
    {
      type: 'RealEstate',
      label: 'عقارية',
      activeClasses: 'border-status-warning-border bg-status-warning-bg text-status-warning-text shadow-sm',
      inactiveClasses: 'border-border-default hover:border-status-warning-border hover:bg-status-warning-bg/30 text-text-secondary',
    },
    {
      type: 'Other',
      label: 'أخرى',
      activeClasses: 'border-status-danger-border bg-status-danger-bg text-status-danger-text shadow-sm',
      inactiveClasses: 'border-border-default hover:border-status-danger-border hover:bg-status-danger-bg/30 text-text-secondary',
    },
  ];

  const currentClientDisplay = searchedClient || client || taskToEdit?.client;
  const isClientReady = Boolean(selectedClientId || currentClientDisplay?.id);
  const showPrepaidField = isEditMode && Boolean(taskToEdit?.prepaid_amount && Number(taskToEdit.prepaid_amount) > 0);

  return (
    <>
      <BaseModal
        isOpen={true}
        onClose={closeModal}
        title={isEditMode ? t('tasks.editTask') : 'اختر نوع المهمة'}
        titleClassName="text-center w-full ms-6"
      >
        <div className="max-h-[75vh] overflow-y-auto px-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Phase 1: 4 Boxes in 1 Row to Choose Task Type */}
            <div>
              <div className="grid grid-cols-4 gap-2">
                {taskTypes.map((item) => {
                  const isSelected = selectedType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setValue('type', item.type)}
                      className={`py-3 px-2 rounded-xl border-2 text-center transition-all cursor-pointer flex items-center justify-center ${
                        isSelected ? item.activeClasses : item.inactiveClasses
                      }`}
                    >
                      <span className="block text-sm font-bold">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.type && <div className="text-destructive text-xs text-center mt-1">يرجى اختيار نوع المهمة</div>}
            </div>

            {/* Phase 2: Conditionally Rendered Client Selection Field */}
            {selectedType && (
              <div className="space-y-2 pt-2 border-t border-border-default animate-in fade-in-50 duration-200">
                <label className="block text-sm font-bold text-text-primary mb-1">اختر العميل</label>

                {currentClientDisplay ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <UserCheck size={18} className="text-primary" />
                      <span className="text-sm font-bold text-text-primary">{currentClientDisplay.name}</span>
                      {currentClientDisplay.phone && (
                        <span className="text-xs text-text-secondary">({currentClientDisplay.phone})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditMode && (
                        <button
                          type="button"
                          className="text-xs font-bold text-primary hover:underline ms-2"
                          onClick={() => {
                            setSearchedClient(undefined);
                            setValue('client_id', 0);
                          }}
                        >
                          تغيير العميل
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <ClientSearchCombobox
                    value={selectedClientId ? String(selectedClientId) : ''}
                    onChange={(val) => {
                      setValue('client_id', Number(val));
                    }}
                    placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                  />
                )}
                {errors.client_id && <div className="text-destructive text-xs mt-1">اختيار العميل مطلوب</div>}
              </div>
            )}

            {/* Phase 3: Conditionally Rendered Task Form Fields */}
            {selectedType && isClientReady && (
              <div className="space-y-4 pt-3 border-t border-border-default animate-in fade-in-50 duration-200">
                {/* Row 1: Task Name & Employee Assignment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="font-semibold text-text-primary text-sm block mb-1">
                      المهمة الرئيسية <span className="text-destructive">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.task_name ? 'border-destructive bg-destructive/5' : 'border-border'}`}
                      {...register('task_name', { required: true })}
                      placeholder="أدخل اسم المهمة..."
                    />
                    {errors.task_name && <div className="text-destructive text-xs mt-1">اسم المهمة مطلوب</div>}
                  </div>

                  {isAdmin() && (
                    <div>
                      <label className="font-semibold text-text-primary text-sm block mb-1">تكليف الموظف</label>
                      <Controller
                        name="assigned_to_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value == null ? SELECT_NONE_ASSIGNEE : String(field.value)}
                            onValueChange={(v) =>
                              field.onChange(v === SELECT_NONE_ASSIGNEE ? null : Number(v))
                            }
                          >
                            <SelectTrigger className="h-9 w-full border-border bg-background px-3 text-text-primary focus:ring-2 focus:ring-ring">
                              <SelectValue placeholder="غير مكلف" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[400] max-h-64">
                              <SelectItem value={SELECT_NONE_ASSIGNEE} className="text-text-primary">
                                غير مكلف
                              </SelectItem>
                              {employees.map((employee) => (
                                <SelectItem
                                  key={employee.user_id}
                                  value={String(employee.user_id)}
                                  className="text-text-primary"
                                >
                                  {employee.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Row 2: Amounts & Start Date IN ONE ROW */}
                <div className={`grid grid-cols-1 ${showPrepaidField ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
                  <div>
                    <label className="font-semibold text-text-primary text-sm block mb-1">المبلغ الإجمالي</label>
                    <Controller
                      name="amount"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={localSubtasks.length > 0}
                          className="w-full text-sm"
                        />
                      )}
                    />
                    {localSubtasks.length > 0 && (
                      <span className="text-[10px] text-text-secondary block mt-0.5">محسوب من المهام الفرعية</span>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-text-primary text-sm block mb-1">تكلفة المهمة</label>
                    <Controller
                      name="expense_amount"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || 0}
                          onChange={field.onChange}
                          className="w-full text-sm"
                        />
                      )}
                    />
                  </div>

                  {showPrepaidField && (
                    <div>
                      <label className="font-semibold text-text-primary text-sm block mb-1">الدفعة المقدمة</label>
                      <Controller
                        name="prepaid_amount"
                        control={control}
                        render={({ field }) => (
                          <NumberInput
                            value={field.value || 0}
                            onChange={field.onChange}
                            className="w-full text-sm"
                          />
                        )}
                      />
                    </div>
                  )}

                  <div>
                    <label className="font-semibold text-text-primary text-sm block mb-1">تاريخ البدء</label>
                    <Controller
                      name="start_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput
                          name="start_date"
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full text-sm"
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Net Earning Preview Badge */}
                <div className={`w-full px-3 py-2 rounded-lg border ${
                  (Number(watchAmount) || 0) - (Number(watchExpenseAmount) || 0) >= 0
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-text-secondary">صافي الربح المتوقع</span>
                    <span className={`text-sm font-bold ${
                      (Number(watchAmount) || 0) - (Number(watchExpenseAmount) || 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {((Number(watchAmount) || 0) - (Number(watchExpenseAmount) || 0)).toFixed(2)} ر.س
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="font-semibold text-text-primary text-sm block mb-1 text-center">الملاحظات</label>
                  <textarea
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px]"
                    {...register('notes')}
                    placeholder="ملاحظات تفصيلية..."
                  />
                </div>

                {/* Requirements Accordion - Only shown if editing and has prefilled requirements */}
                {isEditMode && localRequirements.length > 0 && (
                  <Accordion type="single" collapsible className="w-full border border-border rounded-md px-3">
                    <AccordionItem value="requirements" className="border-b-0">
                      <AccordionTrigger className="text-sm font-semibold text-text-primary hover:no-underline py-2">
                        <span>المتطلبات ({localRequirements.length})</span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-text-secondary">قائمة المستندات أو الإجراءات المطلوبة</span>
                            <Button
                              type="button"
                              variant="outline-primary"
                              size="sm"
                              onClick={addRequirementField}
                              className="text-xs py-0.5 h-6"
                            >
                              <PlusCircle size={13} className="me-1" /> إضافة متطلب
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {localRequirements.map((req, index) => {
                              const reqId = req.temp_id || req.id || String(index);
                              return (
                                <div key={reqId} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="rounded"
                                    checked={req.is_provided}
                                    onChange={() => toggleRequirementProvided(reqId)}
                                  />
                                  <input
                                    type="text"
                                    className="flex-1 px-3 py-1 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={req.requirement_text}
                                    onChange={(e) => updateRequirementText(reqId, e.target.value)}
                                    placeholder={`متطلب ${index + 1}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => removeRequirementField(reqId)}
                                    className="h-7 w-7 p-0 flex items-center justify-center"
                                  >
                                    <XCircle size={14} />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Subtasks Section - AT THE VERY BOTTOM */}
                <div className="subtasks-section border border-border-default rounded-xl p-3 bg-muted/20">
                  <div className="flex justify-between items-center mb-3">
                    <label className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
                      <Layers size={16} className="text-primary" />
                      المهام الفرعية
                    </label>
                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      onClick={addSubtask}
                      className="text-xs py-1 h-7"
                    >
                      <Plus size={14} className="me-1" /> إضافة مهمة فرعية
                    </Button>
                  </div>

                  {localSubtasks.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-2">لا توجد مهام فرعية</p>
                  ) : (
                    <div className="space-y-2">
                      {localSubtasks.map((subtask, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={subtask.description}
                            onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                            placeholder={`المهمة الفرعية ${index + 1}`}
                          />
                          <div className="w-32">
                            <NumberInput
                              value={subtask.amount}
                              onChange={(val) => handleSubtaskChange(index, 'amount', val)}
                              placeholder="المبلغ"
                              className="text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => removeSubtask(index)}
                            className="h-8 w-8 p-0 flex items-center justify-center"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end items-center gap-2 pt-4 border-t border-border-default">
              <Button type="button" variant="outline-primary" onClick={closeModal} disabled={isLoading}>
                إلغاء
              </Button>
              {selectedType && isClientReady && (
                <Button type="submit" variant="primary" isLoading={isLoading}>
                  {isEditMode ? 'حفظ التعديلات' : 'إضافة المهمة'}
                </Button>
              )}
            </div>
          </form>
        </div>
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
          navigate(isAdmin() ? '/tasks' : '/employee/tasks');
        }}
        onAddNewTask={() => {
          setShowSuccessModal(false);
          setValue('type', '' as any);
          setValue('client_id', 0);
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
