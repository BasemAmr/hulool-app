// Card Header Component - Client information header matching reference design
// Features single-row compact layout: Drag handle (icon-only), Centered Client Name, WhatsApp, Drive, and 3-dots menu

import { Link } from 'react-router-dom';
import { AlertTriangle, Cloud, GripVertical } from 'lucide-react';
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
  dragHandleProps,
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
    <div className="px-3 py-2 select-none" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        {/* Right side in RTL: Drag Handle Icon */}
        <div className="flex items-center shrink-0">
          {dragHandleProps ? (
            <div
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              className="cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity p-0.5 rounded shrink-0"
              style={{ color: 'var(--token-card-header-subtext)' }}
              title="سحب لإعادة الترتيب"
            >
              <GripVertical size={16} style={{ color: 'inherit' }} />
            </div>
          ) : (
            <div
              className="p-0.5 opacity-60 shrink-0"
              style={{ color: 'var(--token-card-header-subtext)' }}
            >
              <GripVertical size={16} />
            </div>
          )}
        </div>

        {/* Center in RTL: Centered Client Name Link */}
        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 px-2 text-center">
          <Link
            to={clientLink}
            className="no-underline font-bold text-sm font-['Cairo'] transition-colors truncate drop-shadow-xs text-center"
            style={{ color: 'var(--token-card-header-text)' }}
            title={client.name}
          >
            {client.name}
          </Link>
          {isUrgent && (
            <span title="قصوى" className="shrink-0 flex items-center">
              <AlertTriangle size={15} className="text-amber-300 fill-amber-300/30" />
            </span>
          )}
        </div>

        {/* Left side in RTL: Action buttons group */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          {/* WhatsApp Button */}
          <button
            onClick={openWhatsApp}
            className="w-7 h-7 rounded-sm flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
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
            <WhatsAppIcon size={14} />
          </button>

          {/* Cloud Button (Only rendered if valid Google Drive link exists) */}
          {hasValidDriveLink && (
            <button
              onClick={openGoogleDrive}
              className="w-7 h-7 rounded-sm flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
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
              <Cloud size={14} style={{ color: 'var(--token-card-header-btn-text)' }} />
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
