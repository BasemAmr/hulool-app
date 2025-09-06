import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// import { useNavigate } from 'react-router-dom';
import { useGetClientsInfinite, /*useExportClients*/ } from '../queries/clientQueries';
import { useModalStore } from '../stores/modalStore';
import { /*useReceivablesPermissions */} from '../hooks/useReceivablesPermissions';
import { applyPageBackground } from '../utils/backgroundUtils';
import type { Client, ClientType } from '../api/types';
import ClientsTable from '../components/clients/ClientsTable';
import ClientSearch from '../components/clients/ClientSearch';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { PlusCircle, FileSpreadsheet, Printer } from 'lucide-react'; // Example icon
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
  const [typeFilter, setTypeFilter] = useState<ClientType | undefined>(undefined);

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
  } = useGetClientsInfinite(search, typeFilter);

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

  const typeOptions = [
    { value: '', label: t('clients.allTypes') },
    { value: 'Government', label: t('clients.types.government') },
    { value: 'RealEstate', label: t('clients.types.realEstate') },
    { value: 'Accounting', label: t('clients.types.accounting') },
    { value: 'Other', label: t('clients.types.other') },
  ];

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

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTypeFilter(value ? value as ClientType : undefined);
  };

  return (
    <div>
      {/* Compact single-row header: title - filter - search - buttons */}
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        {/* Title */}
        <h3 style={{ 
          background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 'bold',
          margin: 0,
          minWidth: 'fit-content'
        }}>{t('clients.title')}</h3>
        
        {/* Filter Dropdown */}
        <div style={{ minWidth: '180px' }}>
          <Select
            options={typeOptions}
            value={typeFilter || ''}
            onChange={handleTypeFilterChange}
            placeholder={t('clients.allTypes')}
          />
        </div>
        
        {/* Search Bar */}
        <div className="flex-grow-1" style={{ minWidth: '200px' }}>
          <ClientSearch
            value={search}
            onChange={setSearch}
          />
        </div>
        
        {/* Clear Filters Button */}
        {(search || typeFilter) && (
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => {
              setSearch('');
              setTypeFilter(undefined);
            }}
            title={t('common.clearFilters')}
          >
            {t('common.clearFilters')}
          </Button>
        )}
        
        {/* Action Buttons */}
        <div className="d-flex gap-2">
          {/* MODIFIED: Add isLoading state */}
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handleExportToExcel}
            isLoading={exportMutation.isPending}
            title="تصدير إلى Excel"
          >
            <FileSpreadsheet size={16} className="me-1" />
            Excel
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handlePrint}
            title="طباعة"
          >
            <Printer size={16} className="me-1" />
            طباعة
          </Button>
          <Button onClick={handleAddClient}>
            <PlusCircle size={18} className="me-2" />
            {t('clients.addNew')}
          </Button>
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