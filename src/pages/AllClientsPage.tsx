import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// import { useNavigate } from 'react-router-dom';
import { useGetClientsInfinite, /*useExportClients*/ } from '../queries/clientQueries';
import { useModalStore } from '../stores/modalStore';
import { /*useReceivablesPermissions */} from '../hooks/useReceivablesPermissions';
import { applyPageBackground } from '../utils/backgroundUtils';
import type { Client } from '../api/types';
import ClientsTable from '../components/clients/ClientsTable';
import Button from '../components/ui/Button';
import RegionSelect from '../components/shared/RegionSelect';
import { PlusCircle, FileSpreadsheet, Printer, X } from 'lucide-react';
// --- MODIFICATIONS START ---
import { useMutation } from '@tanstack/react-query';
import { exportService } from '../services/export/ExportService';
import { useToast } from '../hooks/useToast';
import { useInView } from 'react-intersection-observer';
// --- MODIFICATIONS END ---

const AllClientsPage = () => {
  const { t } = useTranslation();
  // const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);
  const { showToast } = useToast(); // ADD

  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<number | null>(null);

  // Apply clients page background
  useEffect(() => {
    applyPageBackground('clients');
  }, []);

  // Use infinite query for clients
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetClientsInfinite(search, regionFilter);

  // Flatten the pages into a single array for rendering
  const allClients = useMemo(() => data?.pages.flatMap(page => page.clients) || [], [data]);

  // --- NEW: Logic for infinite scroll ---
  const { ref } = useInView({
    threshold: 1, // Trigger when the element is fully in view
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  // --- NEW: Mutation for exporting ---
  const exportMutation = useMutation({
    mutationFn: exportService.exportAllClients,
    onSuccess: () => {
      showToast({ type: 'success', title: 'تم تصدير الملف بنجاح' });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', title: 'فشل التصدير', message: error.message });
    },
  });


  const handleAddClient = () => {
    openModal('clientForm', {});
  };

  const handleEditClient = (client: Client) => {
    openModal('clientForm', { clientToEdit: client });
  };

  const handleAddInvoice = (client: Client) => {
    openModal('invoiceForm', { client_id: client.id, client });
  };

  // ADD THIS HANDLER
  const handleAddTaskToClient = (client: Client) => {
    openModal('taskForm', { client: client });
  };

  // const handleViewReceivables = (client: Client) => {
  //   navigate(`/clients/${client.id}?mode=receivables&filter=unpaid`);
  // };

  // --- MODIFIED: Export handlers ---
  const handleExportToExcel = () => {
    if (allClients.length > 0) {
      const clientsWithBalance = allClients.map(client => ({
        ...client,
        // Ensure balance field matches what's displayed in table (total_outstanding)
        balance: (client.total_outstanding || 0),
      }));

      const summary = {
        total_clients: allClients.length,
        // Use total_outstanding (DUE amount) to match what's displayed in table
        total_receivables: allClients.reduce((sum, c) => sum + (c.total_outstanding || 0), 0),
        total_paid: allClients.reduce((sum, c) => sum + (c.total_paid || 0), 0),
        net_balance: allClients.reduce((sum, c) => sum + (c.total_outstanding || 0), 0),
      };
      
      exportMutation.mutate({ clients: clientsWithBalance, summary });
    }
  };

  const handlePrint = () => {
    // This can be implemented later by creating a PrintGenerator
    showToast({ type: 'info', title: 'قيد التطوير', message: 'ميزة الطباعة ستكون متاحة قريباً.'});
  };


  return (
    <div>
      {/* Compact header with add button next to title */}
      <div className="flex justify-between items-center mb-3 py-2">
        {/* Title and Add Button */}
        <div className="flex items-center gap-3">
          <h5 className="mb-0 text-primary font-bold text-xl">{t('clients.title')}</h5>
          
          <Button onClick={handleAddClient} size="sm" className="hover:scale-105 transition-transform">
            <PlusCircle size={16} className="me-1" />
            {t('clients.addNew')}
          </Button>
        </div>
        
        {/* Search and Export */}
        <div className="flex items-center gap-2">
          {/* Compact Search */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-black hover:text-foreground transition-colors p-0 bg-transparent border-0 cursor-pointer"
                onClick={() => setSearch('')}
                title="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Region Filter */}
          <div className="min-w-[150px]">
            <RegionSelect
              value={regionFilter}
              onChange={setRegionFilter}
              placeholder="كل المناطق"
              allowCreate={false}
              className="mb-0"
            />
          </div>
          
          {/* Export Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={handleExportToExcel}
              isLoading={exportMutation.isPending}
              title="تصدير إلى Excel"
              className="hover:bg-primary/10 hover:text-primary transition-all"
            >
              <FileSpreadsheet size={16} className="me-1" />
              Excel
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={handlePrint}
              title="طباعة"
              className="hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Printer size={16} className="me-1" />
              طباعة
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="p-0">
          <ClientsTable
            clients={allClients}
            isLoading={isLoading && !data}
            onEdit={handleEditClient}
            onAddTask={handleAddTaskToClient}
            onAddInvoice={handleAddInvoice}
          />
          
          {/* --- NEW: Load More Button & Intersection Observer --- */}
          <div ref={ref} className="text-center p-4 border-t border-border">
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
              <p className="text-black mb-0 text-sm">وصلت إلى نهاية القائمة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllClientsPage;