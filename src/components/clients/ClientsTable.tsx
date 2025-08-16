import type { Client } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { Edit, Plus, ExternalLink, MessageCircle } from 'lucide-react'; // Example icons

interface ClientsTableProps {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onAddTask: (client: Client) => void;
  onViewReceivables: (client: Client) => void;
  canViewReceivables?: boolean;
}

const ClientsTable = ({ clients, isLoading, onEdit, onAddTask, onViewReceivables, canViewReceivables = true }: ClientsTableProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="p-4 text-center">Loading clients...</div>; // Replace with a Spinner component later
  }

  if (clients.length === 0) {
    return <div className="p-4 text-center text-muted">{t('common.noResults')}</div>;
  }

  // Sort clients by newest first (created_at descending)
  const sortedClients = [...clients].sort((a, b) => {
    const dateA = new Date(a.created_at || '').getTime();
    const dateB = new Date(b.created_at || '').getTime();
    return dateB - dateA; // Newest first
  });

  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead>
          <tr>
            <th>{t('clients.tableHeaderName')}</th>
            <th>{t('clients.tableHeaderPhone')}</th>
            <th>{t('clients.tableHeaderType')}</th>
            <th className="text-end">{t('clients.tableHeaderActions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedClients.map((client) => (
            <ClientRow 
              key={client.id} 
              client={client} 
              onEdit={onEdit}
              onAddTask={onAddTask}
              onViewReceivables={onViewReceivables}
              canViewReceivables={canViewReceivables}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ClientRowProps {
  client: Client;
  onEdit: (client: Client) => void;
  onAddTask: (client: Client) => void;
  onViewReceivables: (client: Client) => void;
  canViewReceivables: boolean;
}

const ClientRow = ({ client, onEdit, onAddTask, onViewReceivables, canViewReceivables }: ClientRowProps) => {
  const { t } = useTranslation();
  // Remove the individual query to improve performance
  // const { data: unpaidAmounts } = useGetClientUnpaidAmounts(client.id);

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      Government: t('clients.types.government'),
      RealEstate: t('clients.types.realEstate'),
      Accounting: t('clients.types.accounting'),
      Other: t('clients.types.other')
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getTypeBadgeClass = (type: string) => {
    const badgeClasses = {
      Government: 'bg-primary',
      RealEstate: 'bg-success',
      Accounting: 'bg-warning',
      Other: 'bg-secondary'
    };
    return badgeClasses[type as keyof typeof badgeClasses] || 'bg-secondary';
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

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const whatsappPhone = formatPhoneForWhatsApp(client.phone);
    window.open(`https://wa.me/${whatsappPhone.replace('+', '')}`, '_blank');
  };

  const handleGoogleDriveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(client.google_drive_link, '_blank');
  };

  const handleUnpaidAmountsClick = () => {
    onViewReceivables(client);
  };

  return (
    <tr>
      <td>
        <Link to={`/clients/${client.id}`} className="text-decoration-none">
          {client.name}
        </Link>
      </td>
      <td>
        <div className="d-flex align-items-center gap-2">
          <span>{client.phone}</span>
          <button
            onClick={handleWhatsAppClick}
            className="btn btn-link p-0 text-success"
            title="Open WhatsApp"
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </td>
      <td>
        <span className={`badge ${getTypeBadgeClass(client.type)} text-white`}>
          {getTypeLabel(client.type)}
        </span>
      </td>
      <td className="text-end">
        <div className="d-flex align-items-center justify-content-between gap-1">
          <div className="d-flex align-items-center justify-content-center">
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => onAddTask(client)} 
            title={t('tasks.addNew')}
          >
            <Plus size={16} />
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => onEdit(client)} 
            title={t('common.edit')}
          >
            <Edit size={16} />
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={handleGoogleDriveClick} 
            title="Open Google Drive"
          >
            <ExternalLink size={16} />
          </Button>
          </div>
          {canViewReceivables && (
            client.total_outstanding && client.total_outstanding > 0 ? (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleUnpaidAmountsClick}
                title={`إجمالي المستحقات: ${Number(client.total_outstanding).toFixed(2)}`}
              >
                إجمالي المستحقات: {Number(client.total_outstanding).toFixed(2)}
              </Button>
            ) : (
              <Button 
                variant="secondary" 
                size="sm" 
                disabled
                title={t('clients.noOutstanding')}
              >
                {t('clients.noOutstanding')}
              </Button>
            )
          )}
        </div>
      </td>
    </tr>
  );
};

export default ClientsTable;