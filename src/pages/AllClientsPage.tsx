import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGetClients, /*useExportClients*/ } from '../queries/clientQueries';
import { useModalStore } from '../stores/modalStore';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';
import { applyPageBackground } from '../utils/backgroundUtils';
import type { Client, ClientType } from '../api/types';
import ClientsTable from '../components/clients/ClientsTable';
import ClientSearch from '../components/clients/ClientSearch';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { PlusCircle, FileSpreadsheet, Printer } from 'lucide-react'; // Example icon
import { exportClientsToExcel, printClientsReport } from '../components/clients/clientExportUtils';

const AllClientsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);
  const { hasAnyReceivablesPermission } = useReceivablesPermissions();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | undefined>(undefined);

  // Apply clients page background
  useEffect(() => {
    applyPageBackground('clients');
  }, []);

  const { data, isLoading } = useGetClients(search, typeFilter);
  // const exportMutation = useExportClients();

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

  // ADD THIS HANDLER
  const handleAddTaskToClient = (client: Client) => {
    openModal('taskForm', { client: client });
  };

  const handleViewReceivables = (client: Client) => {
    navigate(`/clients/${client.id}?mode=receivables&filter=unpaid`);
  };

  // Export handlers
  const handleExportToExcel = () => {
    if (data?.clients) {
      exportClientsToExcel(data.clients);
    }
  };

  // const handleExportToPDF = () => {
  //   if (data?.clients) {
  //     exportClientsToPDF(data.clients);
  //   }
  // };

  const handlePrint = () => {
    if (data?.clients) {
      printClientsReport(data.clients);
    }
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
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handleExportToExcel}
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
            clients={data?.clients || []}
            isLoading={isLoading}
            onEdit={handleEditClient}
            onAddTask={handleAddTaskToClient}
            onViewReceivables={handleViewReceivables}
            canViewReceivables={hasAnyReceivablesPermission}
          />
          {/* Pagination component will go here later */}
        </div>
      </div>
    </div>
  );
};

export default AllClientsPage;