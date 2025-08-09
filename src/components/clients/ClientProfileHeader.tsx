import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Client } from '../../api/types';
import Button from '../ui/Button';
import { Plus, MessageSquare, Download, Printer } from 'lucide-react';

type ProfileViewMode = 'general' | 'tasks' | 'receivables';

interface ClientProfileHeaderProps {
  client: Client;
  mode: ProfileViewMode;
  onAddTask: () => void;
  onAddReceivable: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
}

const ClientProfileHeader = ({ client, mode, onAddTask, onAddReceivable, onExportExcel, onExportPDF, onPrint }: ClientProfileHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="card mb-2" style={{ minHeight: 'auto' }}>
      <div className="card-body py-2 px-3">
        <div className="d-flex justify-content-between align-items-center">
          {/* Left Side: Export Buttons */}
          {/* Right Side: Actions & Mode Toggles */}
          <div className="d-flex align-items-center">
            {/* Action Buttons (Conditional) */}
            {(mode === 'general' || mode === 'tasks') && (
              <Button size="sm" onClick={onAddTask} className="me-2">
                <Plus size={14} className="me-1"/> {t('clientProfile.addTask')}
              </Button>
            )}
            {(mode === 'general' || mode === 'receivables') && (
              <Button size="sm" variant="outline-primary" onClick={onAddReceivable} className="me-2">
                <Plus size={14} className="me-1"/> {t('clientProfile.addReceivable')}
              </Button>
            )}
            
            {/* Mode Toggles */}
            <div className="btn-group btn-group-sm">
              <Link to={`/clients/${client.id}?mode=general`} className={`btn ${mode === 'general' ? 'btn-primary' : 'btn-outline-primary'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                {t('clientProfile.viewModeGeneral')}
              </Link>
              <Link to={`/clients/${client.id}?mode=tasks`} className={`btn ${mode === 'tasks' ? 'btn-primary' : 'btn-outline-primary'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                {t('clientProfile.viewModeTasks')}
              </Link>
              <Link to={`/clients/${client.id}?mode=receivables`} className={`btn ${mode === 'receivables' ? 'btn-primary' : 'btn-outline-primary'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                {t('clientProfile.viewModeReceivables')}
              </Link>
            </div>
          </div>

          {/* Center: Client Info (Compact) */}
          <div className="d-flex flex-column align-items-center">
            <div className="d-flex align-items-center mb-1">
              <span className="fw-bold text-primary me-2" style={{ fontSize: '0.95rem' }}>
                {client.name}
              </span>
              <span className="text-muted me-2" style={{ fontSize: '0.85rem' }}>
                {client.phone}
              </span>
              <a href={`https://wa.me/966${client.phone.substring(1)}`} target="_blank" rel="noopener noreferrer" className="text-success">
                <MessageSquare size={16} />
              </a>
            </div>
          </div>

          


            <div className="d-flex align-items-center">
            {mode === 'receivables' && (
              <>
                {onExportExcel && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onExportExcel}
                    className="me-2 d-flex align-items-center"
                    style={{ 
                      borderColor: 'var(--color-success)', 
                      color: 'var(--color-success)',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <Download size={14} className="me-1" />
                    Excel
                  </Button>
                )}
                {onExportPDF && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onExportPDF}
                    className="me-2 d-flex align-items-center"
                    style={{ 
                      borderColor: 'var(--color-danger)', 
                      color: 'var(--color-danger)',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <Download size={14} className="me-1" />
                    PDF
                  </Button>
                )}
                {onPrint && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onPrint}
                    className="me-2 d-flex align-items-center"
                    style={{ 
                      borderColor: 'var(--color-info)', 
                      color: 'var(--color-info)',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <Printer size={14} className="me-1" />
                    طباعة
                  </Button>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ClientProfileHeader;