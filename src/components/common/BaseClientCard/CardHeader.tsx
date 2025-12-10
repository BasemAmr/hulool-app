// Card Header Component - Client information header

import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import WhatsAppIcon from '../../../assets/images/whats.svg';
import GoogleDriveIcon from '../../../assets/images/googe_drive.svg';
import ClientHeaderDropdown from './ClientHeaderDropdown';
import type { CardHeaderProps } from './types';

const CardHeader = ({
  client,
  isUrgent,
  headerColor,
  role,
  context,
  actions,
}: CardHeaderProps) => {
  // Determine client link based on role
  const clientLink = role === 'employee' 
    ? `/employee/clients/${client.id}`
    : `/clients/${client.id}`;

  const openWhatsApp = () => {
    const phoneNumber = client.phone?.replace(/[^0-9]/g, '') || '';
    const whatsappUrl = `https://wa.me/+966${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const openGoogleDrive = () => {
    if (client.google_drive_link) {
      window.open(client.google_drive_link, '_blank');
    }
  };

  return (
    <div
      className="border-0 py-2 rounded-none"
      style={{ backgroundColor: headerColor }}
    >
      <div className="flex justify-between items-center px-2">
        {/* Left: WhatsApp with phone number */}
        <div className="flex items-center gap-2">
          <button
            onClick={openWhatsApp}
            className="p-1.5 rounded hover:bg-white/20 transition-all duration-200 cursor-pointer border-0 bg-transparent"
            title="واتساب"
          >
            <img src={WhatsAppIcon} alt="WhatsApp" width="18" height="18" />
          </button>
          <span className="text-sm">{client.phone || ''}</span>
        </div>

        {/* Center: Client name with Google Drive */}
        <div className="flex items-center justify-center gap-2">
          <Link
            to={clientLink}
            className="no-underline font-bold text-black text-[0.95em] hover:opacity-80 transition-opacity"
          >
            {client.name}
          </Link>
          {isUrgent && (
            <AlertTriangle size={14} className="text-warning" />
          )}
          <button
            onClick={openGoogleDrive}
            className="p-1.5 rounded hover:bg-white/20 transition-all duration-200 cursor-pointer border-0 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
