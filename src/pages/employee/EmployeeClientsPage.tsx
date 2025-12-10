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

  const handleAddInvoice = (client: Client) => {
    openModal('invoiceForm', { client_id: client.id, client });
  };

  if (error) {
    return (
      <div className="w-full p-3">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4" role="alert">
          <span className="text-destructive">خطأ في تحميل العملاء. يرجى المحاولة مرة أخرى.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-3">
      {/* Page Header with Search in Same Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold mb-1 text-black">عملائي</h1>
          <p className="text-black mb-0 text-sm">
            العملاء المرتبطين بمهامك
          </p>
        </div>
        <div>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <span className="px-3 py-2 bg-muted border-r border-border">
              <Search size={16} className="text-black" />
            </span>
            <input
              type="text"
              className="flex-1 px-3 py-2 text-sm border-0 focus:outline-none focus:ring-0"
              placeholder="البحث في العملاء..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{ backgroundColor: 'transparent' }}
            />
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div>
        <div className="rounded-lg border-0 bg-card shadow-sm">
          <div className="p-0">
            <ClientsTable
              clients={clients}
              isLoading={isLoading}
              onEdit={handleEditClient}
              onAddTask={handleAddTask}
              onAddInvoice={handleAddInvoice}
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
                  <div className="text-black text-sm">
                    عرض {clients.length} عميل
                  </div>
                )}
              </div>
            )}
            
            {/* Show total when no more data */}
            {!hasNextPage && clients.length > 0 && (
              <div className="text-center p-3 border-t border-border">
                <small className="text-black">
                  تم عرض جميع العملاء ({clients.length} عميل)
                </small>
              </div>
            )}
            
            {/* Empty state */}
            {!isLoading && clients.length === 0 && (
              <div className="text-center p-5">
                <h5 className="text-black mb-2 font-bold">لا يوجد عملاء</h5>
                <p className="text-black text-sm">
                  {searchTerm ? 'لا توجد نتائج للبحث المحدد.' : 'لا توجد عملاء مرتبطين بمهامك حالياً.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeClientsPage;
