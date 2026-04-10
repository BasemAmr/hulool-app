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
}

const ClientHeaderDropdown = ({
  onAddTask,
  onAddInvoice,
  onRecordCredit,
  role,
  context,
}: HeaderDropdownProps) => {
  // Determine which actions to show based on role and context
  const showAddInvoice = role === 'admin' && context !== 'admin-employee-profile';
  const showRecordCredit = role === 'admin' && context !== 'admin-employee-profile';
  const menuItemClassName = 'client-card-dropdown-item cursor-pointer gap-2 justify-end';
  
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "client-card-action-button client-card-header-action-button rounded",
            "transition-all duration-200 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-white/20"
          )}
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="client-card-dropdown-panel min-w-[140px] text-[0.85em]"
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
