import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetClientsReceivablesSummary } from '../queries/receivableQueries';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import ClientsReceivablesTable from '../components/receivables/ClientsReceivablesTable';
import Button from '../components/ui/Button';
import { PlusCircle } from 'lucide-react';

const ReceivablesPage = () => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const { data, isLoading } = useGetClientsReceivablesSummary();

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

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
        <Button onClick={() => openModal('manualReceivable', {})}>
          <PlusCircle size={18} className="me-2" />
          {t('receivables.addNewManual')}
        </Button>
      </header>

      {/* Summary Cards can be added here later */}
      <div className="card">
        <div className="card-body p-0">
          <ClientsReceivablesTable
            clients={data?.clients || []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default ReceivablesPage;