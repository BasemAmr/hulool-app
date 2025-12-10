// Client Header Dropdown - Actions for client header

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Receipt, MoreVertical } from 'lucide-react';
import type { CardHeaderProps } from './types';
import { cn } from '@/lib/utils';

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
  
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "p-1.5 rounded hover:bg-white/20",
            "transition-all duration-200 cursor-pointer",
            "border-0 bg-transparent",
            "focus:outline-none focus:ring-2 focus:ring-white/20"
          )}
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[140px] text-[0.85em]"
        style={{ direction: 'rtl' }}
        sideOffset={5}
      >
        {onAddTask && (
          <DropdownMenuItem 
            onClick={onAddTask} 
            className="cursor-pointer gap-2 justify-end"
          >
            <span>إضافة مهمة</span>
            <Receipt size={14} />
          </DropdownMenuItem>
        )}
        
        {showAddInvoice && onAddInvoice && (
          <DropdownMenuItem 
            onClick={onAddInvoice} 
            className="cursor-pointer gap-2 justify-end"
          >
            <span>إضافة فاتورة</span>
            <Receipt size={14} />
          </DropdownMenuItem>
        )}
        
        {showRecordCredit && onRecordCredit && (
          <DropdownMenuItem 
            onClick={onRecordCredit} 
            className="cursor-pointer gap-2 justify-end"
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
