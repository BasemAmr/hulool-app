import { MessageSquare, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';

interface ClientReceivablesSummary {
  client_id: number;
  client_name: string;
  client_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  receivables_count: number;
}

interface ClientsReceivablesTableProps {
  clients: ClientReceivablesSummary[];
  isLoading: boolean;
}

const ClientsReceivablesTable = ({ clients, isLoading }: ClientsReceivablesTableProps) => {
  const navigate = useNavigate();
  const openModal = useModalStore((state) => state.openModal);

  const handlePayment = (clientId: number) => {
    // Open the modal to select specific receivable for payment
    openModal('selectReceivableForPayment', {
      clientId,
      receivables: [] // Will be loaded in the modal
    });
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}?mode=receivables`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.startsWith('+') ? phone : `+966${phone}`;
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    // Ensure amount is a valid number
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Filter out clients with zero outstanding amounts
  const filteredClients = clients.filter(client => 
    (Number(client.remaining_amount) || 0) > 0
  );

  if (!clients || clients.length === 0 || filteredClients.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <p>
          لا يوجد عملاء لديهم مستحقات
        </p>
      </div>
    );
  }

  // Calculate totals based on filtered clients
  const totals = filteredClients.reduce(
    (acc, client) => {
      console.log('Calculating totals for client:', client.client_name);
      console.log('Client amounts:', {
        totalAmount: Number(client.total_amount) || 0,
        paidAmount: Number(client.paid_amount) || 0,
        remainingAmount: Number(client.remaining_amount) || 0,
      });
      const debit = Math.abs(Number(client.total_amount) || 0)
      const credit = Math.abs(Number(client.paid_amount) || 0)
      const remaining = debit > credit ? Number(client.remaining_amount) || 0 : 0
      return {
        totalAmount: acc.totalAmount + debit,
        paidAmount: acc.paidAmount + credit,
        remainingAmount: acc.remainingAmount + remaining,
      };
    },
    { totalAmount: 0, paidAmount: 0, remainingAmount: 0 }
  );
console.log('Total amounts:', totals);


  // Sort clients by newest first (assuming client_id represents creation order)
  const sortedClients = [...filteredClients].sort((a, b) => {
    return b.client_id - a.client_id; // Newest first (higher IDs are newer)
  });

  return (
    <div className="table-responsive" dir="rtl">
      <table className="table table-hover align-middle">
        <thead className="table-warning">
          <tr className="fw-bold">
            <th scope="col" className="text-center" style={{ width: '18%', color: '#000' }}>العميل</th>
            <th scope="col" className="text-center" style={{ width: '12%', color: '#000' }}>رقم الجوال</th>
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000' }}>إجمالي المدين</th>
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000' }}>إجمالي الدائن</th>
            <th scope="col" className="text-center" style={{ width: '20%', color: '#000' }}>إجمالي المستحقات</th>
            <th scope="col" className="text-center" style={{ width: '15%', color: '#000' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sortedClients.map((client) => (
            <tr key={client.client_id}>
              <td className="text-center">
                <div
                  className="fw-bold text-primary cursor-pointer"
                  onClick={() => handleClientClick(client.client_id)}
                  style={{ cursor: 'pointer' }}
                >
                  {client.client_name}
                </div>
              </td>
              <td className="text-center">
                <div className="text-muted small d-flex align-items-center justify-content-end">
                  <button
                    className="btn btn-link btn-sm p-0 text-success ms-1"
                    onClick={() => handleWhatsApp(client.client_phone)}
                    title="WhatsApp"
                    style={{ fontSize: '12px' }}
                  >
                    <MessageSquare size={12} />
                  </button>
                  <span>{client.client_phone}</span>
                </div>
              </td>
              <td className="text-center fw-bold text-danger">
                {formatCurrency(Number(client.total_amount) || 0)}
              </td>
              <td className="text-center fw-bold text-success">
                {formatCurrency(Number(client.paid_amount) || 0)}
              </td>
              <td className="text-center fw-bold text-primary">
                {formatCurrency(Math.max(0, Number(client.remaining_amount) || 0))}
              </td>
              <td className="text-center">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePayment(client.client_id)}
                  disabled={Number(client.remaining_amount) <= 0}
                >
                  <CreditCard size={14} className="me-1" />
                  سداد
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="table-warning">
          <tr className="fw-bold">
            <td className="text-start">الإجمالي</td>
            <td className="text-start"></td>
            <td className="text-center text-danger">
              {formatCurrency(totals.totalAmount)}
            </td>
            <td className="text-center text-success">
              {formatCurrency(totals.paidAmount)}
            </td>
            <td className="text-center text-primary">
              {formatCurrency(totals.remainingAmount)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ClientsReceivablesTable;