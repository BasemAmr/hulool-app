// src/components/dashboard/DashboardClientCard.tsx
// import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useModalStore } from '../../stores/modalStore';
import { useToast } from '../../hooks/useToast';
import { useDeferTask, useResumeTask } from '../../queries/taskQueries';
import type { Task } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';
// import { formatTimeElapsed } from '../../utils/timeUtils'; // Original import
import { Dropdown } from 'react-bootstrap';
import { 
  Plus, 
  Receipt, 
  Check, 
  Pause, 
  Play, 
  ListChecks, 
  MoreVertical, 
  AlertTriangle,
  Eye,
} from 'lucide-react';
import WhatsAppIcon from '../../assets/images/whats.svg';
import GoogleDriveIcon from '../../assets/images/googe_drive.svg';
import type { ClientWithTasksAndStats } from '../../queries/dashboardQueries';
import { createPortal } from 'react-dom';

interface DashboardClientCardProps {
  data: ClientWithTasksAndStats;
  index?: number; // optional: used to vary styling
  alternatingColors: string[]; // new prop for alternating colors
}

// Updated formatTimeElapsed function for day-based display
const formatDaysElapsed = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Calculate difference in days

  if (diffDays === 0) {
    return 'اليوم';
  } else if (diffDays === 1) {
    return 'يوم';
  } else if (diffDays === 2) {
    return 'يومين';
  } else if (diffDays > 2 && diffDays <= 10) {
    return `${diffDays} أيام`;
  } else {
    return `${diffDays} يوم`;
  }
};


const DashboardClientCard = ({ data, index = 0,  alternatingColors }: DashboardClientCardProps) => {
  const { client, tasks } = data;
  console.log('Client Data:', data);
  console.log('Client Tasks:', tasks);
  const { t } = useTranslation();
  const openModal = useModalStore(state => state.openModal);
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const deferTaskMutation = useDeferTask();
  const resumeTaskMutation = useResumeTask();
  
  const handleAction = (mutation: any, task: Task, successKey: string, successMessageKey: string, errorKey: string) => {
    mutation.mutate({ id: task.id }, {
      onSuccess: () => {
        success(t(successKey), t(successMessageKey, { taskName: task.task_name || t(`type.${task.type}`) }));
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'clientsWithActiveTasks'] });
      },
      onError: (err: any) => {
        error(t('common.error'), err.message || t(errorKey));
      }
    });
  };

  const handleDefer = (task: Task) => handleAction(deferTaskMutation, task, 'tasks.deferSuccess', 'tasks.deferSuccessMessage', 'tasks.deferError');
  const handleResume = (task: Task) => handleAction(resumeTaskMutation, task, 'tasks.resumeSuccess', 'tasks.resumeSuccessMessage', 'tasks.resumeError');
  const handleComplete = (task: Task) => openModal('taskCompletion', { task });
  const handleShowRequirements = (task: Task) => openModal('requirements', { task });
  // const handleShowDetails = (task: Task) => openModal('taskDetails', { task });
  const handleAddTask = () => openModal('taskForm', { client });
  const handleAddReceivable = () => openModal('manualReceivable', { client_id: client.id });

  const isClientUrgent = tasks.some(task => task.tags?.some(tag => tag.name === 'قصوى'));
  
  // Use alternating colors based on type and index, or red if urgent
  const cardBackground = isClientUrgent ? '#ffebeb' : alternatingColors[index % 2];
  const headerBackground = isClientUrgent ? '#ffcccc' : (index % 2 === 0 ? '#f8f9fa' : '#e9ecef');
  const tableHeaderBackground = isClientUrgent ? '#ffb3b3' : (index % 2 === 0 ? '#f1f3f4' : '#dee2e6');
  
  const borderColor = isClientUrgent ? '#dc3545' : '#6c757d';
  const cardBorderColor = isClientUrgent ? '#dc3545' : '#495057';

  // Create a style tag for important overrides
  const styleOverrides = `
    .dashboard-client-card-${index} {
      background-color: ${cardBackground} !important;
    }
    .dashboard-client-card-${index} .card-header {
      background-color: ${headerBackground} !important;
    }
    .dashboard-client-card-${index} .card-body {
      background-color: ${cardBackground} !important;
    }
    .dashboard-client-card-${index} table {
      background-color: ${cardBackground} !important;
    }
    .dashboard-client-card-${index} thead {
      background-color: ${tableHeaderBackground} !important;
    }
    .dashboard-client-card-${index} th {
      background-color: ${tableHeaderBackground} !important;
    }
  `;

  const openGoogleDrive = () => {
    if (client.google_drive_link) {
      window.open(client.google_drive_link, '_blank');
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = client.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/+966${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEditTask = (task: Task) => openModal('taskForm', { taskToEdit: task, client });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleOverrides }} />
      <div 
        className={`card h-100 shadow-sm dashboard-client-card dashboard-client-card-${index}`}
        style={{ 
          backgroundColor: cardBackground,
          borderLeft: `3px solid ${cardBorderColor}`,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
      {/* Header */}
      <div 
        className="card-header border-bottom py-2"
        style={{ 
          backgroundColor: headerBackground,
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          {/* Left: WhatsApp with phone number */}
          <div className="d-flex align-items-center gap-2">
            <button 
              onClick={openWhatsApp}
              className="btn btn-sm btn-outline-success p-1 border-0"
              title="واتساب"
            >
              <img src={WhatsAppIcon} alt="WhatsApp" width="16" height="16" />
            </button>
            <span  style={{ fontSize: '0.85em' }}>
              {client.phone || ''}
            </span>
          </div>
          
          {/* Center: Client name with Google Drive */}
          <div className="d-flex align-items-center justify-content-center gap-2">
            <Link 
              to={`/clients/${client.id}`}
              className="text-decoration-none fw-bold"
              style={{ fontSize: '0.95em', color: 'black' }}
            >
              {client.name}
            </Link>
            {isClientUrgent && (
              <AlertTriangle size={12} className="text-danger" />
            )}
            <button 
              onClick={openGoogleDrive}
              className="btn btn-sm btn-outline-primary p-1 border-0"
              title="Google Drive"
              disabled={!client.google_drive_link}
            >
              <img src={GoogleDriveIcon} alt="Google Drive" width="16" height="16" />
            </button>
          </div>
          
          {/* Right: Actions Dropdown */}
          <div>
            <Dropdown>
              <Dropdown.Toggle 
                variant="outline-secondary" 
                size="sm"
                className="p-1 border-0"
              >
                <MoreVertical size={14} />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleAddTask}>
                  <Plus size={14} className="me-2" />
                  إضافة مهمة
                </Dropdown.Item>
                <Dropdown.Item onClick={handleAddReceivable}>
                  <Receipt size={14} className="me-2" />
                  إضافة مستحق
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Body - Tasks Table */}
      <div 
        className="card-body p-1" 
        style={{ 
          position: 'relative', 
          backgroundColor: cardBackground,
          border: `1px solid ${borderColor}`
        }}
      >
        {/* keep table-responsive overflow visible so dropdowns can escape */}
        <div className="table-responsive" style={{ overflow: 'visible' }}>
          {/* inner scrolling area — this will scroll the table but won't clip dropdowns */}
          <div style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'visible' }}>
            <table 
              className="table table-sm table-borderless mb-0"
              style={{ backgroundColor: cardBackground }}
            >
             <thead 
               style={{ 
                 position: 'sticky', 
                 top: 0, 
                 backgroundColor: tableHeaderBackground, 
                 zIndex: 1
               }}
             >
               <tr className="border-bottom">
                 <th style={{ 
                   fontSize: '0.8em', 
                   padding: '4px 3px', 
                   color: 'black',
                   backgroundColor: tableHeaderBackground
                 }}>المهمة</th>
                 <th style={{ 
                   fontSize: '0.8em', 
                   padding: '4px 3px', 
                   color: 'black',
                   backgroundColor: tableHeaderBackground
                 }}>تاريخ</th>
                 <th style={{ 
                   fontSize: '0.8em', 
                   padding: '4px 3px', 
                   color: 'black',
                   backgroundColor: tableHeaderBackground
                 }}>اليوم</th>
                 <th style={{ 
                   fontSize: '0.8em', 
                   padding: '4px 3px', 
                   color: 'black',
                   backgroundColor: tableHeaderBackground
                 }}>المبلغ</th>
                 <th style={{ 
                   fontSize: '0.8em', 
                   padding: '4px 3px', 
                   width: '54px', 
                   color: 'black',
                   backgroundColor: tableHeaderBackground
                 }}>إجراءات</th>
               </tr>
             </thead>
             <tbody>
               {tasks.map((task) => {
                 const isTaskUrgent = task.tags?.some(tag => tag.name === 'قصوى');
                 const rowBackground = isTaskUrgent ? '#ff9999' : cardBackground;
                 
                 return (
                   <tr 
                     key={task.id}
                     style={{ backgroundColor: rowBackground }}
                   >
                     <td style={{ 
                       fontSize: '0.82em', 
                       padding: '3px', 
                       color: 'black',
                       backgroundColor: rowBackground
                     }}>
                       <div className="d-flex align-items-center gap-1">
                         <span className="text-truncate" style={{ maxWidth: 220, display: 'inline-block' }}>
                           {task.task_name || t(`type.${task.type}`)}
                         </span>
                         {task.tags?.some(tag => tag.name === 'قصوى') && (
                           <AlertTriangle size={10} className="text-danger" />
                         )}
                       </div>
                     </td>
                     <td style={{ 
                       fontSize: '0.77em', 
                       padding: '3px', 
                       color: 'black',
                       backgroundColor: rowBackground
                     }}>
                       {formatDate(task.start_date).replace(/\/20/, '/')}
                     </td>
                     <td style={{ 
                       fontSize: '0.77em', 
                       padding: '3px', 
                       color: 'black',
                       backgroundColor: rowBackground
                     }}>
                       {formatDaysElapsed(task.start_date)}
                     </td>
                     <td style={{ 
                       fontSize: '0.77em', 
                       padding: '3px', 
                       color: 'black',
                       backgroundColor: rowBackground
                     }} className="text-success fw-bold">
                       <div className="d-flex align-items-center text-danger">
                         <svg
                           width={10}
                           height={10}
                           viewBox="0 0 1124.14 1256.39"
                           style={{
                             marginLeft: '2px',
                             verticalAlign: 'middle'
                           }}
                         >
                           <path
                             d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"
                             fill="#f00"
                           />
                           <path
                             d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"
                             fill="#f00"
                           />
                         </svg>
                         {task.amount?.toLocaleString()}
                       </div>
                     </td>
                     <td style={{ 
                       padding: '3px', 
                       position: 'relative', 
                       color: 'black',
                       backgroundColor: rowBackground
                     }}>
                       <div className="d-flex gap-1">
                         <button
                           onClick={() => handleEditTask(task)}
                           className="btn btn-outline-info btn-sm p-1"
                           title="تفاصيل"
                           style={{ fontSize: '10px', lineHeight: 1 }}
                         >
                           <Eye size={10} />
                         </button>
                         
                         <Dropdown>
                           <Dropdown.Toggle 
                             variant="outline-secondary" 
                             size="sm"
                             className="p-1"
                             style={{ fontSize: '10px' }}
                           >
                             <MoreVertical size={10} />
                           </Dropdown.Toggle>
                           {createPortal(
                             <Dropdown.Menu 
                               style={{ 
                                 position: 'absolute',
                                 zIndex: 1050,
                                 minWidth: '120px',
                                 fontSize: '0.85em',
                                 top: 'auto',
                                 left: 'auto',
                                 transform: 'none'
                               }}
                             >
                               <Dropdown.Item onClick={() => handleComplete(task)}>
                                 <Check size={11} className="me-2" />
                                 إكمال
                               </Dropdown.Item>
                               {task.status === 'New' ? (
                                 <Dropdown.Item onClick={() => handleDefer(task)}>
                                   <Pause size={11} className="me-2" />
                                   تأجيل
                                 </Dropdown.Item>
                               ) : (
                                 <Dropdown.Item onClick={() => handleResume(task)}>
                                   <Play size={11} className="me-2" />
                                   استئناف
                                 </Dropdown.Item>
                               )}
                               <Dropdown.Item onClick={() => handleShowRequirements(task)}>
                                 <ListChecks size={11} className="me-2" />
                                 المتطلبات
                               </Dropdown.Item>
                             </Dropdown.Menu>,
                             document.body
                           )}
                         </Dropdown>
                       </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
       </div>
      </div>
    </div>
    </>
  );
};

export default DashboardClientCard;