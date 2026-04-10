// Card Header Component - Client information header

import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import GoogleDriveIcon from '@/shared/ui/icons/GoogleDriveIcon';
import ClientHeaderDropdown from './ClientHeaderDropdown';
import type { CardHeaderProps } from './types';

const CardHeader = ({
  client,
  isUrgent,
  role,
  context,
  actions,
}: CardHeaderProps) => {
  const clientLink = role === 'employee'
    ? `/employee/clients/${client.id}`
    : `/clients/${client.id}`;

  const openWhatsApp = () => {
    const phoneNumber = client.phone?.replace(/[^0-9]/g, '') || '';
    window.open(`https://wa.me/+966${phoneNumber}`, '_blank');
  };

  const openGoogleDrive = () => {
    if (client.google_drive_link) {
      window.open(client.google_drive_link, '_blank');
    }
  };

  return (
    <div className={`client-card-header border-0 py-2 rounded-none ${isUrgent ? 'bg-status-danger-bg border-b border-status-danger-border' : 'bg-background border-b border-border-default dark:bg-white/[0.04] dark:border-white/10'}`}>
      <div className="flex justify-between items-center px-2">
        {/* Left: WhatsApp with phone number */}
        <div className="flex items-center gap-2">
          <button
            onClick={openWhatsApp}
            className="client-card-action-button client-card-header-action-button rounded transition-all duration-200 cursor-pointer"
            title="واتساب"
          >
            <WhatsAppIcon size={16} />
          </button>
          <span className="client-card-secondary text-sm">{client.phone || ''}</span>
        </div>

        {/* Center: Client name with Google Drive */}
        <div className="flex items-center justify-center gap-2">
          <Link
            to={clientLink}
            className="no-underline font-bold text-text-primary text-[0.95em] hover:text-text-brand transition-colors dark:text-white"
          >
            {client.name}
          </Link>
          {isUrgent && (
            <AlertTriangle size={14} className="text-status-danger-text" />
          )}
          <button
            onClick={openGoogleDrive}
            className="client-card-action-button client-card-header-action-button rounded transition-all duration-200 text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            title="Google Drive"
            disabled={!client.google_drive_link}
            type="button"
          >
            <GoogleDriveIcon size={16} className="text-current" />
          </button>
        </div>

        {/* Right: Actions Dropdown */}
        <ClientHeaderDropdown
          onAddTask={() => actions.onAddTask?.(client)}
          onAddInvoice={() => actions.onAddInvoice?.(client)}
          onRecordCredit={() => actions.onRecordCredit?.(client)}
          role={role}
          context={context}
        />
      </div>
    </div>
  );
};

export default CardHeader;
