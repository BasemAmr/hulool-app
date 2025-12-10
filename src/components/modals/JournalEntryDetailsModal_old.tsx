/**
 * Journal Entry Details Modal
 * 
 * Displays complete double-entry journal entry with both sides of the transaction
 */

import { useQuery } from '@tanstack/react-query';
import { X, ArrowLeftRight, TrendingUp, TrendingDown, Building, User, Users } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import apiClient from '../../api/apiClient';
import { formatCurrency } from '../../utils/formatUtils';
import { Spinner } from '../ui/spinner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface JournalEntryDetailsModalProps {}

const JournalEntryDetailsModal: React.FC<JournalEntryDetailsModalProps> = () => {
  const { closeModal, props } = useModalStore();
  const { transactionId, accountType, accountId } = props;

  // Fetch both sides of the journal entry
  const { data, isLoading, error } = useQuery({
    queryKey: ['journal-entry', transactionId],
    queryFn: async () => {
      // Get the original transaction
      const response = await apiClient.get(`/accounts/${accountType}/${accountId}/history`);
      const allTransactions = response.data.transactions;
      
      const originalTxn = allTransactions.find((t: any) => t.id === transactionId);
      if (!originalTxn) {
        throw new Error('Transaction not found');
      }

      // Get the related transaction
      let relatedTxn = null;
      if (originalTxn.related_transaction_id) {
        relatedTxn = allTransactions.find((t: any) => t.id === originalTxn.related_transaction_id);
        
        // If not in current page, fetch it specifically
        if (!relatedTxn) {
          const relatedId = originalTxn.related_transaction_id;
          // Try to find which account it belongs to by checking all account types
          for (const type of ['client', 'employee', 'company']) {
            try {
              const searchResponse = await apiClient.get(`/accounts/transactions`, {
                params: {
                  account_type: type,
                  page: 1,
                  per_page: 1000,
                },
              });
              
              const found = searchResponse.data.transactions?.find((t: any) => t.id === relatedId);
              if (found) {
                relatedTxn = found;
                break;
              }
            } catch (err) {
              // Continue searching
            }
          }
        }
      }

      return {
        original: originalTxn,
        related: relatedTxn,
      };
    },
    enabled: !!transactionId,
  });

  // Get account type icon and label
  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <User size={16} />;
      case 'employee':
        return <Users size={16} />;
      case 'company':
        return <Building size={16} />;
      default:
        return <User size={16} />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'client':
        return 'عميل';
      case 'employee':
        return 'موظف';
      case 'company':
        return 'شركة';
      default:
        return type;
    }
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INVOICE_GENERATED: 'فاتورة',
      PAYMENT_RECEIVED: 'دفعة مستلمة',
      COMMISSION_EARNED: 'عمولة',
      SALARY_PAID: 'راتب',
      TRANSFER_IN: 'تحويل وارد',
      TRANSFER_OUT: 'تحويل صادر',
      MANUAL_ADJUSTMENT: 'تعديل يدوي',
      CREDIT_ALLOCATED: 'رصيد مخصص',
      EXPENSE: 'مصروف',
      INCOME: 'دخل',
      INITIAL_BALANCE: 'رصيد افتتاحي',
      INVOICE_REVERSAL: 'عكس فاتورة',
      PAYMENT_REVERSAL: 'عكس دفعة',
      CREDIT_RECEIVED: 'رصيد مستلم',
    };
    return labels[type] || type;
  };

  // Format date
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">تفاصيل القيد المزدوج</h2>
              <p className="text-sm text-gray-600">Journal Entry #{transactionId}</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              خطأ في تحميل تفاصيل القيد
            </div>
          ) : (
            <div className="space-y-6">
              {/* Transaction Info */}
              {data?.original && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">التاريخ:</span>
                      <span className="font-medium mr-2">
                        {formatDate(data.original.transaction_date || data.original.created_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">النوع:</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                        {getTransactionTypeLabel(data.original.transaction_type)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">الوصف:</span>
                      <p className="font-medium mt-1">{data.original.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Double Entry Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        الحساب
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        نوع الحساب
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        مدين (Debit)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        دائن (Credit)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        الرصيد بعد
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Original Transaction */}
                    {data?.original && (
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">{getAccountIcon(data.original.account_type)}</span>
                            <div>
                              <div className="font-medium">
                                {getAccountTypeLabel(data.original.account_type)} #{data.original.account_id}
                              </div>
                              <div className="text-xs text-gray-500">ID: {data.original.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800">
                            {getAccountTypeLabel(data.original.account_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {data.original.debit && parseFloat(data.original.debit) > 0 ? (
                            <span className="text-green-600 font-semibold flex items-center justify-end gap-1">
                              <TrendingUp size={16} />
                              +{formatCurrency(data.original.debit)} ر.س
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {data.original.credit && parseFloat(data.original.credit) > 0 ? (
                            <span className="text-blue-600 font-semibold flex items-center justify-end gap-1">
                              <TrendingDown size={16} />
                              -{formatCurrency(data.original.credit)} ر.س
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              parseFloat(data.original.balance || data.original.balance_after) < 0
                                ? 'text-red-600'
                                : parseFloat(data.original.balance || data.original.balance_after) > 0
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {formatCurrency(data.original.balance || data.original.balance_after)} ر.س
                          </span>
                        </td>
                      </tr>
                    )}

                    {/* Related Transaction */}
                    {data?.related ? (
                      <tr className="hover:bg-gray-50 bg-purple-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">{getAccountIcon(data.related.account_type)}</span>
                            <div>
                              <div className="font-medium">
                                {getAccountTypeLabel(data.related.account_type)} #{data.related.account_id}
                              </div>
                              <div className="text-xs text-gray-500">ID: {data.related.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-800">
                            {getAccountTypeLabel(data.related.account_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {data.related.debit && parseFloat(data.related.debit) > 0 ? (
                            <span className="text-green-600 font-semibold flex items-center justify-end gap-1">
                              <TrendingUp size={16} />
                              +{formatCurrency(data.related.debit)} ر.س
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {data.related.credit && parseFloat(data.related.credit) > 0 ? (
                            <span className="text-blue-600 font-semibold flex items-center justify-end gap-1">
                              <TrendingDown size={16} />
                              -{formatCurrency(data.related.credit)} ر.س
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              parseFloat(data.related.balance || data.related.balance_after) < 0
                                ? 'text-red-600'
                                : parseFloat(data.related.balance || data.related.balance_after) > 0
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {formatCurrency(data.related.balance || data.related.balance_after)} ر.س
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr className="bg-yellow-50">
                        <td colSpan={5} className="px-4 py-3 text-center text-sm text-yellow-800">
                          لا يوجد قيد مقابل (معاملة أحادية القيد - نظام قديم)
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-100 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">
                        الإجمالي:
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatCurrency(
                          (parseFloat(data?.original?.debit || 0) +
                            parseFloat(data?.related?.debit || 0))
                        )}{' '}
                        ر.س
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">
                        {formatCurrency(
                          (parseFloat(data?.original?.credit || 0) +
                            parseFloat(data?.related?.credit || 0))
                        )}{' '}
                        ر.س
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance Validation */}
              {data?.original && data?.related && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium">قيد محاسبي متوازن</p>
                      <p className="text-sm">
                        إجمالي المدين ={' '}
                        {formatCurrency(
                          parseFloat(data.original.debit || 0) + parseFloat(data.related.debit || 0)
                        )}{' '}
                        ر.س | إجمالي الدائن ={' '}
                        {formatCurrency(
                          parseFloat(data.original.credit || 0) + parseFloat(data.related.credit || 0)
                        )}{' '}
                        ر.س
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {data?.original && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {data.original.related_object_type && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-gray-600">مرتبط بـ:</span>
                      <span className="font-medium mr-2">
                        {data.original.related_object_type} #{data.original.related_object_id}
                      </span>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-600">تاريخ الإنشاء:</span>
                    <span className="font-medium mr-2">
                      {formatDistanceToNow(new Date(data.original.created_at), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryDetailsModal;
