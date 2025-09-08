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

  const handleAddReceivable = (client: Client) => {
    openModal('manualReceivable', { client });
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
      <div className="d-flex justify-content-between align-items-center mb-1 py-1">
        {/* Title and Add Button */}
        <div className="d-flex align-items-center gap-2">
          <h5 className="mb-0" style={{ 
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            minWidth: 'fit-content',
            fontSize: '1.1rem'
          }}>{t('clients.title')}</h5>
          
          <Button onClick={handleAddClient} size="sm">
            <PlusCircle size={14} className="me-1" />
            {t('clients.addNew')}
          </Button>
        </div>
        
        {/* Search and Export */}
        <div className="d-flex align-items-center gap-2">
          {/* Compact Search */}
          <div className="position-relative" style={{ minWidth: '200px' }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '0.875rem' }}
            />
            {search && (
              <button
                type="button"
                className="btn btn-link position-absolute text-muted p-0"
                style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setSearch('')}
                title="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Region Filter */}
          <div style={{ minWidth: '150px' }}>
            <RegionSelect
              value={regionFilter}
              onChange={setRegionFilter}
              placeholder="كل المناطق"
              allowCreate={false}
              className="mb-0 form-control-sm"
            />
          </div>
          
          {/* Export Action Buttons */}
          <div className="d-flex gap-1">
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={handleExportToExcel}
              isLoading={exportMutation.isPending}
              title="تصدير إلى Excel"
            >
              <FileSpreadsheet size={14} className="me-1" />
              Excel
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={handlePrint}
              title="طباعة"
            >
              <Printer size={14} className="me-1" />
              طباعة
            </Button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <ClientsTable
            clients={allClients}
            isLoading={isLoading && !data}
            onEdit={handleEditClient}
            onAddTask={handleAddTaskToClient}
            onAddReceivable={handleAddReceivable}
          />
          
          {/* --- NEW: Load More Button & Intersection Observer --- */}
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

export default AllClientsPage;