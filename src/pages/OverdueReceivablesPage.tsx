import { useEffect, useMemo } from 'react';
import { useGetFilteredReceivablesInfinite } from '../queries/receivableQueries';
import { applyPageBackground } from '../utils/backgroundUtils';
import FilteredReceivablesTable from '../components/receivables/FilteredReceivablesTable';
import { useReceivablesPermissions } from '../hooks/useReceivablesPermissions';
import { useInView } from 'react-intersection-observer';
import Button from '../components/ui/Button';

const OverdueReceivablesPage = () => {
  const { hasViewOverdueReceivablesPermission, isLoading: isPermissionsLoading } = useReceivablesPermissions();
  
  // Use infinite query for overdue receivables
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetFilteredReceivablesInfinite('overdue', hasViewOverdueReceivablesPermission);

  // Flatten the pages into a single array for rendering
  const allReceivables = useMemo(() => data?.pages.flatMap(page => page.receivables) || [], [data]);

  // Logic for infinite scroll
  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  // Apply receivables page background
  useEffect(() => {
    applyPageBackground('receivables');
  }, []);

  // Show permission denied message if user doesn't have access
  if (isPermissionsLoading) {
    return <div className="flex justify-center p-4">Loading permissions...</div>;
  }

  if (!hasViewOverdueReceivablesPermission) {
    return (
      <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4 text-center">
        <h4 className="text-lg font-bold text-black mb-2">Access Denied</h4>
        <p className="text-black">You don't have permission to view overdue receivables.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-3">
        <h1 style={{ 
          background: 'linear-gradient(135deg, #f55a3f 0%, #dc2626 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 'bold'
        }}>مستحقات متأخرة</h1>
      </header>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="p-0">
          <FilteredReceivablesTable
            receivables={allReceivables}
            isLoading={isLoading && !data}
            filterType="overdue"
          />
          
          {/* Load More Button & Intersection Observer */}
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
            {!hasNextPage && !isLoading && allReceivables.length > 0 && (
              <p className="text-black mb-0">وصلت إلى نهاية القائمة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverdueReceivablesPage;
