import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Client } from '../../api/types';
import Button from '../ui/Button';
import { Plus } from 'lucide-react';
import { useGetClientCredits } from '../../queries/clientCreditQueries';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';

type ProfileViewMode = 'general' | 'tasks' | 'receivables';

interface ClientProfileHeaderProps {
  client: Client;
  mode: ProfileViewMode;
  onAddTask: () => void;
  onAddReceivable: () => void;
  onAddCredit: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
}

// Custom hook for positioning dropdowns with createPortal
const useDropdownPosition = (isOpen: boolean) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 100, // Offset to align properly
      });
    }
  }, [isOpen]);

  return { triggerRef, position };
};

const ClientCreditBalance = ({ clientId }: { clientId: number }) => {
  const { data, isLoading } = useGetClientCredits(clientId);

  if (isLoading) {
    return <span className="text-muted small">Loading...</span>;
  }

  const balance = data?.balance || 0;

  return (
    <span className="d-flex align-items-center text-dark fw-bold">
      <SaudiRiyalIcon size={16} className="me-1" />
      {balance.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
    </span>
  );
};

const ClientProfileHeader = ({ 
  client, 
  mode, 
  onAddTask, 
  onAddReceivable, 
  onAddCredit,
  onExportExcel, 
  onExportPDF, 
  onPrint 
}: ClientProfileHeaderProps) => {
  const { t } = useTranslation();
  
  // State for controlling dropdown visibility
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Position hooks for each dropdown
  const modeDropdown = useDropdownPosition(showModeDropdown);
  const addDropdown = useDropdownPosition(showAddDropdown);
  const exportDropdown = useDropdownPosition(showExportDropdown);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside any dropdown menu or trigger
      const isOutsideMode = showModeDropdown && 
        modeDropdown.triggerRef.current && 
        !modeDropdown.triggerRef.current.contains(target) &&
        !document.querySelector('.dropdown-menu-mode')?.contains(target);
        
      const isOutsideAdd = showAddDropdown && 
        addDropdown.triggerRef.current && 
        !addDropdown.triggerRef.current.contains(target) &&
        !document.querySelector('.dropdown-menu-add')?.contains(target);
        
      const isOutsideExport = showExportDropdown && 
        exportDropdown.triggerRef.current && 
        !exportDropdown.triggerRef.current.contains(target) &&
        !document.querySelector('.dropdown-menu-export')?.contains(target);

      if (isOutsideMode) setShowModeDropdown(false);
      if (isOutsideAdd) setShowAddDropdown(false);
      if (isOutsideExport) setShowExportDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModeDropdown, showAddDropdown, showExportDropdown]);

  return (
    <div className="card mb-2">
      <div className="card-body py-2 px-3">
        <div className="d-flex justify-content-between align-items-center position-relative">
          
          {/* Left: Action Buttons and Dropdowns */}
          <div className="d-flex align-items-center">
            {/* Add Task Button */}
            <Button size="sm" onClick={onAddTask} className="me-2">
              <Plus size={14} className="me-1"/> {t('clientProfile.addTask')}
            </Button>

            {/* Navigation Mode Dropdown */}
            <div className="position-relative me-2">
              <button
                ref={modeDropdown.triggerRef}
                className="btn btn-sm btn-outline-primary text-start"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                onClick={() => setShowModeDropdown(!showModeDropdown)}
              >
                {mode === 'general' && t('clientProfile.viewModeGeneral')}
                {mode === 'tasks' && t('clientProfile.viewModeTasks')}
                {mode === 'receivables' && t('clientProfile.viewModeReceivables')}
                <span className="ms-1">▼</span>
              </button>
              
              {showModeDropdown && createPortal(
                <div
                  className="dropdown-menu dropdown-menu-mode show text-start"
                  style={{
                    position: 'absolute',
                    top: `${modeDropdown.position.top}px`,
                    left: `${modeDropdown.position.left}px`,
                    zIndex: 1050,
                    minWidth: '180px',
                    boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    borderRadius: '0.375rem'
                  }}
                >
                  <Link
                    to={`/clients/${client.id}?mode=general`}
                    className={`dropdown-item text-end ${mode === 'general' ? 'active' : ''} text-start`}
                    onClick={() => setShowModeDropdown(false)}
                  >
                    {t('clientProfile.viewModeGeneral')}
                  </Link>
                  <Link
                    to={`/clients/${client.id}?mode=tasks`}
                    className={`dropdown-item text-end ${mode === 'tasks' ? 'active' : ''}`}
                    onClick={() => setShowModeDropdown(false)}
                  >
                    {t('clientProfile.viewModeTasks')}
                  </Link>
                  <Link
                    to={`/clients/${client.id}?mode=receivables`}
                    className={`dropdown-item text-end ${mode === 'receivables' ? 'active' : ''}`}
                    onClick={() => setShowModeDropdown(false)}
                  >
                    {t('clientProfile.viewModeReceivables')}
                  </Link>
                </div>,
                document.body
              )}
            </div>

            {/* Add Receivable/Credit Dropdown */}
            <div className="position-relative me-2">
              <button
                ref={addDropdown.triggerRef}
                className="btn btn-sm btn-outline-success"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                onClick={() => setShowAddDropdown(!showAddDropdown)}
              >
                <Plus size={14} className="me-1"/> إضافة
                <span className="ms-1">▼</span>
              </button>
              
              {showAddDropdown && createPortal(
                <div
                  className="dropdown-menu dropdown-menu-add show"
                  style={{
                    position: 'absolute',
                    top: `${addDropdown.position.top}px`,
                    left: `${addDropdown.position.left}px`,
                    zIndex: 1050,
                    minWidth: '180px',
                    boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    borderRadius: '0.375rem'
                  }}
                >
                  <button
                    className="dropdown-item text-end"
                    onClick={() => {
                      onAddReceivable();
                      setShowAddDropdown(false);
                    }}
                  >
                     {t('clientProfile.addReceivable')}<Plus size={14} className="me-2"/>
                  </button>
                  <button
                    className="dropdown-item text-end"
                    onClick={() => {
                      onAddCredit();
                      setShowAddDropdown(false);
                    }}
                  >
                    إضافة رصيد<Plus size={14} className="me-2"/>
                  </button>
                </div>,
                document.body
              )}
            </div>

            {/* Export Dropdown (Only in receivables mode) */}
            {mode === 'receivables' && (
              <div className="position-relative">
                <button
                  ref={exportDropdown.triggerRef}
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                >
                  تصدير
                  <span className="ms-1">▼</span>
                </button>
                
                {showExportDropdown && createPortal(
                  <div
                    className="dropdown-menu dropdown-menu-export show"
                    style={{
                      position: 'absolute',
                      top: `${exportDropdown.position.top}px`,
                      left: `${exportDropdown.position.left}px`,
                      zIndex: 1050,
                      minWidth: '120px',
                      boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                      border: '1px solid rgba(0, 0, 0, 0.15)',
                      borderRadius: '0.375rem'
                    }}
                  >
                    {onExportExcel && (
                      <button
                        className="dropdown-item text-end"
                        onClick={() => {
                          onExportExcel();
                          setShowExportDropdown(false);
                        }}
                      >
                        <span className="text-success me-2">📊</span> Excel
                      </button>
                    )}
                    {onExportPDF && (
                      <button
                        className="dropdown-item text-end"
                        onClick={() => {
                          onExportPDF();
                          setShowExportDropdown(false);
                        }}
                      >
                        <span className="text-danger me-2">📄</span> PDF
                      </button>
                    )}
                    {onPrint && (
                      <button
                        className="dropdown-item text-end"
                        onClick={() => {
                          onPrint();
                          setShowExportDropdown(false);
                        }}
                      >
                        <span className="text-info me-2">🖨️</span> طباعة
                      </button>
                    )}
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>

          {/* Center: Client Info */}
          <div className="position-absolute start-50 translate-middle-x d-flex align-items-center">
            <span className="fw-bold text-dark me-3" style={{ fontSize: '0.95rem' }}>
              {client.name}
            </span>
            <span className="text-dark me-2" style={{ fontSize: '0.85rem' }}>
              {client.phone}
            </span>
            <a 
              href={`https://wa.me/966${client.phone.substring(1)}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-success"
            >
              <img 
                src="/src/assets/images/whats.svg" 
                alt="WhatsApp" 
                width="16" 
                height="16"
              />
            </a>
          </div>

          {/* Right: Client Credit Balance */}
          <div className="d-flex align-items-center">
            <div className="text-end d-flex">
              <div className=" small">الرصيد المتاح</div>
              <ClientCreditBalance clientId={client.id} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ClientProfileHeader;