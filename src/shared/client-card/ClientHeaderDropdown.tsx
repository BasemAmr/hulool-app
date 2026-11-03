// Client Header Dropdown - Actions for client header

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Receipt, MoreVertical } from 'lucide-react';
import type { CardHeaderProps } from './types';
import { cn } from '@/shared/utils/cn';

interface HeaderDropdownProps {
  onAddTask?: () => void;
  onAddInvoice?: () => void;
  onRecordCredit?: () => void;
  role: CardHeaderProps['role'];
  context: CardHeaderProps['context'];
  variant?: CardHeaderProps['variant'];
}

const ClientHeaderDropdown = ({
  onAddTask,
  onAddInvoice,
  onRecordCredit,
  role,
  context,
  variant = 'default',
}: HeaderDropdownProps) => {
  const isAmber = variant === 'amber';
  // Determine which actions to show based on role and context
  const showAddInvoice = role === 'admin' && context !== 'admin-employee-profile';
  const showRecordCredit = role === 'admin' && context !== 'admin-employee-profile';
  const menuItemClassName = 'client-card-dropdown-item cursor-pointer gap-2 justify-end font-["Cairo"] text-xs py-2 rounded-none';
  
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-8 h-8 rounded-none flex items-center justify-center",
            "shadow-2xs transition-all active:scale-95 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-white/30"
          )}
          style={{
            backgroundColor: isAmber ? 'var(--token-card-header-amber-btn-bg)' : 'var(--token-card-header-btn-bg)',
            color: isAmber ? 'var(--token-card-header-amber-btn-text)' : 'var(--token-card-header-btn-text)',
            borderColor: isAmber ? 'var(--token-card-header-amber-btn-border)' : 'var(--token-card-header-btn-border)',
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
          title="المزيد من الإجراءات"
        >
          <MoreVertical size={16} style={{ color: isAmber ? 'var(--token-card-header-amber-btn-text)' : 'var(--token-card-header-btn-text)' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="client-card-dropdown-panel min-w-[140px] text-[0.85em] font-['Cairo'] shadow-md rounded-none"
        style={{ direction: 'rtl' }}
        sideOffset={5}
      >
        {onAddTask && (
          <DropdownMenuItem 
            onClick={onAddTask} 
            className={menuItemClassName}
          >
            <span>إضافة مهمة</span>
            <Receipt size={14} />
          </DropdownMenuItem>
        )}
        
        {showAddInvoice && onAddInvoice && (
          <DropdownMenuItem 
            onClick={onAddInvoice} 
            className={menuItemClassName}
          >
            <span>إضافة فاتورة</span>
            <Receipt size={14} />
          </DropdownMenuItem>
        )}
        
        {showRecordCredit && onRecordCredit && (
          <DropdownMenuItem 
            onClick={onRecordCredit} 
            className={menuItemClassName}
          >
            <span>إضافة دفعة</span>
            <Receipt size={14} />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ClientHeaderDropdown;
