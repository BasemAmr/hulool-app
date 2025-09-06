import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetClientsReceivablesSummaryInfinite, useGetClientsReceivablesTotals } from '../queries/receivableQueries';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import ClientsReceivablesTable from '../components/receivables/ClientsReceivablesTable';
import Button from '../components/ui/Button';
import { PlusCircle, FileSpreadsheet } from 'lucide-react';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';
import SaudiRiyalIcon from '../components/ui/SaudiRiyalIcon';
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

  // Use infinite query for clients receivables summary
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetClientsReceivablesSummaryInfinite(hasViewAllReceivablesPermission);

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
    return <div className="d-flex justify-content-center p-4">Loading permissions...</div>;
  }

  if (!hasViewAllReceivablesPermission) {
    return (
      <div className="alert alert-warning text-center">
        <h4>Access Denied</h4>
        <p>You don't have permission to view receivables.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="d-flex justify-content-between align-items-center mb-3">
        <h1 style={{
          background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 'bold'
        }}>{t('receivables.title')}</h1>
        {/* MODIFIED: Group action buttons */}
        <div className="d-flex gap-2">
            <Button onClick={handleAddCredit} variant="outline-primary">
                <SaudiRiyalIcon size={18} className="me-2" />
                إضافة دفعة للرصيد
            </Button>
            <Button onClick={() => openModal('manualReceivable', {})}>
                <PlusCircle size={18} className="me-2" />
                {t('receivables.addNewManual')}
            </Button>
            <Button 
                variant="outline-primary"
                onClick={handleExportExcel}
                isLoading={exportReceivablesMutation.isPending}
            >
                <FileSpreadsheet size={16} className="me-1" />
                تصدير
            </Button>
        </div>
      </header>

      {/* Summary Cards can be added here later */}
      <div className="card">
        <div className="card-body p-0">
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
              <p className="text-muted mb-0">وصلت إلى نهاية القائمة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivablesPage;