import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetClientsReceivablesSummary } from '../queries/receivableQueries';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import ClientsReceivablesTable from '../components/receivables/ClientsReceivablesTable';
import Button from '../components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';

const ReceivablesPage = () => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);
  const { hasViewAllReceivablesPermission, isLoading: isPermissionsLoading } = useReceivablesPermissions();
  
  // Only fetch data if user has permission
  const { data, isLoading } = useGetClientsReceivablesSummary(hasViewAllReceivablesPermission);

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

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