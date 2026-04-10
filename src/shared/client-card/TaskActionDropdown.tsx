// Task Action Dropdown - Unified dropdown for all task actions

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  Check,
  Pause,
  Play,
  X,
  RotateCcw,
  ListChecks,
  MessageSquare,
  AlertTriangle,
  Eye,
  UserPlus,
  Upload,
  MoreVertical,
} from 'lucide-react';
import type { ActionDropdownProps } from './types';
import { getAvailableActions, getCompleteButtonLabel, getAssignButtonLabel } from './actionUtils';
import { cn } from '@/shared/utils/cn';

const TaskActionDropdown = ({
  task,
  role,
  context,
  actions,
  isEmployeeTask = false,
}: ActionDropdownProps) => {
  const available = getAvailableActions(task, role, context, isEmployeeTask);
  const isUrgent = task.tags?.some(tag => tag.name === 'قصوى');
  const menuItemClassName = 'client-card-dropdown-item cursor-pointer gap-2 justify-end';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "client-card-action-button client-card-action-button--menu p-1.5 rounded",
            "transition-all duration-200 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          <MoreVertical size={12} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="client-card-dropdown-panel min-w-[160px] text-[0.85em]"
        style={{ direction: 'rtl' }}
        sideOffset={5}
      >
        {/* Complete/Restore Action */}
        {available.canRestore && actions.onRestore && (
          <DropdownMenuItem 
            onClick={() => actions.onRestore?.(task)} 
            className={menuItemClassName}
          >
            <span>استعادة إلى جديد</span>
            <RotateCcw size={14} />
          </DropdownMenuItem>
        )}
        
        {available.canComplete && actions.onComplete && (
          <DropdownMenuItem
            onClick={() => actions.onComplete?.(task)}
            className={menuItemClassName}
            disabled={isEmployeeTask && role === 'admin'}
          >
            <span>{getCompleteButtonLabel(isEmployeeTask, role, context)}</span>
            <Check size={14} />
          </DropdownMenuItem>
        )}

        {/* Submit for Review (Employee or Admin in employee context) */}
        {available.canSubmitForReview && actions.onSubmitForReview && (
          <DropdownMenuItem 
            onClick={() => actions.onSubmitForReview?.(task)} 
            className={menuItemClassName}
          >
            <span>إرسال للمراجعة</span>
            <Upload size={14} />
          </DropdownMenuItem>
        )}

        {/* Defer/Resume */}
        {available.canDefer && actions.onDefer && (
          <DropdownMenuItem 
            onClick={() => actions.onDefer?.(task)} 
            className={menuItemClassName}
          >
            <span>تأجيل</span>
            <Pause size={14} />
          </DropdownMenuItem>
        )}
        
        {available.canResume && actions.onResume && (
          <DropdownMenuItem 
            onClick={() => actions.onResume?.(task)} 
            className={menuItemClassName}
          >
            <span>استئناف</span>
            <Play size={14} />
          </DropdownMenuItem>
        )}

        {/* Cancel */}
        {available.canCancel && actions.onCancel && (
          <DropdownMenuItem 
            onClick={() => actions.onCancel?.(task)} 
            className={cn(menuItemClassName, 'text-destructive hover:text-destructive')}
          >
            <span>إلغاء المهمة</span>
            <X size={14} />
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-border/50" />

        {/* Urgent Toggle */}
        {available.canToggleUrgent && actions.onToggleUrgent && (
          <DropdownMenuItem 
            onClick={() => actions.onToggleUrgent?.(task)} 
            className={menuItemClassName}
          >
            <span>{isUrgent ? 'إلغاء العاجل' : 'تعليم عاجل'}</span>
            <AlertTriangle size={14} />
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-border/50" />

        {/* Requirements */}
        {available.showRequirements && actions.onShowRequirements && (
          <DropdownMenuItem 
            onClick={() => actions.onShowRequirements?.(task)} 
            className={menuItemClassName}
          >
            <span>المتطلبات</span>
            <ListChecks size={14} />
          </DropdownMenuItem>
        )}

        {/* Follow Up */}
        {available.showFollowUp && actions.onOpenFollowUp && (
          <DropdownMenuItem 
            onClick={() => actions.onOpenFollowUp?.(task)} 
            className={menuItemClassName}
          >
            <span>التعليقات</span>
            <MessageSquare size={14} />
          </DropdownMenuItem>
        )}

        {/* Subtasks */}
        {available.showSubtasks && actions.onViewSubtasks && (
          <DropdownMenuItem 
            onClick={() => actions.onViewSubtasks?.(task)} 
            className={menuItemClassName}
          >
            <span>المهام الفرعية</span>
            <Eye size={14} />
          </DropdownMenuItem>
        )}

        {/* Assign (Admin only) */}
        {available.canAssign && actions.onAssign && (
          <>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem 
              onClick={() => actions.onAssign?.(task)} 
              className={menuItemClassName}
            >
              <span>{getAssignButtonLabel(task)}</span>
              <UserPlus size={14} />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TaskActionDropdown;
