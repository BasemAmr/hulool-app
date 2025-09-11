import React from 'react';
import { Link } from 'react-router-dom';
import { Edit, Plus, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import { useModalStore } from '../../stores/modalStore';
import { useGetEmployeeClients } from '../../queries/employeeQueries';
import { useStickyHeader } from '../../hooks/useStickyHeader';
import WhatsAppIcon from '../../assets/images/whats.svg';
import type { Client } from '../../api/types';

interface EmployeeClient {
  id: number;
  name: string;
  phone: string;
  region_id: number;
  region_name?: string | null;
  google_drive_link: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tasks_count: number;
  total_receivables: number;
  total_paid: number;
  total_outstanding: number;
  recent_tasks: any[];
}

interface EmployeeClientsTableProps {
  employeeId: number;
  page: number;
  perPage: number;
}

const EmployeeClientsTable: React.FC<EmployeeClientsTableProps> = ({
  employeeId,
  page,
  perPage,
}) => {
  const { openModal } = useModalStore();
  const { sentinelRef, isSticky } = useStickyHeader();

  // Fetch employee clients
  const { 
    data: clientsData, 
    isLoading 
  } = useGetEmployeeClients(employeeId, { page, per_page: perPage });

  const clients = clientsData?.data?.clients || [];

  const handleEdit = (client: EmployeeClient) => {
    const clientForModal: Client = {
      id: client.id,
      name: client.name,
      phone: client.phone,
      region_id: client.region_id,
      region_name: client.region_name,
      google_drive_link: client.google_drive_link,
      notes: client.notes,
      created_at: client.created_at,
      updated_at: client.updated_at,
      total_outstanding: client.total_outstanding,
      tasks_count: {},
    };
    openModal('clientForm', { clientToEdit: clientForModal });
  };

  const handleAddTask = (client: EmployeeClient) => {
    const clientForModal: Client = {
      id: client.id,
      name: client.name,
      phone: client.phone,
      region_id: client.region_id,
      region_name: client.region_name,
      google_drive_link: client.google_drive_link,
      notes: client.notes,
      created_at: client.created_at,
      updated_at: client.updated_at,
      total_outstanding: client.total_outstanding,
      tasks_count: {},
    };
    openModal('taskForm', { client: clientForModal });
  };

  const handleAddReceivable = (client: EmployeeClient) => {
    const clientForModal: Client = {
      id: client.id,
      name: client.name,
      phone: client.phone,
      region_id: client.region_id,
      region_name: client.region_name,
      google_drive_link: client.google_drive_link,
      notes: client.notes,
      created_at: client.created_at,
      updated_at: client.updated_at,
      total_outstanding: client.total_outstanding,
      tasks_count: {},
    };
    openModal('manualReceivable', { client: clientForModal });
  };

  const getRegionBadgeClass = (regionName: string | null) => {
    if (!regionName) return 'bg-secondary';
    
    // Generate a consistent color based on region name
    const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger', 'bg-dark'];
    const hash = regionName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove any non-digit characters and ensure it starts with +966
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('966')) {
      return `+${cleanPhone}`;
    } else if (cleanPhone.startsWith('0')) {
      return `+966${cleanPhone.substring(1)}`;
    } else {
      return `+966${cleanPhone}`;
    }
  };

  const handleWhatsAppClick = (phone: string) => {
    const whatsappPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${whatsappPhone.replace('+', '')}`, '_blank');
  };

  const handleGoogleDriveClick = (url: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return <div className="p-4 text-center">جاري تحميل العملاء...</div>;
  }

  if (clients.length === 0) {
    return <div className="p-4 text-center text-muted">لا يوجد عملاء لهذا الموظف.</div>;
  }

  return (
    <div className="table-responsive">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef}></div>
      
      <table className="table table-hover mb-0">
        <thead className={isSticky ? 'is-sticky' : ''}>
          <tr>
            <th>العميل</th>
            <th>الهاتف</th>
            <th>المنطقة</th>
            <th>الملاحظات</th>
            <th className="text-center">المستحق</th>
            <th className="text-end">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client: EmployeeClient) => (
            <ClientRow
              key={client.id}
              client={client}
              onEdit={handleEdit}
              onAddTask={handleAddTask}
              onAddReceivable={handleAddReceivable}
              onWhatsAppClick={handleWhatsAppClick}
              onGoogleDriveClick={handleGoogleDriveClick}
              getRegionBadgeClass={getRegionBadgeClass}
            />
          ))}
        </tbody>
      </table>
    </div>

  );
};

interface ClientRowProps {
  client: EmployeeClient;
  onEdit: (client: EmployeeClient) => void;
  onAddTask: (client: EmployeeClient) => void;
  onAddReceivable: (client: EmployeeClient) => void;
  onWhatsAppClick: (phone: string) => void;
  onGoogleDriveClick: (url: string) => void;
  getRegionBadgeClass: (regionName: string | null) => string;
}

const ClientRow: React.FC<ClientRowProps> = ({
  client,
  onEdit,
  onAddTask,
  onAddReceivable,
  onWhatsAppClick,
  onGoogleDriveClick,
  getRegionBadgeClass,
}) => {
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onWhatsAppClick(client.phone);
  };

  const handleGoogleDriveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (client.google_drive_link) {
      onGoogleDriveClick(client.google_drive_link);
    }
  };

  return (
    <tr>
      <td className="ps-2" style={{ paddingRight: '16px' }}>
        <Link to={`/clients/${client.id}`} className="text-decoration-none text-dark fw-bold link-hover">
          {client.name}
        </Link>
      </td>
      <td>
        <div className="d-flex align-items-center gap-2">
          <span>{client.phone}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleWhatsAppClick}
            title="إرسال رسالة واتساب"
            className="p-1 border-0"
          >
            <img
              src={WhatsAppIcon}
              alt="WhatsApp"
              width="16"
              height="16"
            />
          </Button>
        </div>
      </td>
      <td>
        {client.region_name ? (
          <span className={`badge ${getRegionBadgeClass(client.region_name)} text-white`}>
            {client.region_name}
          </span>
        ) : (
          <span className="text-muted">-</span>
        )}
      </td>
      <td>
        <span className="text-muted small">
          {client.notes ? client.notes.substring(0, 50) + (client.notes.length > 50 ? '...' : '') : '-'}
        </span>
      </td>
      <td className="text-center">
        <span className={`fw-semibold ${client.total_outstanding && client.total_outstanding > 0 ? 'text-danger' : 'text-muted'}`}>
          {Number(client.total_outstanding || 0).toFixed(2)}
        </span>
      </td>
      <td className="text-end">
        <div className="d-flex align-items-center justify-content-start gap-1">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => onAddReceivable(client)}
            title="إضافة مستحق"
          >
            <Plus size={16} />
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => onAddTask(client)}
            title="إضافة مهمة"
          >
            <Plus size={16} />
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => onEdit(client)}
            title="تعديل"
          >
            <Edit size={16} />
          </Button>
          {client.google_drive_link && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleGoogleDriveClick}
              title="فتح الدرايف"
            >
              <ExternalLink size={16} />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default EmployeeClientsTable;
