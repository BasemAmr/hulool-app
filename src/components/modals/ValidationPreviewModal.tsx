import React from 'react';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, ArrowRight, Info, CheckCircle } from 'lucide-react';
import type {
  TaskValidationResult,
  InvoiceValidationResult,
  TransactionValidationResult
} from '../../api/types';
import { formatCurrency } from '../../utils/formatUtils';

interface ValidationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResult: TaskValidationResult | InvoiceValidationResult | TransactionValidationResult;
  entityType: 'task' | 'invoice' | 'transaction';
  entityName: string;
  actionType: 'edit' | 'delete';
  isPending?: boolean;
}

const AR_LABELS: Record<string, string> = {
  // Modal titles
  edit_transaction: 'تعديل المعاملة',
  delete_transaction: 'حذف المعاملة',
  edit_invoice: 'تعديل الفاتورة',
  delete_invoice: 'حذف الفاتورة',
  edit_task: 'تعديل المهمة',
  delete_task: 'حذف المهمة',

  // Section headers
  warnings: 'تحذيرات',
  errors: 'أخطاء (العملية محظورة)',
  consequences: 'التأثيرات المتوقعة',
  summary: 'ملخص التغييرات',

  // Field labels
  old_amount: 'المبلغ الحالي',
  new_amount: 'المبلغ الجديد',
  current_balance: 'الرصيد الحالي',
  new_balance: 'الرصيد الجديد',
  account: 'الحساب',
  invoice_status: 'حالة الفاتورة',
  paid_amount: 'المبلغ المدفوع',
  remaining_amount: 'المبلغ المتبقي',

  // Step 6: Additional Arabic labels
  transaction_type: 'نوع المعاملة',
  invoice_name: 'اسم الفاتورة',
  total_amount: 'المبلغ الكلي',
  will_change_to: 'سيتغير إلى',
  affected_accounts: 'الحسابات المتأثرة',
  balance_change: 'تغيير الرصيد',
  current_status: 'الحالة الحالية',
  new_status: 'الحالة الجديدة',

  // Status values
  paid: 'مدفوع',
  partially_paid: 'مدفوع جزئياً',
  pending: 'قيد الانتظار',
  overdue: 'متأخر',
  draft: 'مسودة',
  cancelled: 'ملغي',

  // Actions
  confirm_changes: 'تأكيد التغييرات',
  confirm_deletion: 'تأكيد الحذف',
  cancel: 'إلغاء',
  back: 'رجوع'
};

const ValidationPreviewModal: React.FC<ValidationPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  validationResult,
  entityType,
  entityName,
  actionType,
  isPending = false
}) => {
  const { warnings, errors, consequences } = validationResult;
  const hasErrors = errors.length > 0;

  const titleKey = `${actionType}_${entityType}`;
  const title = AR_LABELS[titleKey] ? `${AR_LABELS[titleKey]} ${entityName}` : `${AR_LABELS[actionType === 'edit' ? 'confirm_changes' : 'confirm_deletion']} ${entityName}`;

  // Cast consequences to any to access dynamic fields easily
  const cons = consequences as any;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="space-y-6 dir-rtl" dir="rtl">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-yellow-500 mt-1">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-900 mb-2">{AR_LABELS.warnings}</h3>
                <ul className="list-disc list-inside space-y-1 text-base text-yellow-800">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {hasErrors && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-red-500 mt-1">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-2">{AR_LABELS.errors}</h3>
                <ul className="list-disc list-inside space-y-1 text-base text-red-800">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Informational Messages */}
        {cons.messages && cons.messages.length > 0 && (
          <div className="space-y-2">
            {cons.messages.map((m: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border-2 ${m.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                {m.type === 'warning' ? <AlertTriangle size={20} /> : <Info size={20} />}
                <p className="text-base font-medium">{m.text_ar || m.text_en}</p>
              </div>
            ))}
          </div>
        )}

        {/* Transaction Summary */}
        {cons.transaction_summary && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
              <TrendingUp size={24} />
              {AR_LABELS.summary}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-blue-700">{AR_LABELS.old_amount}</span>
                <div className="text-xl font-bold text-blue-900">
                  {formatCurrency(cons.transaction_summary.old_debit || cons.transaction_summary.old_credit)}
                </div>
              </div>
              <div>
                <span className="text-sm text-blue-700">{AR_LABELS.new_amount}</span>
                <div className="text-xl font-bold text-blue-900">
                  {formatCurrency(cons.transaction_summary.new_debit || cons.transaction_summary.new_credit)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Summary */}
        {cons.invoice_summary && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
              <Info size={24} />
              {AR_LABELS.summary}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-purple-700">{AR_LABELS.old_amount}</span>
                <div className="text-xl font-bold text-purple-900">
                  {formatCurrency(cons.invoice_summary.old_amount)}
                </div>
              </div>
              <div>
                <span className="text-sm text-purple-700">{AR_LABELS.new_amount}</span>
                <div className="text-xl font-bold text-purple-900">
                  {formatCurrency(cons.invoice_summary.new_amount)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Impact */}
        {cons.invoice_impact && (
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <h3 className="text-lg font-bold text-purple-900 mb-3">
              تأثير على الفاتورة #{cons.invoice_impact.invoice_id}
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base text-purple-800">الوصف:</span>
                <span className="font-bold text-purple-900">{cons.invoice_impact.invoice_description}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded border border-purple-200">
                <div>
                  <div className="text-sm text-purple-700">المبلغ الكلي</div>
                  <div className="text-lg font-bold text-purple-900">{formatCurrency(cons.invoice_impact.current_amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-purple-700">المدفوع</div>
                  <div className="text-lg font-bold text-green-600 dir-ltr text-right">
                    {formatCurrency(cons.invoice_impact.current_paid)} → {formatCurrency(cons.invoice_impact.new_paid)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-purple-700">المتبقي</div>
                  <div className="text-lg font-bold text-red-600 dir-ltr text-right">
                    {formatCurrency(cons.invoice_impact.current_remaining)} → {formatCurrency(cons.invoice_impact.new_remaining)}
                  </div>
                </div>
              </div>

              {cons.invoice_impact.status_will_change && (
                <div className="bg-yellow-100 border border-yellow-300 p-3 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-800 font-bold">⚠️ تغيير الحالة:</span>
                    <span className="text-base">
                      {AR_LABELS[cons.invoice_impact.current_status] || cons.invoice_impact.current_status} → {AR_LABELS[cons.invoice_impact.new_status] || cons.invoice_impact.new_status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Changes Table */}
        {(cons.transaction_changes?.length > 0 || cons.transactions_affected?.length > 0) && (
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              تغييرات المعاملات
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold">المعاملة</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold">المبلغ القديم</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold">المبلغ الجديد</th>
                  </tr>
                </thead>
                <tbody>
                  {(cons.transaction_changes || cons.transactions_affected || []).map((change: any, i: number) => (
                    <tr key={i}>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <div className="font-bold">#{change.transaction_id || change.id}</div>
                        <div className="text-xs text-gray-500">{change.account_name}</div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {formatCurrency(change.old_debit || change.old_amount || 0)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-bold">
                        {formatCurrency(change.new_debit || change.new_amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Commissions Impact */}
        {cons.commissions_affected && cons.commissions_affected.length > 0 && (
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle size={24} />
              تأثير العمولات
            </h3>
            <div className="space-y-4">
              {cons.commissions_affected.map((comm: any, i: number) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-gray-900">{comm.employee_name}</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold">
                      نسبة العمولة: {comm.commission_rate}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 block mb-1">صافي الربح الحالي</span>
                      <span className="text-gray-900 font-bold">{formatCurrency(comm.old_net_earning)}</span>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <span className="text-green-700 block mb-1">صافي الربح الجديد</span>
                      <span className="text-green-900 font-bold">{formatCurrency(comm.new_net_earning)}</span>
                    </div>
                  </div>

                  {comm.updates && comm.updates.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded border border-gray-200">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 text-right border-b font-bold">البند المتأثر</th>
                            <th className="px-3 py-2 text-right border-b font-bold">المبلغ الحالي</th>
                            <th className="px-3 py-2 text-right border-b font-bold">المبلغ الجديد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {comm.updates.map((upd: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${upd.type === 'pending_item' ? 'bg-yellow-400' : 'bg-blue-400'}`}></span>
                                <span>{upd.type === 'pending_item' ? 'عمولة معلقة' : 'عمولة نهائية'} #{upd.id}</span>
                              </td>
                              <td className="px-3 py-2 text-gray-500">{formatCurrency(upd.old_amount)}</td>
                              <td className="px-3 py-2 font-bold text-green-600 font-bold">{formatCurrency(upd.new_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-base font-bold text-green-800">
                    <span>إجمالي تغيير العمولة:</span>
                    <span dir="ltr">
                      {comm.commission_difference > 0 ? '+' : ''}
                      {formatCurrency(comm.commission_difference)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance Recalculations */}
        {cons.balance_recalculations && cons.balance_recalculations.length > 0 && (
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              إعادة حساب الأرصدة
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-right text-base font-bold">الحساب</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-base font-bold">الرصيد الحالي</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-base font-bold">الرصيد المتوقع</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-base font-bold">التغيير</th>
                  </tr>
                </thead>
                <tbody>
                  {cons.balance_recalculations.map((recalc: any, i: number) => {
                    const change = recalc.estimated_change || (recalc.estimated_new_balance - recalc.current_balance) || 0;
                    return (
                      <tr key={i} className="hover:bg-gray-100">
                        <td className="border border-gray-300 px-3 py-2 text-base font-medium text-gray-900">
                          {recalc.account_name || `${recalc.account_type} #${recalc.account_id}`}
                          <div className="text-xs text-gray-500 font-normal">{recalc.reason}</div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-base text-gray-900">
                          {formatCurrency(recalc.current_balance || 0)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-base font-bold text-gray-900">
                          {formatCurrency(recalc.estimated_new_balance || (recalc.current_balance + change) || 0)}
                        </td>
                        <td className={`border border-gray-300 px-3 py-2 text-center text-base font-bold ltr ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                          <span dir="ltr">{change > 0 ? '+' : ''}{formatCurrency(change)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-8 border-t pt-4">
          <Button variant="secondary" onClick={onClose}>
            {AR_LABELS.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={hasErrors || isPending}
            isLoading={isPending}
          >
            {actionType === 'delete' ? AR_LABELS.confirm_deletion : AR_LABELS.confirm_changes}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ValidationPreviewModal;
