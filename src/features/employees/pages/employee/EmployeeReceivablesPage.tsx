/**
 * EmployeeReceivablesPage
 *
 * Shows all clients receivables summary for employees.
 * Same layout, table structure, and actions as ReceivablesPage (admin view),
 * but navigates to employee client profile routes.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetClientsReceivablesSummaryInfinite, useGetClientsReceivablesTotals } from '@/features/receivables/api/receivableQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import Button from '@/shared/ui/primitives/Button';
import { FileSpreadsheet, Search, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useReceivablesPermissions } from '@/shared/hooks/useReceivablesPermissions';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useMutation } from '@tanstack/react-query';
import { exportService } from '@/services/export/ExportService';
import { useToast } from '@/shared/hooks/useToast';
import type { AllReceivablesReportData } from '@/services/export/exportTypes';
import { useInView } from 'react-intersection-observer';
import EmployeeReceivablesTable from './EmployeeReceivablesTable';
import { LedgerStatCell } from '@/shared/ledger/LedgerStatCell';

const EmployeeReceivablesPage = () => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const { hasViewAllReceivablesPermission, isLoading: isPermissionsLoading } = useReceivablesPermissions();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

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
    <div className="space-y-3" dir="rtl">
      {/* Ledger-style Toolbar Header matching TreasuryAccountDetailsPage and ReceivablesPage */}
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-sm overflow-hidden">
        <div className="relative flex flex-col lg:flex-row lg:items-stretch">
          
          {/* RTL Start (Right side): Title + Transaction Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 p-3 min-w-0 shrink-0">
            <h5 className="mb-0 text-primary font-bold text-base px-1 whitespace-nowrap">
              {t('receivables.title')}
            </h5>

            <Button
              variant="outline-success"
              size="sm"
              className="font-bold flex items-center gap-1"
              onClick={() => openModal('unifiedTransaction', {
                defaultFromCardType: 'client',
                defaultToCardType: 'cashbox',
                lockDirection: true,
                title: 'سند قبض',
              })}
            >
              <TrendingUp size={14} />
              سند قبض
            </Button>

            <Button
              variant="outline-danger"
              size="sm"
              className="font-bold flex items-center gap-1"
              onClick={() => openModal('unifiedTransaction', {
                defaultFromCardType: 'cashbox',
                defaultToCardType: 'client',
                lockDirection: true,
                title: 'سند صرف',
              })}
            >
              <TrendingDown size={14} />
              سند صرف
            </Button>
          </div>

          {/* Center: Search input */}
          <div className="flex items-center justify-center p-3 lg:flex-1">
            <div className="relative w-full max-w-sm">
              <Search
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                dir="rtl"
                className="base-input h-9 w-full rounded-lg border-border-default bg-background/50 pr-8 pl-8 text-right text-xs shadow-sm transition-all placeholder:text-text-muted/70 focus:bg-background focus:ring-1 focus:ring-primary/30"
                placeholder="البحث بالاسم أو رقم الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-muted hover:text-text-primary"
                  onClick={handleClearSearch}
                  title="مسح البحث"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {debouncedSearch && data && (
              <small className="text-text-secondary mr-2 shrink-0">
                ({data.pages[0]?.pagination?.total || 0} نتيجة)
              </small>
            )}
          </div>

          {/* RTL End (Left side): Server-calculated Totals + Export Button */}
          <div className="flex items-stretch shrink-0 border-t lg:border-t-0 lg:border-s border-border-default overflow-x-auto lg:overflow-x-visible">
            <LedgerStatCell
              label="اجمالي المدين"
              value={totalsData?.total_amount || 0}
              tone="debit"
              divider
            />
            <LedgerStatCell
              label="اجمالي الدائن"
              value={totalsData?.total_paid || 0}
              tone="credit"
              divider
            />
            <LedgerStatCell
              label="إجمالي المستحقات"
              value={totalsData?.total_unpaid || 0}
              tone="balance"
              divider
            />
            <div className="flex items-center px-4">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleExportExcel}
                isLoading={exportReceivablesMutation.isPending}
                className="h-9 whitespace-nowrap"
              >
                <FileSpreadsheet size={15} className="me-1.5" />
                تصدير Excel
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Table Container - matching ReceivablesPage presentation */}
      <div className="receivables-table-container mx-auto w-[95%] max-w-[1760px] bg-bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <div className="p-0">
          {debouncedSearch && allClients.length === 0 && !isLoading ? (
            <div className="text-center p-6">
              <Search size={32} className="text-text-muted mx-auto mb-2" />
              <h6 className="text-text-primary font-semibold mb-1">لا توجد نتائج</h6>
              <p className="text-text-secondary mb-3 text-sm">
                لم يتم العثور على عملاء يحتوون على "{debouncedSearch}" في الاسم أو رقم الهاتف
              </p>
              <Button variant="outline-primary" size="sm" onClick={handleClearSearch}>
                مسح البحث
              </Button>
            </div>
          ) : (
            <>
              <EmployeeReceivablesTable
                clients={allClients}
                isLoading={isLoading && !data}
                totals={totalsData}
                isTotalsLoading={isTotalsLoading}
              />

              <div ref={ref} className="text-center p-3 border-t border-border-default">
                {hasNextPage && (
                  <Button
                    onClick={() => fetchNextPage()}
                    isLoading={isFetchingNextPage}
                    variant="outline-primary"
                    size="sm"
                  >
                    {isFetchingNextPage ? 'جاري التحميل...' : 'تحميل المزيد'}
                  </Button>
                )}
                {!hasNextPage && !isLoading && allClients.length > 0 && (
                  <p className="text-text-secondary text-xs mb-0">
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

export default EmployeeReceivablesPage;
