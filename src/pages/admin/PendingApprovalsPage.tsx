/**
 * PendingApprovalsPage
 * 
 * Admin page for managing pending items (commissions, payouts, etc.)
 * Features:
 * - Tabs for filtering by type
 * - Card-based display of pending items
 * - Approve/Reject actions with optional amount adjustment
 * - Bulk approval capability
 */

import { useEffect, useState } from 'react';
import { applyPageBackground } from '../../utils/backgroundUtils';
import {
  useGetPendingItems,
  useGetPendingItemsSummary,
  useApprovePendingItem,
  useRejectPendingItem,
  useBulkApprovePendingItems,
} from '../../queries/financialCenterQueries';
import { Card, CardContent } from '../../components/ui/card';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import SaudiRiyalIcon from '../../components/ui/SaudiRiyalIcon';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { PendingItem, PendingItemType, PendingItemStatus } from '../../api/types';
import { useToast } from '../../hooks/useToast';

type TabType = 'all' | 'commission' | 'payout_approval' | 'invoice_payment';

const PendingApprovalsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<{ [key: number]: string }>({});
  const { showToast } = useToast();

  // Fetch pending items based on active tab
  const { data, isLoading, error } = useGetPendingItems({
    type: activeTab === 'all' ? undefined : activeTab as PendingItemType,
    status: 'pending',
  });

  // Fetch summary for tab counts
  const { data: summary } = useGetPendingItemsSummary();

  // Mutations
  const approveMutation = useApprovePendingItem();
  const rejectMutation = useRejectPendingItem();
  const bulkApproveMutation = useBulkApprovePendingItems();

  // Apply page background
  useEffect(() => {
    applyPageBackground('financial-center');
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    } catch {
      return date;
    }
  };

  // Get type label
  const getTypeLabel = (type: PendingItemType) => {
    switch (type) {
      case 'commission':
        return 'عمولة';
      case 'payout_approval':
        return 'طلب صرف';
      case 'invoice_payment':
        return 'دفعة فاتورة';
      default:
        return type;
    }
  };

  // Get status icon
  const getStatusIcon = (status: PendingItemStatus) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-orange-500" />;
      case 'approved':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      case 'finalized':
        return <CheckCircle size={16} className="text-blue-500" />;
      default:
        return null;
    }
  };

  // Handle approve
  const handleApprove = async (item: PendingItem) => {
    try {
      const adjustedAmount = adjustAmount[item.id];
      const finalAmount = adjustedAmount ? parseFloat(adjustedAmount) : undefined;
      
      await approveMutation.mutateAsync({ id: item.id, finalAmount });
      showToast({ type: 'success', title: 'تمت الموافقة بنجاح' });
      setExpandedItem(null);
      setAdjustAmount((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'فشلت الموافقة',
        message: err instanceof Error ? err.message : 'حدث خطأ',
      });
    }
  };

  // Handle reject
  const handleReject = async (item: PendingItem) => {
    try {
      await rejectMutation.mutateAsync({ id: item.id });
      showToast({ type: 'success', title: 'تم الرفض بنجاح' });
      setExpandedItem(null);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'فشل الرفض',
        message: err instanceof Error ? err.message : 'حدث خطأ',
      });
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const result = await bulkApproveMutation.mutateAsync(selectedItems);
      showToast({
        type: 'success',
        title: `تمت الموافقة على ${result.approved} عنصر`,
        message: result.failed > 0 ? `فشل ${result.failed} عنصر` : undefined,
      });
      setSelectedItems([]);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'فشلت الموافقة الجماعية',
        message: err instanceof Error ? err.message : 'حدث خطأ',
      });
    }
  };

  // Handle select item
  const handleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!data?.items) return;
    if (selectedItems.length === data.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.items.map((i) => i.id));
    }
  };

  // Tab options with counts
  const tabOptions: { key: TabType; label: string; count?: number }[] = [
    { key: 'all', label: 'الكل', count: summary?.pending },
    { key: 'commission', label: 'العمولات', count: summary?.by_type?.commission },
    { key: 'payout_approval', label: 'طلبات الصرف', count: summary?.by_type?.payout_approval },
    { key: 'invoice_payment', label: 'الدفعات', count: summary?.by_type?.invoice_payment },
  ];

  if (error) {
    return (
      <div className="w-full p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل العناصر المعلقة'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-black">الموافقات المعلقة</h1>
          <p className="text-sm text-black/70">إدارة العمولات والمدفوعات في انتظار الموافقة</p>
        </div>
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-black/70">
              {selectedItems.length} عنصر محدد
            </span>
            <Button
              onClick={handleBulkApprove}
              variant="primary"
              size="sm"
              isLoading={bulkApproveMutation.isPending}
            >
              <CheckCircle size={14} className="me-1" />
              موافقة جماعية
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
        {tabOptions.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedItems([]);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'text-black/70 hover:bg-muted'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`mr-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-orange-100 text-orange-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner>
            <span className="sr-only">جاري التحميل...</span>
          </Spinner>
        </div>
      ) : !data?.items?.length ? (
        <div className="text-center py-12">
          <CheckCircle size={48} className="text-green-500/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-black mb-1">لا توجد عناصر معلقة</h3>
          <p className="text-black/50">جميع العناصر تمت معالجتها</p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={selectedItems.length === data.items.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-black/70">
              تحديد الكل ({data.items.length})
            </span>
          </div>

          {/* Pending Items List */}
          <div className="space-y-3">
            {data.items.map((item) => (
              <Card key={item.id} className={expandedItem === item.id ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="w-4 h-4 rounded border-gray-300 mt-1"
                    />

                    {/* Main Content */}
                    <div className="flex-1">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className="font-medium text-black">
                            {getTypeLabel(item.item_type)}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded text-black/60">
                            #{item.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(item.expected_amount)}
                          </span>
                          <SaudiRiyalIcon size={14} className="text-primary" />
                        </div>
                      </div>

                      {/* Details Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        {item.account_name && (
                          <div className="flex items-center gap-1 text-black/70">
                            <User size={14} />
                            <span>{item.account_name}</span>
                          </div>
                        )}
                        {item.related_name && (
                          <div className="flex items-center gap-1 text-black/70">
                            <FileText size={14} />
                            <span>{item.related_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-black/50">
                          <Clock size={14} />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                        {item.days_pending !== undefined && item.days_pending > 0 && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <AlertCircle size={14} />
                            <span>{item.days_pending} يوم معلق</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-sm text-black/60 mb-3 bg-muted/50 p-2 rounded">
                          {item.notes}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(item)}
                          isLoading={approveMutation.isPending}
                        >
                          <CheckCircle size={14} className="me-1" />
                          موافقة
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() =>
                            setExpandedItem(expandedItem === item.id ? null : item.id)
                          }
                        >
                          <Edit2 size={14} className="me-1" />
                          تعديل المبلغ
                          {expandedItem === item.id ? (
                            <ChevronUp size={14} className="mr-1" />
                          ) : (
                            <ChevronDown size={14} className="mr-1" />
                          )}
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleReject(item)}
                          isLoading={rejectMutation.isPending}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle size={14} className="me-1" />
                          رفض
                        </Button>
                      </div>

                      {/* Expanded: Amount Adjustment */}
                      {expandedItem === item.id && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-3">
                            <div className="flex-1" style={{ maxWidth: '200px' }}>
                              <label className="text-xs text-black/60 mb-1 block">
                                المبلغ المعدل
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={String(item.expected_amount)}
                                  value={adjustAmount[item.id] || ''}
                                  onChange={(e) =>
                                    setAdjustAmount((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background pr-8"
                                />
                                <SaudiRiyalIcon
                                  size={12}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
                                />
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprove(item)}
                              isLoading={approveMutation.isPending}
                              className="self-end"
                            >
                              موافقة بالمبلغ المعدل
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PendingApprovalsPage;
