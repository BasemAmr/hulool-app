import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useGetEmployeeNotificationsInfinite } from '../../queries/employeeNotificationQueries';
import EmployeeNotificationsHeader from '../../components/employee/EmployeeNotificationsHeader';
import EmployeeNotificationsStats from '../../components/employee/EmployeeNotificationsStats';
import EmployeeNotificationsTable from '../../components/employee/EmployeeNotificationsTable';


const EmployeeNotificationsPage = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useGetEmployeeNotificationsInfinite();

  useEffect(() => {
    applyPageBackground('employee-notifications');
  }, []);

  // Flatten all notifications from all pages
  const allNotifications = data?.pages.flatMap(page => page.data.notifications) || [];
  const totalCount = data?.pages[0]?.data.pagination.total_items || 0;

  // Auto-load more when scrolling near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isError) {
    return (
      <div className="container-fluid p-4">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger text-center">
              <h5>خطأ في تحميل الإشعارات</h5>
              <p className="mb-3">{error?.message || 'حدث خطأ غير متوقع'}</p>
              <button className="btn btn-outline-danger" onClick={() => refetch()}>
                <RefreshCw size={16} className="me-2" />
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4" dir="rtl">
      {/* Header */}
      <EmployeeNotificationsHeader 
        notifications={allNotifications}
        totalCount={totalCount}
        isLoading={isLoading}
      />

      {/* Stats */}
      <EmployeeNotificationsStats notifications={allNotifications} />

      {/* Notifications Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <EmployeeNotificationsTable 
                notifications={allNotifications}
                isLoading={isLoading}
              />
              
              {/* Load More / Loading Indicator */}
              {isFetchingNextPage && (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">جاري تحميل المزيد...</span>
                  </div>
                </div>
              )}
              
              {hasNextPage && !isFetchingNextPage && (
                <div className="text-center p-4">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => fetchNextPage()}
                  >
                    تحميل المزيد من الإشعارات
                  </button>
                </div>
              )}
              
              {!hasNextPage && allNotifications.length > 0 && (
                <div className="text-center p-4 text-muted">
                  <small>تم عرض جميع الإشعارات</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeNotificationsPage;
