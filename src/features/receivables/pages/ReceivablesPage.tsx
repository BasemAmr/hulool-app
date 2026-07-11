import { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetClientsReceivablesSummaryInfinite, useGetClientsReceivablesTotals } from '@/features/receivables/api/receivableQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import ClientsReceivablesTable from '../components/ClientsReceivablesTable';
import Button from '@/shared/ui/primitives/Button';
import { PlusCircle, FileSpreadsheet, Search, X } from 'lucide-react';
import { useReceivablesPermissions } from '@/shared/hooks/useReceivablesPermissions';
import SaudiRiyalIcon from '@/shared/ui/icons/SaudiRiyalIcon';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useMutation } from '@tanstack/react-query';
import { exportService } from '@/services/export/ExportService';
import { useToast } from '@/shared/hooks/useToast';
import type { AllReceivablesReportData } from '@/services/export/exportTypes';
import { useInView } from 'react-intersection-observer';

const ReceivablesPage = () => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const { hasViewAllReceivablesPermission, isLoading: isPermissionsLoading } = useReceivablesPermissions();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [settlementOpen, setSettlementOpen] = useState(false);
  const settlementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settlementRef.current && !settlementRef.current.contains(e.target as Node)) {
        setSettlementOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetClientsReceivablesSummaryInfinite(hasViewAllReceivablesPermission, debouncedSearch);

  const { data: totalsData, isLoading: isTotalsLoading } = useGetClientsReceivablesTotals(hasViewAllReceivablesPermission);

  const allClients = useMemo(() => data?.pages.flatMap(page => page.clients) || [], [data]);

  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  const exportReceivablesMutation = useMutation({
    mutationFn: (reportData: AllReceivablesReportData) => exportService.exportAllReceivables(reportData),
    onSuccess: () => {
      showToast({ type: 'success', title: 'تم تصدير الملف بنجاح' });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', title: 'فشل التصدير', message: error.message });
    },
  });

  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

  const handleAddCredit = () => openModal('recordCreditModal', {});
  const handleClearSearch = () => setSearch('');

  const handleExportExcel = () => {
    if (allClients.length > 0 && totalsData) {
      const receivablesForExport = allClients.map(client => ({
        client_id: client.client_id,
        client_name: client.client_name,
        client_phone: client.client_phone,
        total_debit: client.total_amount,
        total_credit: client.paid_amount,
        net_receivables: client.remaining_amount,
      }));

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

  if (isPermissionsLoading) {
    return <div className="flex justify-center p-4">Loading permissions...</div>;
  }

  if (!hasViewAllReceivablesPermission) {
    return (
      <div className="rounded-lg border border-yellow-500 bg-status-warning-bg0/10 p-4 text-center">
        <h4 className="text-lg font-bold text-text-primary mb-2">Access Denied</h4>
        <p className="text-text-primary">You don't have permission to view receivables.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-1 py-1">
        <div className="flex items-center gap-2">
          <h5 className="mb-0 text-primary font-bold" style={{ fontSize: '1.1rem' }}>{t('receivables.title')}</h5>

          <Button onClick={handleAddCredit} variant="outline-primary" size="sm">
            <SaudiRiyalIcon size={14} className="me-1" />
            إضافة دفعة للرصيد
          </Button>

          <Button onClick={() => openModal('invoiceForm', {})} size="sm">
            <PlusCircle size={14} className="me-1" />
            إضافة فاتورة يدوية
          </Button>

          <Button
            variant="outline-success"
            size="sm"
            className="font-bold"
            onClick={() => openModal('unifiedTransaction', {
              defaultFromCardType: 'client',
              defaultToCardType: 'treasury',
              lockDirection: true,
              title: 'سند قبض',
            })}
          >
            سند قبض
          </Button>

          <Button
            variant="outline-danger"
            size="sm"
            className="font-bold"
            onClick={() => openModal('unifiedTransaction', {
              defaultFromCardType: 'treasury',
              defaultToCardType: 'client',
              lockDirection: true,
              title: 'سند صرف',
            })}
          >
            سند صرف
          </Button>

          <div ref={settlementRef} className="relative">
            <Button
              variant="outline-secondary"
              size="sm"
              className="font-bold"
              onClick={() => setSettlementOpen((v) => !v)}
            >
              سند تسوية
            </Button>
            {settlementOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border bg-card shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-muted/50 transition-colors rounded-t-lg"
                  onClick={() => {
                    setSettlementOpen(false);
                    openModal('unifiedTransaction', {
                      defaultFromCardType: 'client',
                      defaultToCardType: 'settlement',
                      lockDirection: true,
                      title: 'تسوية قبض',
                    });
                  }}
                >
                  تسوية قبض
                </button>
                <div className="border-t border-border" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-muted/50 transition-colors rounded-b-lg"
                  onClick={() => {
                    setSettlementOpen(false);
                    openModal('unifiedTransaction', {
                      defaultFromCardType: 'settlement',
                      defaultToCardType: 'client',
                      lockDirection: true,
                      title: 'تسوية صرف',
                    });
                  }}
                >
                  تسوية صرف
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" style={{ minWidth: '250px' }}>
            <Search
              size={14}
              className="absolute text-text-primary"
              style={{ left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
            {search && (
              <button
                type="button"
                className="absolute text-text-primary p-0 hover:text-foreground transition-colors"
                style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                onClick={handleClearSearch}
                title="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {debouncedSearch && data && (
            <small className="text-text-primary" style={{ minWidth: 'fit-content' }}>
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
          {debouncedSearch && allClients.length === 0 && !isLoading ? (
            <div className="text-center p-4">
              <Search size={32} className="text-text-primary mb-2" />
              <h6 className="text-text-primary font-semibold mb-1">لا توجد نتائج</h6>
              <p className="text-text-primary mb-2" style={{ fontSize: '0.875rem' }}>
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
                  <p className="text-text-primary mb-0">
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
