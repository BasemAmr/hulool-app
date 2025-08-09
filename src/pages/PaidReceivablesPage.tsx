import { useEffect } from 'react';
import { useGetFilteredReceivables } from '../queries/receivableQueries';
import { applyPageBackground } from '../utils/backgroundUtils';
import FilteredReceivablesTable from '../components/receivables/FilteredReceivablesTable';

const PaidReceivablesPage = () => {
  const { data, isLoading } = useGetFilteredReceivables('paid');

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

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
