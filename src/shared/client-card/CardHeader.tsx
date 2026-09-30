// Card Header Component - Client information header matching reference design
// Styled for Mostaql Blue Header Theme with RTL alignment and valid Drive link checking

import { Link } from 'react-router-dom';
import { AlertTriangle, Cloud } from 'lucide-react';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import ClientHeaderDropdown from './ClientHeaderDropdown';
import type { CardHeaderProps } from './types';

/**
 * Validates whether a given URL is a real Google Drive link and not a stub / placeholder.
 */
export const isValidGoogleDriveLink = (link?: string | null): boolean => {
  if (!link || typeof link !== 'string') return false;
  const trimmed = link.trim();
  if (!trimmed || trimmed === '#' || trimmed.toLowerCase() === 'stub') return false;
  try {
    const url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    return host.includes('drive.google.com') || (host.includes('google.com') && url.pathname.includes('/drive'));
  } catch {
    return false;
  }
};

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

  const hasValidDriveLink = isValidGoogleDriveLink(client.google_drive_link);

  return (
    <div className="px-4 py-2 bg-transparent" dir="rtl">
      <div className="flex justify-between items-center gap-3">
        {/* 1. Right (in RTL): Client name & phone (1st child in RTL flex row) */}
        <div className="flex flex-col items-start text-right min-w-0">
          <div className="flex items-center gap-2 max-w-full">
            <Link
              to={clientLink}
              className="no-underline font-bold text-base font-['Cairo'] transition-colors truncate drop-shadow-xs"
              style={{ color: 'var(--token-card-header-text)' }}
              title={client.name}
            >
              {client.name}
            </Link>
            {isUrgent && (
              <span title="قصوى" className="shrink-0 flex items-center">
                <AlertTriangle size={16} className="text-amber-300 fill-amber-300/30" />
              </span>
            )}
          </div>
          {client.phone && (
            <span 
              className="text-xs font-medium font-['Cairo'] mt-0.5 tracking-wide tabular-nums"
              style={{ color: 'var(--token-card-header-subtext)' }}
            >
              {client.phone}
            </span>
          )}
        </div>

        {/* 2. Left (in RTL): Action buttons group (2nd child in RTL flex row) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* WhatsApp Button (Green) */}
          <button
            onClick={openWhatsApp}
            className="w-8 h-8 rounded-none flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--token-brand-whatsapp)',
              color: 'var(--token-card-header-btn-text)',
              borderColor: 'var(--token-brand-whatsapp-hover)',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
            title="واتساب"
            type="button"
          >
            <WhatsAppIcon size={16} />
          </button>

          {/* Cloud Button (Only rendered if valid Google Drive link exists!) */}
          {hasValidDriveLink && (
            <button
              onClick={openGoogleDrive}
              className="w-8 h-8 rounded-none flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--token-card-header-btn-bg)',
                color: 'var(--token-card-header-btn-text)',
                borderColor: 'var(--token-card-header-btn-border)',
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
              title="Google Drive"
              type="button"
            >
              <Cloud size={16} style={{ color: 'var(--token-card-header-btn-text)' }} />
            </button>
          )}

          {/* 3-dots Dropdown Button */}
          <ClientHeaderDropdown
            onAddTask={() => actions.onAddTask?.(client)}
            onAddInvoice={() => actions.onAddInvoice?.(client)}
            onRecordCredit={() => actions.onRecordCredit?.(client)}
            role={role}
            context={context}
          />
        </div>
      </div>
    </div>
  );
};

export default CardHeader;
