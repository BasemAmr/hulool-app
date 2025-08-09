import { useEffect } from 'react';
import { useGetFilteredReceivables } from '../queries/receivableQueries';
import { applyPageBackground } from '../utils/backgroundUtils';
import FilteredReceivablesTable from '../components/receivables/FilteredReceivablesTable';

const OverdueReceivablesPage = () => {
  const { data, isLoading } = useGetFilteredReceivables('overdue');

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

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
