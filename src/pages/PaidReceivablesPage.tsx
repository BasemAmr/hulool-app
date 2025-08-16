import { useEffect } from 'react';
import { useGetFilteredReceivables } from '../queries/receivableQueries';
import { applyPageBackground } from '../utils/backgroundUtils';
import FilteredReceivablesTable from '../components/receivables/FilteredReceivablesTable';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';

const PaidReceivablesPage = () => {
  const { hasViewPaidReceivablesPermission, isLoading: isPermissionsLoading } = useReceivablesPermissions();
  const { data, isLoading } = useGetFilteredReceivables('paid', hasViewPaidReceivablesPermission);

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

  // Show permission denied message if user doesn't have access
  if (isPermissionsLoading) {
    return <div className="d-flex justify-content-center p-4">Loading permissions...</div>;
  }

  if (!hasViewPaidReceivablesPermission) {
    return (
      <div className="alert alert-warning text-center">
        <h4>Access Denied</h4>
        <p>You don't have permission to view paid receivables.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="d-flex justify-content-between align-items-center mb-3">
        <h1 style={{ 
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 'bold'
        }}>مستحقات مسددة</h1>
      </header>

      <div className="card">
        <div className="card-body p-0">
          <FilteredReceivablesTable
            receivables={data?.receivables || []}
            isLoading={isLoading}
            filterType="paid"
          />
        </div>
      </div>
    </div>
  );
};

export default PaidReceivablesPage;
