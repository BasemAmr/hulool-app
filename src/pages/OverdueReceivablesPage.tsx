import { useEffect } from 'react';
import { useGetFilteredReceivables } from '../queries/receivableQueries';
import { applyPageBackground } from '../utils/backgroundUtils';
import FilteredReceivablesTable from '../components/receivables/FilteredReceivablesTable';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';

const OverdueReceivablesPage = () => {
  const { hasViewOverdueReceivablesPermission, isLoading: isPermissionsLoading } = useReceivablesPermissions();
  const { data, isLoading } = useGetFilteredReceivables('overdue', hasViewOverdueReceivablesPermission);

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

  // Show permission denied message if user doesn't have access
  if (isPermissionsLoading) {
    return <div className="d-flex justify-content-center p-4">Loading permissions...</div>;
  }

  if (!hasViewOverdueReceivablesPermission) {
    return (
      <div className="alert alert-warning text-center">
        <h4>Access Denied</h4>
        <p>You don't have permission to view overdue receivables.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="d-flex justify-content-between align-items-center mb-3">
        <h1 style={{ 
          background: 'linear-gradient(135deg, #f55a3f 0%, #dc2626 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 'bold'
        }}>مستحقات متأخرة</h1>
      </header>

      <div className="card">
        <div className="card-body p-0">
          <FilteredReceivablesTable
            receivables={data?.receivables || []}
            isLoading={isLoading}
            filterType="overdue"
          />
        </div>
      </div>
    </div>
  );
};

export default OverdueReceivablesPage;
