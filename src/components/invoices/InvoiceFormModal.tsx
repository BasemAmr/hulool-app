/**
 * InvoiceFormModal Component
 * 
 * Modal for creating new invoices (replaces ManualReceivableModal).
 * Uses the new Invoice API endpoints.
 */

import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import ClientSearchCompact from '../shared/ClientSearchCompact';
import { useCreateInvoice } from '../../queries/invoiceQueries';
import { useModalStore } from '../../stores/modalStore';
import type { Client, CreateInvoicePayload, TaskType, InvoiceLineItem } from '../../api/types';
import { useToast } from '../../hooks/useToast';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const InvoiceFormModal = () => {
  const { t } = useTranslation();
  const props = useModalStore((state) => state.props);
  const closeModal = useModalStore((state) => state.closeModal);
  const preselectedClient = props.client;

  const [step, setStep] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(preselectedClient || null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<CreateInvoicePayload>({
    defaultValues: {
      client_id: preselectedClient?.id,
      type: 'Other',
      line_items: []
    }
  });

  const createMutation = useCreateInvoice();
  const taskTypes: TaskType[] = ['Government', 'RealEstate', 'Accounting', 'Other'];

  // Calculate total from line items or use manual amount
  const manualAmount = watch('amount') || 0;
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalAmount = lineItems.length > 0 ? lineItemsTotal : manualAmount;

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate amount when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].amount = updated[index].quantity * updated[index].unit_price;
    }

    setLineItems(updated);
  };

  const { success, error } = useToast();

  const onSubmit = (data: CreateInvoicePayload) => {
    const payload: CreateInvoicePayload = {
      ...data,
      amount: totalAmount,
      line_items: lineItems.length > 0 ? lineItems : undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        success('تم الإنشاء', 'تم إنشاء الفاتورة بنجاح');
        closeModal();
      },
      onError: (err: any) => {
        console.error('Create invoice error:', err);
        error('فشل الإنشاء', err.message || 'فشل إنشاء الفاتورة');
      }
    });
  };

  const getTypeIcon = (type: TaskType) => {
    const icons: Record<TaskType, string> = {
      'Government': '🏛️',
      'RealEstate': '🏠',
      'Accounting': '📊',
      'Other': '📋'
    };
    return icons[type] || '📋';
  };

  return (
    <BaseModal isOpen={true} onClose={closeModal} title="إنشاء فاتورة جديدة">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Type Selection */}
        {step === 0 && (
          <div className="task-type-step">
            <div className="text-center mb-4">
              <h5 className="mb-2">اختر نوع الفاتورة</h5>
              <p className="text-muted small">حدد نوع الخدمة المقدمة</p>
            </div>
            <div className="type-selection-grid">
              <Controller
                name="type"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <>
                    {taskTypes.map((type) => (
                      <div
                        key={type}
                        className={`type-card ${field.value === type ? 'selected' : ''}`}
                        onClick={() => {
                          field.onChange(type);
                          setStep(1);
                        }}
                      >
                        <div className="type-icon text-3xl mb-2">
                          {getTypeIcon(type)}
                        </div>
                        <div className="type-label">{t(`receivables.type.${type}`)}</div>
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
            {errors.type && <div className="text-center text-danger small mt-2">{t('common.required')}</div>}
            <div className="modal-footer-compact">
              <div className="footer-content">
                <div />
                <div className="footer-right">
                  <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Client Selection */}
        {step === 1 && (
          <div className="client-selection-step">
            <div className="selected-type-display mb-4">
              <div className="d-flex align-items-center justify-content-center">
                <span className="badge bg-primary me-2">✓</span>
                <span className="text-muted small">النوع:</span>
                <span className="fw-bold ms-2">{watch('type') ? t(`receivables.type.${watch('type')}`) : ''}</span>
              </div>
            </div>

            {preselectedClient ? (
              <div className="text-center">
                <h5 className="mb-3">العميل المختار</h5>
                <div className="client-card selected mx-auto" style={{ maxWidth: '300px' }}>
                  <div className="client-info">
                    <div className="client-name">{preselectedClient.name}</div>
                    <div className="client-phone">{preselectedClient.phone}</div>
                  </div>
                  <div className="selected-indicator">
                    <span className="text-green-500 text-xl">✓</span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setSelectedClient(preselectedClient);
                    setValue('client_id', preselectedClient.id);
                    setStep(2);
                  }}
                >
                  {t('common.continue')}
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h5 className="mb-2">اختر العميل</h5>
                  <p className="text-muted small">ابحث عن العميل المراد إصدار الفاتورة له</p>
                </div>
                <div className="client-search-container">
                  <ClientSearchCompact
                    label=""
                    onSelect={(client) => {
                      setSelectedClient(client);
                      setValue('client_id', client.id);
                      setStep(2);
                    }}
                    disabled={false}
                  />
                </div>
              </>
            )}

            <Controller
              name="client_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />
            {errors.client_id && <div className="text-center text-danger small mt-2">{t('common.required')}</div>}

            <div className="modal-footer-compact">
              <div className="footer-content">
                <div className="footer-left">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setStep(0)}>
                    ← رجوع
                  </Button>
                </div>
                <div className="footer-right">
                  <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Invoice Details */}
        {step === 2 && (
          <div>
            {/* Summary Header */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">النوع</label>
                  <Controller
                    name="type"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={`form-select mt-1 ${errors.type ? 'is-invalid' : ''}`}
                      >
                        {taskTypes.map((type) => (
                          <option key={type} value={type}>{t(`receivables.type.${type}`)}</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">العميل</label>
                  <div className="mt-1">
                    <strong>{selectedClient?.name}</strong>
                    <small className="d-block text-muted">{selectedClient?.phone}</small>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none"
                      onClick={() => setStep(1)}
                    >
                      تغيير العميل
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <Input
              label="وصف الفاتورة"
              {...register('description', { required: true })}
              error={errors.description && t('common.required')}
              placeholder="أدخل وصف الفاتورة"
            />

            {/* Line Items Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium">بنود الفاتورة</label>
                <Button
                  type="button"
                  variant="outline-primary"
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus size={14} className="ml-1" /> إضافة بند
                </Button>
              </div>

              {lineItems.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 p-2 bg-gray-100 text-sm font-medium">
                    <div className="col-span-5">الوصف</div>
                    <div className="col-span-2 text-center">الكمية</div>
                    <div className="col-span-2 text-center">السعر</div>
                    <div className="col-span-2 text-center">الإجمالي</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-2 border-t items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="وصف البند"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          className="form-control form-control-sm text-center"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          className="form-control form-control-sm text-center"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="col-span-2 text-center font-medium">
                        {item.amount.toFixed(2)}
                      </div>
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          className="p-1"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 gap-2 p-2 bg-gray-50 border-t font-bold">
                    <div className="col-span-9 text-left">المجموع:</div>
                    <div className="col-span-2 text-center text-primary">
                      {lineItemsTotal.toFixed(2)} ر.س
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 border rounded-lg bg-gray-50">
                  <p className="text-muted mb-2">لم تتم إضافة بنود بعد</p>
                  <p className="text-sm text-gray-400">أضف بنود أو أدخل المبلغ الإجمالي مباشرة</p>
                </div>
              )}
            </div>

            {/* Manual Amount (only if no line items) */}
            {lineItems.length === 0 && (
              <Input
                label="المبلغ الإجمالي"
                type="number"
                step="0.01"
                {...register('amount', {
                  required: lineItems.length === 0,
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من صفر' }
                })}
                error={errors.amount?.message}
              />
            )}

            {/* Notes */}
            <div className="mb-3">
              <label className="form-label">ملاحظات</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="أي ملاحظات إضافية على الفاتورة"
                {...register('notes')}
              />
            </div>

            {/* Due Date */}
            <Input
              label="تاريخ الاستحقاق"
              type="date"
              {...register('due_date', { required: true })}
              error={errors.due_date && t('common.required')}
            />

            {/* Total Display */}
            <div className="bg-primary/10 p-4 rounded-lg mb-4 text-center">
              <div className="text-sm text-gray-600 mb-1">إجمالي الفاتورة</div>
              <div className="text-2xl font-bold text-primary">
                {totalAmount.toFixed(2)} ر.س
              </div>
            </div>

            <div className="modal-footer-compact">
              <div className="footer-content">
                <div className="footer-left">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setStep(1)}
                    disabled={createMutation.isPending}
                  >
                    ← رجوع
                  </Button>
                </div>
                <div className="footer-right">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={closeModal}
                    disabled={createMutation.isPending}
                    className="me-2"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'جاري الحفظ...' : 'إنشاء الفاتورة'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .task-type-step {
            padding: 1rem 0;
          }
          .type-selection-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .type-card {
            padding: 1.5rem 1rem;
            border: 2px solid #e9ecef;
            border-radius: 0.5rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: white;
          }
          .type-card:hover {
            border-color: var(--color-primary);
            box-shadow: 0 2px 8px rgba(0,123,255,0.15);
            transform: translateY(-2px);
          }
          .type-card.selected {
            border-color: var(--color-primary);
            background-color: var(--color-primary-light, #e7f3ff);
          }
          .type-label {
            font-weight: 500;
            font-size: 0.9rem;
          }
          @media (max-width: 576px) {
            .type-selection-grid {
              grid-template-columns: 1fr;
            }
          }
          .client-selection-step {
            padding: 1rem 0;
          }
          .selected-type-display {
            padding: 0.75rem;
            background-color: #f8f9fa;
            border-radius: 0.375rem;
            border: 1px solid #e9ecef;
          }
          .client-card {
            padding: 1rem;
            border: 2px solid #e9ecef;
            border-radius: 0.5rem;
            background: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .client-card.selected {
            border-color: #28a745;
            background-color: #f8fff9;
          }
          .client-info {
            flex: 1;
          }
          .client-name {
            font-weight: 600;
            font-size: 1rem;
            color: #495057;
          }
          .client-phone {
            font-size: 0.875rem;
            color: #6c757d;
            margin-top: 0.25rem;
          }
          .client-search-container {
            padding: 0 1rem;
          }
          .modal-footer-compact {
            border-top: 1px solid #e9ecef;
            padding: 0.75rem 1rem;
            background-color: #f8f9fa;
            border-radius: 0 0 0.375rem 0.375rem;
          }
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer-left,
          .footer-right {
            display: flex;
            align-items: center;
          }
        `}</style>
      </form>
    </BaseModal>
  );
};

export default InvoiceFormModal;
