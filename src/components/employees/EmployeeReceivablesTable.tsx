import React from 'react';
import { CreditCard, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../ui/table';
import { useModalStore } from '../../stores/modalStore';
import { useGetEmployeeReceivablesSummary, useGetEmployeeReceivablesTotals } from '../../queries/employeeQueries';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { sendPaymentReminder, formatPhoneForWhatsApp } from '../../utils/whatsappUtils';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import type { EmployeeReceivablesClient } from '../../api/types';

interface EmployeeReceivablesTableProps {
  employeeId: number;
  page: number;
  perPage: number;
}

const EmployeeReceivablesTable: React.FC<EmployeeReceivablesTableProps> = ({
  employeeId,
  page,
  perPage,
}) => {
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const { sentinelRef, isSticky } = useStickyHeader();

  // Fetch employee receivables summary
  const { 
    data: receivablesData, 
    isLoading 
  } = useGetEmployeeReceivablesSummary(employeeId, { page, per_page: perPage });

  // Fetch totals for the footer
  const { 
    data: totalsData, 
    isLoading: isTotalsLoading 
  } = useGetEmployeeReceivablesTotals(employeeId);

  const clients = receivablesData?.data?.clients || [];

  const handlePayment = (clientId: number) => {
    openModal('selectReceivableForPayment', {
      clientId,
      receivables: []
    });
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}?mode=receivables`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleWhatsAppPaymentReminder = (phone: string, clientName: string, remainingAmount: number) => {
    const formattedAmount = formatCurrency(remainingAmount);
    sendPaymentReminder(phone, clientName, formattedAmount);
  };

  const formatCurrency = (amount: number) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '200px' }}>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status">
          <span className="sr-only">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  // Filter out clients with zero outstanding amounts
  const filteredClients = clients.filter((client: EmployeeReceivablesClient) => 
    (Number(client.total_outstanding) || 0) > 0
  );

  if (!clients || clients.length === 0 || filteredClients.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-black">لا يوجد عملاء لديهم مستحقات لهذا الموظف</p>
      </div>
    );
  }

  // Use totals from API
  const displayTotals = totalsData?.data ? {
    totalAmount: totalsData.data.total_amount,
    paidAmount: totalsData.data.total_paid,
    remainingAmount: totalsData.data.total_unpaid,
  } : {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  };

  // Sort clients by newest first
  const sortedClients = [...filteredClients].sort((a, b) => {
    return parseInt(b.id) - parseInt(a.id);
  });

  return (
    <div className="overflow-x-auto" dir="rtl">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <Table>
        <TableHeader className={isSticky ? 'sticky top-0 z-10' : ''} style={{ backgroundColor: 'var(--color-primary)' }}>
          <TableRow>
            <TableHead className="text-right text-white font-bold" style={{ width: '18%', padding: '12px 8px' }}>العميل</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '12%', padding: '12px 8px' }}>رقم الجوال</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '20%', padding: '12px 8px' }}>إجمالي المدين</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '20%', padding: '12px 8px' }}>إجمالي الدائن</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '20%', padding: '12px 8px' }}>إجمالي المستحقات</TableHead>
            <TableHead className="text-center text-white font-bold" style={{ width: '15%', padding: '12px 8px' }}>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="text-right" style={{ padding: '12px 8px' }}>
                <div
                  className="font-bold text-primary cursor-pointer hover:underline"
                  onClick={() => handleClientClick(parseInt(client.id))}
                  style={{ cursor: 'pointer' }}
                >
                  {client.name}
                </div>
              </TableCell>
              <TableCell className="text-center" style={{ padding: '12px 8px' }}>
                <div className="text-sm flex items-center justify-center gap-1">
                  <button
                    className="text-green-600 hover:text-green-700 transition-colors p-0 border-0 bg-transparent"
                    onClick={() => handleWhatsApp(client.phone)}
                    title="WhatsApp"
                    style={{ fontSize: '12px' }}
                  >
                    <WhatsAppIcon size={12} />
                  </button>
                  <span className="text-black">{client.phone}</span>
                </div>
              </TableCell>
              <TableCell className="text-center font-bold text-black" style={{ padding: '12px 8px' }}>
                {formatCurrency(Number(client.total_receivables) || 0)}
              </TableCell>
              <TableCell className="text-center font-bold text-green-600" style={{ padding: '12px 8px' }}>
                {formatCurrency(Number(client.total_paid) || 0)}
              </TableCell>
              <TableCell className="text-center font-bold text-red-600" style={{ padding: '12px 8px' }}>
                {formatCurrency(Math.max(0, Number(client.total_outstanding) || 0))}
              </TableCell>
              <TableCell className="text-center" style={{ padding: '12px 8px' }}>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openModal('clientReceivablesEdit', { clientId: parseInt(client.id) })}
                    title="تعديل المستحقات"
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => handleWhatsAppPaymentReminder(client.phone, client.name, Number(client.total_outstanding))}
                    disabled={Number(client.total_outstanding) <= 0}
                    title="إرسال تذكير دفع عبر واتساب"
                  >
                    <WhatsAppIcon size={14} />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePayment(parseInt(client.id))}
                    disabled={Number(client.total_outstanding) <= 0}
                  >
                    <CreditCard size={14} className="mr-1" />
                    سداد
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter style={{ backgroundColor: 'var(--color-primary)' }}>
          <TableRow>
            <TableCell className="text-start text-white font-bold" style={{ padding: '12px 8px' }}>الإجمالي</TableCell>
            <TableCell className="text-start text-white" style={{ padding: '12px 8px' }}></TableCell>
            <TableCell className="text-center text-white font-bold" style={{ padding: '12px 8px' }}>
              {isTotalsLoading ? (
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" role="status">
                  <span className="sr-only">جاري التحميل...</span>
                </div>
              ) : (
                formatCurrency(displayTotals.totalAmount)
              )}
            </TableCell>
            <TableCell className="text-center text-white font-bold" style={{ padding: '12px 8px' }}>
              {isTotalsLoading ? (
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" role="status">
                  <span className="sr-only">جاري التحميل...</span>
                </div>
              ) : (
                formatCurrency(displayTotals.paidAmount)
              )}
            </TableCell>
            <TableCell className="text-center text-white font-bold" style={{ padding: '12px 8px' }}>
              {isTotalsLoading ? (
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" role="status">
                  <span className="sr-only">جاري التحميل...</span>
                </div>
              ) : (
                formatCurrency(displayTotals.remainingAmount)
              )}
            </TableCell>
            <TableCell className="text-white" style={{ padding: '12px 8px' }}></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>

  );
};

export default EmployeeReceivablesTable;
