import type { Client } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { Edit, Plus, ExternalLink } from 'lucide-react'; // Example icons
import WhatsAppIcon from '../../assets/images/whats.svg';
import { useStickyHeader } from '../../hooks/useStickyHeader';

interface ClientsTableProps {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onAddTask: (client: Client) => void;
  onAddReceivable: (client: Client) => void;
  linkBasePath?: string; // New prop for custom link base path
}

const ClientsTable = ({ clients, isLoading, onEdit, onAddTask, onAddReceivable, linkBasePath = '/clients'}: ClientsTableProps) => {
  const { t } = useTranslation();
  const { sentinelRef, isSticky } = useStickyHeader();

  if (isLoading) {
    return <div className="p-4 text-center">Loading clients...</div>; // Replace with a Spinner component later
  }

  if (clients.length === 0) {
    return <div className="p-4 text-center text-muted">{t('common.noResults')}</div>;
  }



  return (
    <div className="table-responsive">
      {/* Sentinel element for sticky header detection */}
      <div ref={sentinelRef} ></div>
      
      <table className="table table-hover mb-0">
        <thead className={isSticky ? 'is-sticky' : ''}>
          <tr>
            <th>{t('clients.tableHeaderName')}</th>
            <th>{t('clients.tableHeaderPhone')}</th>
            <th>{t('clients.tableHeaderRegion')}</th>
            <th>{t('clients.tableHeaderNotes')}</th>
            <th className="text-center">{t('clients.tableHeaderDueAmount')}</th>
            <th className="text-end">{t('clients.tableHeaderActions')}</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <ClientRow 
              key={client.id} 
              client={client} 
              onEdit={onEdit}
              onAddTask={onAddTask}
              onAddReceivable={onAddReceivable}
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
  onAddReceivable: (client: Client) => void;
}

const ClientRow = ({ client, onEdit, onAddTask, onAddReceivable}: ClientRowProps) => {
  const { t } = useTranslation();
  // Remove the individual query to improve performance
  // const { data: unpaidAmounts } = useGetClientUnpaidAmounts(client.id);

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

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const whatsappPhone = formatPhoneForWhatsApp(client.phone);
    window.open(`https://wa.me/${whatsappPhone.replace('+', '')}`, '_blank');
  };

  const handleGoogleDriveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(client.google_drive_link, '_blank');
  };

  

  return (
    <tr>
      <td className="ps-2" style={{paddingRight: '16px'}}>
        <Link to={`${linkBasePath}/${client.id}`} className="text-decoration-none text-dark fw-bold link-hover">
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
            title={t('clients.sendMessage')}
            className="p-1 border-0"

          >
            <img
              src={WhatsAppIcon}
              alt="WhatsApp"
              width="16"
              height="16"
              // style={{ filter: 'brightness(0) invert(0)' }}
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
            title={t('receivables.addNew')}
          >
            <Plus size={16} />
          </Button>
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
      </td>
    </tr>
  );
};

export default ClientsTable;