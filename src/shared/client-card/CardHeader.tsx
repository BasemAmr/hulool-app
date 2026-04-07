// Card Header Component - Client information header

import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import WhatsAppIcon from '@/assets/images/whats.svg';
import GoogleDriveIcon from '@/assets/images/googe_drive.svg';
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
    <div className={`border-0 py-2 rounded-none ${isUrgent ? 'bg-status-danger-bg border-b border-status-danger-border' : 'bg-background border-b border-border-default'}`}>
      <div className="flex justify-between items-center px-2">
        {/* Left: WhatsApp with phone number */}
        <div className="flex items-center gap-2">
          <button
            onClick={openWhatsApp}
            className="p-1.5 rounded hover:bg-border-default/30 transition-all duration-200 cursor-pointer border-0 bg-transparent"
            title="واتساب"
          >
            <img src={WhatsAppIcon} alt="WhatsApp" width="18" height="18" />
          </button>
          <span className="text-sm text-text-secondary">{client.phone || ''}</span>
        </div>

        {/* Center: Client name with Google Drive */}
        <div className="flex items-center justify-center gap-2">
          <Link
            to={clientLink}
            className="no-underline font-bold text-text-primary text-[0.95em] hover:text-text-brand transition-colors"
          >
            {client.name}
          </Link>
          {isUrgent && (
            <AlertTriangle size={14} className="text-status-danger-text" />
          )}
          <button
            onClick={openGoogleDrive}
            className="p-1.5 rounded hover:bg-background transition-all duration-200 cursor-pointer border border-border-default bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            title="Google Drive"
            disabled={!client.google_drive_link}
          >
            <img src={GoogleDriveIcon} alt="Google Drive" width="18" height="18" />
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
