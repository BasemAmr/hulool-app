/**
 * Journal Entry Details Modal
 * 
 * Displays complete double-entry journal entry with both sides of the transaction
 * Uses BaseModal component, EN numbers/dates, and shows entity links
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, TrendingUp, TrendingDown, Building, User, Users, ExternalLink } from 'lucide-react';
import { useModalStore } from '../../stores/modalStore';
import BaseModal from '../ui/BaseModal';
import apiClient from '../../api/apiClient';
import { Spinner } from '../ui/spinner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

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

  // Format currency in English
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format date in English
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  // Render entity link based on related_object_type
  const renderEntityLink = (txn: any) => {
    if (!txn.related_object_type || !txn.related_object_id) return null;

    const type = txn.related_object_type;
    const id = txn.related_object_id;
    const name = txn.client_name || txn.employee_name || txn.task_name || txn.invoice_name || txn.account_name;

    let url = '';
    let label = '';

    if (type === 'client' || type.includes('Client')) {
      url = `/clients/${id}`;
      label = name || `Client #${id}`;
    } else if (type === 'employee' || type.includes('Employee')) {
      url = `/employees/${id}`;
      label = name || `Employee #${id}`;
    } else if (type === 'task' || type.includes('Task')) {
      url = `/tasks/${id}`;
      label = name || `Task #${id}`;
    } else if (type === 'invoice' || type.includes('Invoice')) {
      url = `/invoices/${id}`;
      label = name || `Invoice #${id}`;
    }

    if (url) {
      return (
        <Link to={url} className="inline-flex items-center gap-1 text-primary hover:underline">
          {label}
          <ExternalLink size={12} />
        </Link>
      );
    }

    return <span>{type} #{id}</span>;
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={`تفاصيل القيد المزدوج #${transactionId}`}
      className="max-w-4xl"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            خطأ في تحميل تفاصيل القيد
          </div>
        ) : (
          <>
            {/* Transaction Info */}
            {data?.original && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">التاريخ:</span>
                  <span className="font-medium">
                    {formatDate(data.original.transaction_date || data.original.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">النوع:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {getTransactionTypeLabel(data.original.transaction_type)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">الوصف:</span>
                  <p className="font-medium mt-1">{data.original.description}</p>
                </div>
                {renderEntityLink(data.original) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">مرتبط بـ:</span>
                    {renderEntityLink(data.original)}
                  </div>
                )}
              </div>
            )}

            {/* Double Entry Table */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-start text-sm font-semibold text-gray-700 border border-gray-300">
                      الحساب
                    </th>
                    <th className="px-3 py-2 text-start text-sm font-semibold text-gray-700 border border-gray-300">
                      نوع الحساب
                    </th>
                    <th className="px-3 py-2 text-start text-sm font-semibold text-gray-700 border border-gray-300">
                      مدين (Debit)
                    </th>
                    <th className="px-3 py-2 text-start text-sm font-semibold text-gray-700 border border-gray-300">
                      دائن (Credit)
                    </th>
                    <th className="px-3 py-2 text-start text-sm font-semibold text-gray-700 border border-gray-300">
                      الرصيد بعد
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Original Transaction */}
                  {data?.original && (
                    <tr className="hover:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{getAccountIcon(data.original.account_type)}</span>
                          <div className="text-sm">
                            <div className="font-medium">
                              {getAccountTypeLabel(data.original.account_type)} #{data.original.account_id}
                            </div>
                            <div className="text-xs text-gray-500">ID: {data.original.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800">
                          {getAccountTypeLabel(data.original.account_type)}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-gray-300 text-start">
                        {data.original.debit && parseFloat(data.original.debit) > 0 ? (
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            <TrendingUp size={14} />
                            +{formatCurrency(data.original.debit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border border-gray-300 text-start">
                        {data.original.credit && parseFloat(data.original.credit) > 0 ? (
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            <TrendingDown size={14} />
                            -{formatCurrency(data.original.credit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border border-gray-300 text-start">
                        <span
                          className={`font-semibold ${
                            parseFloat(data.original.balance || data.original.balance_after) < 0
                              ? 'text-red-600'
                              : parseFloat(data.original.balance || data.original.balance_after) > 0
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {formatCurrency(data.original.balance || data.original.balance_after)}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Related Transaction */}
                  {data?.related ? (
                    <tr className="hover:bg-gray-50 bg-purple-50">
                      <td className="px-3 py-2 border border-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{getAccountIcon(data.related.account_type)}</span>
                          <div className="text-sm">
                            <div className="font-medium">
                              {getAccountTypeLabel(data.related.account_type)} #{data.related.account_id}
                            </div>
                            <div className="text-xs text-gray-500">ID: {data.related.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-800">
                          {getAccountTypeLabel(data.related.account_type)}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-gray-300 text-start">
                        {data.related.debit && parseFloat(data.related.debit) > 0 ? (
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            <TrendingUp size={14} />
                            +{formatCurrency(data.related.debit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border border-gray-300 text-start">
                        {data.related.credit && parseFloat(data.related.credit) > 0 ? (
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            <TrendingDown size={14} />
                            -{formatCurrency(data.related.credit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border border-gray-300 text-start">
                        <span
                          className={`font-semibold ${
                            parseFloat(data.related.balance || data.related.balance_after) < 0
                              ? 'text-red-600'
                              : parseFloat(data.related.balance || data.related.balance_after) > 0
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {formatCurrency(data.related.balance || data.related.balance_after)}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr className="bg-yellow-50">
                      <td colSpan={5} className="px-3 py-2 border border-gray-300 text-center text-sm text-yellow-800">
                        لا يوجد قيد مقابل (معاملة أحادية القيد - نظام قديم)
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold text-sm">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-start border border-gray-300">
                      الإجمالي:
                    </td>
                    <td className="px-3 py-2 text-start text-green-600 border border-gray-300">
                      {formatCurrency(
                        (parseFloat(data?.original?.debit || 0) +
                          parseFloat(data?.related?.debit || 0))
                      )}
                    </td>
                    <td className="px-3 py-2 text-start text-blue-600 border border-gray-300">
                      {formatCurrency(
                        (parseFloat(data?.original?.credit || 0) +
                          parseFloat(data?.related?.credit || 0))
                      )}
                    </td>
                    <td className="px-3 py-2 border border-gray-300"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance Validation */}
            {data?.original && data?.related && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-green-800">
                  <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">قيد محاسبي متوازن</p>
                    <p className="text-xs">
                      Total Debits ={' '}
                      {formatCurrency(
                        parseFloat(data.original.debit || 0) + parseFloat(data.related.debit || 0)
                      )}{' '}
                      | Total Credits ={' '}
                      {formatCurrency(
                        parseFloat(data.original.credit || 0) + parseFloat(data.related.credit || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default JournalEntryDetailsModal;
