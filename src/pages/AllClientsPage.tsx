import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGetClients } from '../queries/clientQueries';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import type { Client } from '../api/types';
import ClientsTable from '../components/clients/ClientsTable';
import ClientSearch from '../components/clients/ClientSearch';
import Button from '../components/ui/Button';
import { PlusCircle, FileSpreadsheet, Printer } from 'lucide-react'; // Example icon
import { exportClientsToExcel, printClientsReport } from '../components/clients/clientExportUtils';

const AllClientsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);

  const [search, setSearch] = useState('');

  // Apply clients page background
  useEffect(() => {
    applyPageBackground('clients');
  }, []);

  const { data, isLoading } = useGetClients(search);

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

  return (
    <div>
      <header className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <h3 style={{ 
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            margin: 0
          }}>{t('clients.title')}</h3>
          <ClientSearch
            value={search}
            onChange={setSearch}
            className="ms-auto"
          />
        </div>
        <div className="d-flex gap-2">
          {/* Export buttons */}
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handleExportToExcel}
            title="تصدير إلى Excel"
          >
            <FileSpreadsheet size={16} className="me-1" />
            Excel
          </Button>
          {/* <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handleExportToPDF}
            title="تصدير إلى PDF"
          >
            <FileText size={16} className="me-1" />
            PDF
          </Button> */}
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
      </header>

      <div className="card">
        <div className="card-body p-0">
          <ClientsTable
            clients={data?.clients || []}
            isLoading={isLoading}
            onEdit={handleEditClient}
            onAddTask={handleAddTaskToClient}
            onViewReceivables={handleViewReceivables}
          />
          {/* Pagination component will go here later */}
        </div>
      </div>
    </div>
  );
};

export default AllClientsPage;