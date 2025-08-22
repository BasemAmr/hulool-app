import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import type { ClientCredit } from '../../api/types';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import { formatDate } from '../../utils/dateUtils';
import { Edit3, Trash2 } from 'lucide-react';

interface ClientCreditsHistoryTableProps {
  credits: ClientCredit[];
  isLoading: boolean;
  clientId: number;
}

const ClientCreditsHistoryTable = ({ credits, isLoading, clientId }: ClientCreditsHistoryTableProps) => {
  const { t } = useTranslation();
  const openModal = useModalStore((state) => state.openModal);

  const handleEditCredit = (credit: ClientCredit) => {
    openModal('creditEdit', { credit, clientId });
  };

  const handleDeleteCredit = (credit: ClientCredit) => {
    openModal('creditDelete', { credit, clientId });
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!credits || credits.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        {t('clients.noCreditsFound')}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle">
        <thead className="table-light">
          <tr>
            <th>{t('common.date')}</th>
            <th>{t('common.description')}</th>
            <th>{t('common.amount')}</th>
            <th>{t('clients.allocatedAmount')}</th>
            <th>{t('clients.remainingAmount')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {credits.map((credit) => (
            <tr key={credit.id}>
              <td>
                {formatDate(credit.received_at)}
              </td>
              <td>{credit.description}</td>
              <td>
                <div className="d-flex align-items-center">
                  <SaudiRiyalIcon size={16} className="me-1 text-success" />
                  <span className="text-success fw-bold">
                    {Number(credit.amount).toLocaleString('ar-SA', { 
                      style: 'currency', 
                      currency: 'SAR' 
                    })}
                  </span>
                </div>
              </td>
              <td>
                <div className="d-flex align-items-center">
                  <SaudiRiyalIcon size={16} className="me-1 text-info" />
                  <span className="text-info">
                    {Number(credit.allocated_amount).toLocaleString('ar-SA', { 
                      style: 'currency', 
                      currency: 'SAR' 
                    })}
                  </span>
                </div>
              </td>
              <td>
                <div className="d-flex align-items-center">
                  <SaudiRiyalIcon size={16} className="me-1 text-primary" />
                  <span className="text-primary fw-bold">
                    {Number(credit.remaining_amount).toLocaleString('ar-SA', { 
                      style: 'currency', 
                      currency: 'SAR' 
                    })}
                  </span>
                </div>
              </td>
              <td>
                <div className="btn-group btn-group-sm">
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDeleteCredit(credit)}
                    title={t('common.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleEditCredit(credit)}
                    title={t('common.edit')}
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientCreditsHistoryTable;