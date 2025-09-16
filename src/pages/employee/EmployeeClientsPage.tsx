import React, { useState, useEffect, useMemo } from 'react';
import { applyPageBackground } from '../../utils/backgroundUtils';
import { useGetEmployeeClientsInfinite } from '../../queries/employeeClientsQueries';
import { useModalStore } from '../../stores/modalStore';
import ClientsTable from '../../components/clients/ClientsTable';
import type { Client } from '../../api/types';
import { Search } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

/**
 * EmployeeClientsPage - Clients accessible to current employee
 * 
 * Features:
 * - View clients with infinite scroll
 * - Search clients
 * - Edit client details
 * - Add tasks for clients
 * - Add receivables for clients
 * - WhatsApp integration
 */
const EmployeeClientsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { openModal } = useModalStore();

  useEffect(() => {
    applyPageBackground('employee-clients');
  }, []);

  // Fetch employee's accessible clients with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetEmployeeClientsInfinite({
    search: searchTerm,
    per_page: 20,
  });

  // Flatten the pages into a single array for rendering
  const clients = useMemo(() => data?.pages.flatMap(page => page.clients) || [], [data]);

  // Intersection observer for infinite scroll
  const { ref } = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handler functions for client actions
  const handleEditClient = (client: Client) => {
    openModal('clientForm', { clientToEdit: client });
  };

  const handleAddTask = (client: Client) => {
    openModal('taskForm', { client });
  };

  const handleAddReceivable = (client: Client) => {
    openModal('manualReceivable', { client });
  };

  if (error) {
    return (
      <div className="container-fluid p-3">
        <div className="alert alert-danger" role="alert">
          خطأ في تحميل العملاء. يرجى المحاولة مرة أخرى.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-3">
      {/* Page Header with Search in Same Row */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div>
            <h1 className="h3 mb-1">عملائي</h1>
            <p className="text-muted mb-0" style={{ fontSize: 'var(--font-size-sm)' }}>
              العملاء المرتبطين بمهامك
            </p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light border-end-0">
              <Search size={16} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="البحث في العملاء..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{ 
                backgroundColor: 'transparent',
                fontSize: 'var(--font-size-sm)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <ClientsTable
                clients={clients}
                isLoading={isLoading}
                onEdit={handleEditClient}
                onAddTask={handleAddTask}
                onAddReceivable={handleAddReceivable}
                linkBasePath="/employee/clients"
              />
              
              {/* Infinite scroll trigger */}
              {(hasNextPage || isFetchingNextPage) && (
                <div ref={ref} className="text-center p-3">
                  {isFetchingNextPage ? (
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">جاري تحميل المزيد...</span>
                    </div>
                  ) : (
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                      عرض {clients.length} عميل
                    </div>
                  )}
                </div>
              )}
              
              {/* Show total when no more data */}
              {!hasNextPage && clients.length > 0 && (
                <div className="text-center p-3 border-top">
                  <small className="text-muted">
                    تم عرض جميع العملاء ({clients.length} عميل)
                  </small>
                </div>
              )}
              
              {/* Empty state */}
              {!isLoading && clients.length === 0 && (
                <div className="text-center p-5">
                  <h5 className="text-muted mb-2">لا يوجد عملاء</h5>
                  <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {searchTerm ? 'لا توجد نتائج للبحث المحدد.' : 'لا توجد عملاء مرتبطين بمهامك حالياً.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeClientsPage;
