import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetClientsReceivablesSummaryInfinite, useGetClientsReceivablesTotals } from '../queries/receivableQueries';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import ClientsReceivablesTable from '../components/receivables/ClientsReceivablesTable';
import Button from '../components/ui/Button';
import { PlusCircle, FileSpreadsheet, Search, X } from 'lucide-react';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';
import SaudiRiyalIcon from '../components/ui/SaudiRiyalIcon';
import { useDebounce } from '../hooks/useDebounce';
// --- MODIFICATIONS START ---
import { useMutation } from '@tanstack/react-query';
import { exportService } from '../services/export/ExportService';
import { useToast } from '../hooks/useToast';
import type { AllReceivablesReportData } from '../services/export/exportTypes';
import { useInView } from 'react-intersection-observer';
// --- MODIFICATIONS END ---

const ReceivablesPage = () => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const { hasViewAllReceivablesPermission, isLoading: isPermissionsLoading } = useReceivablesPermissions();
  const { showToast } = useToast(); // ADD

  // Search state management
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500); // 500ms delay


  // Use infinite query for clients receivables summary with search
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetClientsReceivablesSummaryInfinite(hasViewAllReceivablesPermission, debouncedSearch);

  // Fetch totals separately (not paginated)
  const { data: totalsData, isLoading: isTotalsLoading } = useGetClientsReceivablesTotals(hasViewAllReceivablesPermission);

  // Flatten the pages into a single array for rendering
  const allClients = useMemo(() => data?.pages.flatMap(page => page.clients) || [], [data]);

  // Logic for infinite scroll
  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  // --- NEW: Mutation for exporting ---
  const exportReceivablesMutation = useMutation({
    mutationFn: (reportData: AllReceivablesReportData) => exportService.exportAllReceivables(reportData),
    onSuccess: () => {
      showToast({ type: 'success', title: 'تم تصدير الملف بنجاح' });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', title: 'فشل التصدير', message: error.message });
    },
  });

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

  // Handle adding a credit
  const handleAddCredit = () => openModal('recordCreditModal', {});

  // Handle search clear
  const handleClearSearch = () => setSearch('');

  // --- NEW: Export handler ---
  const handleExportExcel = () => {
    if (allClients.length > 0 && totalsData) {
      const receivablesForExport = allClients.map(client => ({
        client_id: client.client_id,
        client_name: client.client_name,
        client_phone: client.client_phone,
        // Use consistent field names matching what's displayed in tables
        total_debit: client.total_amount,
        total_credit: client.paid_amount,
        net_receivables: client.remaining_amount,
      }));

      // Use the totals from the separate API endpoint instead of calculating from paginated data
      const summary = {
        total_debit: totalsData.total_amount,
        total_credit: totalsData.total_paid,
        net_receivables: totalsData.total_unpaid,
        clients_with_debt: totalsData.clients_with_debt,
        clients_with_credit: totalsData.clients_with_credit,
        balanced_clients: totalsData.balanced_clients,
      };

      exportReceivablesMutation.mutate({ receivables: receivablesForExport, summary });
    }
  };


  // Show permission denied message if user doesn't have access
  if (isPermissionsLoading) {
    return <div className="flex justify-center p-4">Loading permissions...</div>;
  }

  if (!hasViewAllReceivablesPermission) {
    return (
      <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4 text-center">
        <h4 className="text-lg font-bold text-black mb-2">Access Denied</h4>
        <p className="text-black">You don't have permission to view receivables.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-1 py-1">
        {/* Title and Add buttons */}
        <div className="flex items-center gap-2">
          <h5 className="mb-0 text-primary" style={{
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}>{t('receivables.title')}</h5>
          
          <Button onClick={handleAddCredit} variant="outline-primary" size="sm">
            <SaudiRiyalIcon size={14} className="me-1" />
            إضافة دفعة للرصيد
          </Button>
          
          <Button onClick={() => openModal('invoiceForm', {})} size="sm">
            <PlusCircle size={14} className="me-1" />
            إضافة فاتورة يدوية
          </Button>
        </div>
        
        {/* Search and Export */}
        <div className="flex items-center gap-2">
          {/* Compact Search */}
          <div className="relative" style={{ minWidth: '250px' }}>
            <Search 
              size={14} 
              className="absolute text-black" 
              style={{ left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
            {search && (
              <button
                type="button"
                className="absolute text-black p-0 hover:text-foreground transition-colors"
                style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                onClick={handleClearSearch}
                title="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          {/* Search results indicator */}
          {debouncedSearch && data && (
            <small className="text-black" style={{ minWidth: 'fit-content' }}>
              ({data.pages[0]?.pagination?.total || 0} نتيجة)
            </small>
          )}
          
          <Button 
            variant="outline-primary"
            size="sm"
            onClick={handleExportExcel}
            isLoading={exportReceivablesMutation.isPending}
          >
            <FileSpreadsheet size={14} className="me-1" />
            تصدير
          </Button>
        </div>
      </header>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="p-0">
          {/* Show search results or no results message */}
          {debouncedSearch && allClients.length === 0 && !isLoading ? (
            <div className="text-center p-4">
              <Search size={32} className="text-black mb-2" />
              <h6 className="text-black font-semibold mb-1">لا توجد نتائج</h6>
              <p className="text-black mb-2" style={{ fontSize: '0.875rem' }}>
                لم يتم العثور على عملاء يحتوون على "{debouncedSearch}" في الاسم أو رقم الهاتف
              </p>
              <Button variant="outline-primary" size="sm" onClick={handleClearSearch}>
                مسح البحث
              </Button>
            </div>
          ) : (
            <>
              <ClientsReceivablesTable
                clients={allClients}
                isLoading={isLoading && !data}
                totals={totalsData}
                isTotalsLoading={isTotalsLoading}
              />
              
              {/* Load More Button & Intersection Observer */}
              <div ref={ref} className="text-center p-4">
                {hasNextPage && (
                  <Button
                    onClick={() => fetchNextPage()}
                    isLoading={isFetchingNextPage}
                    variant="outline-primary"
                  >
                    {isFetchingNextPage ? 'جاري التحميل...' : 'تحميل المزيد'}
                  </Button>
                )}
                {!hasNextPage && !isLoading && allClients.length > 0 && (
                  <p className="text-black mb-0">
                    {debouncedSearch ? 'وصلت إلى نهاية نتائج البحث' : 'وصلت إلى نهاية القائمة'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceivablesPage;