/**
 * InvoicesHubPage
 * 
 * Centralized invoice management page with:
 * - Aging analysis summary cards
 * - Filterable invoice table
 * - Status-based view (table or Kanban)
 * - Bulk actions
 */

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useGetInvoiceAgingAnalysis } from '../../queries/financialCenterQueries';
import { useGetInvoicesInfinite } from '../../queries/invoiceQueries';
import { useModalStore } from '../../stores/modalStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/spinner';
import { Badge } from '../../components/ui/badge';
import Input from '../../components/ui/Input';
import ClientSearchCombobox from '../../components/ui/ClientSearchCombobox';
import InvoicesKanban from '../../components/invoices/InvoicesKanban';
import {
  X,
  Plus,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  LayoutGrid,
  LayoutList,
  Filter,
  DollarSign,
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useInView } from 'react-intersection-observer';
import type { InvoiceStatus } from '../../api/types';
import InvoiceEditModal from '../../components/modals/InvoiceEditModal';
import InvoiceCancelModal from '../../components/modals/InvoiceCancelModal';
import InvoiceDeleteModal from '../../components/modals/InvoiceDeleteModal';
import { Edit3, Trash2, XCircle } from 'lucide-react';

type ViewMode = 'table' | 'kanban';

const InvoicesHubPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'partially_paid' | 'unpaid' | ''>(
    (searchParams.get('status') as any) || 'unpaid'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const debouncedSearch = useDebounce(search, 500);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalType, setModalType] = useState<'edit' | 'cancel' | 'delete' | null>(null);
  const openModal = useModalStore((state) => state.openModal);

  // Update status filter if URL param changes
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam as any);
    }
  }, [searchParams]);

  // Update URL when status changes
  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus as any);
    if (newStatus) {
      setSearchParams(prev => {
        prev.set('status', newStatus);
        return prev;
      });
    } else {
      setSearchParams(prev => {
        prev.delete('status');
        return prev;
      });
    }
  };

  // Fetch aging analysis
  const { data: agingData, isLoading: isAgingLoading } = useGetInvoiceAgingAnalysis();

  // Fetch invoices with infinite scroll (only for Table view)
  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetInvoicesInfinite({
    search: debouncedSearch || undefined,
    status: (statusFilter || undefined) as any,
    client_id: clientIdFilter ? Number(clientIdFilter) : undefined,
    per_page: 10,
  }, viewMode === 'table');

  // Flatten invoices
  const allInvoices = useMemo(
    () => invoicesData?.pages.flatMap((page) => page.invoices) || [],
    [invoicesData]
  );

  // Infinite scroll trigger
  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage && viewMode === 'table') {
        fetchNextPage();
      }
    },
  });

  // Apply page background
  useEffect(() => {
    applyPageBackground('financial-center');
  }, []);

  // Get status badge
  const getStatusBadge = (status: InvoiceStatus, paidAmount: number, amount: number) => {
    const isPaid = paidAmount >= amount;
    const isPartial = paidAmount > 0 && paidAmount < amount;

    if (isPaid) {
      return <Badge className="bg-green-100 text-green-700">مدفوعة</Badge>;
    }
    if (isPartial) {
      return <Badge className="bg-yellow-100 text-yellow-700">جزئية</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge className="bg-gray-100 text-gray-700">ملغاة</Badge>;
    }
    if (status === 'overdue') {
      return <Badge className="bg-red-100 text-red-700">متأخرة</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700">معلقة</Badge>;
  };

  // Clear search
  const handleClearSearch = () => {
    setSearch('');
    setClientIdFilter('');
  };

  // Handle new invoice
  const handleNewInvoice = () => {
    openModal('createInvoice', {});
  };

  // Status filter options
  const statusOptions = [
    { value: '', label: 'الكل' },
    { value: 'unpaid', label: 'غير مدفوعة' },
    { value: 'pending', label: 'معلقة' },
    { value: 'paid', label: 'مدفوعة' },
    { value: 'partially_paid', label: 'مدفوعة جزئياً' },
    { value: 'overdue', label: 'متأخرة' },
    { value: 'cancelled', label: 'ملغاة' },
  ];

  return (
    <div className="w-full p-4 h-[calc(100vh-80px)] max-w-full overflow-hidden flex flex-col">
      {/* Header with Title and Aging Stats */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 flex-shrink-0">
        <h1 className="text-lg font-bold text-black flex items-center gap-2">
          <FileText className="text-primary" />
          مركز الفواتير
        </h1>

        {/* Aging Stats Inline */}
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full border shadow-sm flex items-center gap-4 text-xs overflow-x-auto max-w-full">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-gray-600">حالية:</span>
            <span className="font-bold text-green-600">
              {isAgingLoading ? '...' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(agingData?.current?.amount || 0)}
            </span>
            <span className="text-gray-400">({isAgingLoading ? '-' : agingData?.current?.count || 0})</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Clock size={14} className="text-yellow-500" />
            <span className="text-gray-600">30 يوم:</span>
            <span className="font-bold text-yellow-600">
              {isAgingLoading ? '...' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(agingData?.['30_days']?.amount || 0)}
            </span>
            <span className="text-gray-400">({isAgingLoading ? '-' : agingData?.['30_days']?.count || 0})</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <AlertCircle size={14} className="text-orange-500" />
            <span className="text-gray-600">60 يوم:</span>
            <span className="font-bold text-orange-600">
              {isAgingLoading ? '...' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(agingData?.['60_days']?.amount || 0)}
            </span>
            <span className="text-gray-400">({isAgingLoading ? '-' : agingData?.['60_days']?.count || 0})</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-gray-600">+90:</span>
            <span className="font-bold text-red-600">
              {isAgingLoading ? '...' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(agingData?.['90_plus']?.amount || 0)}
            </span>
            <span className="text-gray-400">({isAgingLoading ? '-' : agingData?.['90_plus']?.count || 0})</span>
          </div>
        </div>

        <Button onClick={handleNewInvoice} variant="primary" size="sm">
          <Plus size={14} className="me-1" />
          فاتورة جديدة
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border shadow-sm mb-4 flex-shrink-0">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Filter size={14} />
          </div>
          <Input
            placeholder="البحث برقم، وصف، مهمة..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Client Combobox */}
        <div className="w-[250px]">
          <ClientSearchCombobox
            value={clientIdFilter}
            onChange={setClientIdFilter}
            placeholder="تصفية حسب العميل..."
          />
        </div>

        {/* Status Filter */}
        <div className="w-[180px]">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 hidden md:block" />

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-md shadow-sm border border-input bg-background">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'hover:bg-muted text-black/70'}`}
            title="عرض جدول"
          >
            <LayoutList size={18} />
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 transition-colors ${viewMode === 'kanban' ? 'bg-primary text-white' : 'hover:bg-muted text-black/70'}`}
            title="عرض كانبان"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        {viewMode === 'kanban' ? (
          <InvoicesKanban
            search={debouncedSearch}
            clientId={clientIdFilter}
          />
        ) : (
          /* Table View */
          <div className="bg-white rounded-lg border shadow-sm h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              {isInvoicesLoading && allInvoices.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner />
                </div>
              ) : allInvoices.length === 0 ? (
                <div className="text-center py-20">
                  <FileText size={48} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">لا توجد فواتير</h3>
                  <p className="text-gray-500 mt-1">جرب تغيير شروط البحث أو الفلترة</p>
                  {(search || clientIdFilter || statusFilter) && (
                    <Button
                      variant="outline-primary"
                      className="mt-4"
                      onClick={handleClearSearch}
                    >
                      مسح الفلاتر
                    </Button>
                  )}
                </div>
              ) : (
                <Table className="border-collapse border border-gray-300">
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="text-start w-[80px] border border-gray-300 px-3 py-2">#</TableHead>
                      <TableHead className="text-start border border-gray-300 px-3 py-2">العميل</TableHead>
                      <TableHead className="text-start border border-gray-300 px-3 py-2">المهمة/الوصف</TableHead>
                      <TableHead className="text-start border border-gray-300 px-3 py-2">المبلغ</TableHead>
                      <TableHead className="text-start border border-gray-300 px-3 py-2">المدفوع</TableHead>
                      <TableHead className="text-start text-xs text-gray-400 border border-gray-300 px-3 py-2">الإجمالي</TableHead>
                      <TableHead className="text-start border border-gray-300 px-3 py-2">المتبقي</TableHead>
                      <TableHead className="text-start border border-gray-300 px-3 py-2">الاستحقاق</TableHead>
                      <TableHead className="text-start border border-gray-300 px-3 py-2">الحالة</TableHead>
                      <TableHead className="text-start w-[80px] border border-gray-300 px-3 py-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/20 group">
                        <TableCell className="font-mono text-xs border border-gray-300 px-3 py-2">{invoice.id}</TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <span className="font-medium text-sm text-gray-900">
                            {invoice.client?.name || `عميل #${invoice.client_id}`}
                          </span>
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <span className="text-sm text-gray-600 block max-w-[200px] truncate" title={invoice.task?.task_name || invoice.description}>
                            {invoice.task?.task_name || invoice.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <span className={`text-sm ${Number(invoice.paid_amount) > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.paid_amount))}
                          </span>
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <span className="text-xs text-gray-400">
                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.total_amount || invoice.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <span className={`text-sm ${Number(invoice.remaining_amount) > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(invoice.remaining_amount))}
                          </span>
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <span className="text-xs font-mono text-gray-500">
                            {new Date(invoice.due_date).toLocaleDateString('en-CA')}
                          </span>
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          {getStatusBadge(
                            invoice.status,
                            Number(invoice.paid_amount),
                            Number(invoice.amount)
                          )}
                        </TableCell>
                        <TableCell className="border border-gray-300 px-3 py-2">
                          <div className="flex justify-between gap-1 p-1 ">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => { setSelectedInvoice(invoice); setModalType('edit'); }}
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </Button>
                            {invoice.status === 'draft' && (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => { setSelectedInvoice(invoice); setModalType('delete'); }}
                                title="Delete"
                                className="text-red-500"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                            {invoice.status !== 'cancelled' && invoice.status !== 'draft' && (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => { setSelectedInvoice(invoice); setModalType('cancel'); }}
                                title="Cancel"
                                className="text-orange-500"
                              >
                                <XCircle size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => openModal('invoiceDetails', { invoiceId: invoice.id })}
                              title="تفاصيل"
                            >
                              <FileText size={16} className="text-primary" />
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => openModal('recordPayment', {
                                invoiceId: invoice.id,
                                amountDue: invoice.remaining_amount,
                                clientName: invoice.client?.name
                              })}
                              title="دفع"
                            >
                              <DollarSign size={16} className="text-primary" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Load More Trigger */}
              <div ref={ref} className="h-10 w-full flex justify-center items-center">
                {isFetchingNextPage && viewMode === 'table' && <Spinner size="sm" />}
              </div>
            </div>
          </div>
        )}
      </div>

      {modalType === 'edit' && selectedInvoice && (
        <InvoiceEditModal
          isOpen={true}
          onClose={() => setModalType(null)}
          invoice={selectedInvoice}
        />
      )}
      {modalType === 'cancel' && selectedInvoice && (
        <InvoiceCancelModal
          isOpen={true}
          onClose={() => setModalType(null)}
          invoice={selectedInvoice}
        />
      )}
      {modalType === 'delete' && selectedInvoice && (
        <InvoiceDeleteModal
          isOpen={true}
          onClose={() => setModalType(null)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
};

export default InvoicesHubPage;
