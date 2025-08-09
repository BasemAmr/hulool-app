import type { Receivable } from '../../api/types';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { CreditCard, History } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { Link } from 'react-router-dom';
import ReceivablesSummaryRow from './ReceivablesSummaryRow';

interface ReceivablesTableProps {
  receivables: Receivable[];
  isLoading: boolean;
  showClientColumn?: boolean;
  onSettlePayment: (receivable: Receivable) => void;
  onShowHistory: (receivable: Receivable) => void;
}

const ReceivablesTable = ({ receivables, isLoading, showClientColumn = false, onSettlePayment, onShowHistory }: ReceivablesTableProps) => {
  const { t } = useTranslation();

  if (isLoading) return <div>Loading...</div>;
  if (!receivables.length) return <div className="p-4 text-center text-muted">{t('common.noResults')}</div>;

  // Sort receivables by newest first (created_at descending)
  const sortedReceivables = [...receivables].sort((a, b) => {
    const dateA = new Date(a.created_at || '').getTime();
    const dateB = new Date(b.created_at || '').getTime();
    return dateB - dateA; // Newest first
  });

  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead>
          <tr>
            {showClientColumn && <th>{t('receivables.tableHeaderClient')}</th>}
            <th>{t('receivables.tableHeaderDescription')}</th>
            <th>{t('receivables.tableHeaderTotal')}</th>
            <th>{t('receivables.tableHeaderPaid')}</th>
            <th>{t('receivables.tableHeaderRemaining')}</th>
            <th>{t('receivables.tableHeaderDueDate')}</th>
            <th>{t('receivables.tableHeaderSource')}</th>
            <th className="text-end">{t('receivables.tableHeaderActions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedReceivables.map((item) => (
            <tr key={item.id}>
              {showClientColumn && (
                <td>
                    <Link to={`/clients/${item.client.id}?mode=receivables`} className="text-decoration-none">
                    <div>{item.client.name}</div>
                    </Link>
                  <small className="text-muted">{item.client.phone}</small>
                </td>
              )}
              <td>{item.description}</td>
              <td>{item.amount}</td>
              <td>{item.total_paid}</td>
              <td className={item.remaining_amount > 0 ? 'text-danger' : 'text-success'}>
                {item.remaining_amount}
              </td>
              <td>{formatDate(item.due_date)}</td>
              <td>
                <span className={`badge ${item.task_id ? 'bg-info' : 'bg-secondary'}`}>
                  {item.task_id ? t('receivables.sourceTask') : t('receivables.sourceManual')}
                </span>
              </td>
              <td className="text-end">
                <Button size="sm" variant="outline-primary" onClick={() => onShowHistory(item)} className="me-2" title="Payment History">
                  <History size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => onSettlePayment(item)}
                  disabled={item.remaining_amount <= 0}
                >
                  <CreditCard size={16} className="me-1" />
                  {t('receivables.settlePayment')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <ReceivablesSummaryRow receivables={sortedReceivables} showClientColumn={showClientColumn} />
      </table>
    </div>
  );
};

export default ReceivablesTable;