import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Receivable } from '../../api/types';

interface ReceivablesSummaryRowProps {
  receivables: Receivable[];
  showClientColumn?: boolean;
}

const ReceivablesSummaryRow = ({ receivables, showClientColumn = false }: ReceivablesSummaryRowProps) => {
    const { t } = useTranslation();
    
    const summary = useMemo(() => {
        if (!receivables?.length) {
            return {
                totalAmount: 0,
                totalPaid: 0,
                totalRemaining: 0
            };
        }

        return {
            totalAmount: receivables.reduce((sum, item) => sum + item.amount, 0),
            totalPaid: receivables.reduce((sum, item) => sum + item.total_paid, 0),
            totalRemaining: receivables.reduce((sum, item) => sum + item.remaining_amount, 0)
        };
    }, [receivables]);

    if (!receivables?.length) return null;

    return (
        <tfoot className="table-dark">
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
                {showClientColumn && <td className="fw-bold text-muted">{t('receivables.summary')}</td>}
                <td className="fw-bold text-primary">{t('receivables.totals')}</td>
                <td className="fw-bold text-success">{summary.totalAmount.toLocaleString()}</td>
                <td className="fw-bold text-info">{summary.totalPaid.toLocaleString()}</td>
                <td className={`fw-bold ${summary.totalRemaining > 0 ? 'text-danger' : 'text-success'}`}>
                    {summary.totalRemaining.toLocaleString()}
                </td>
                <td className="text-muted">-</td>
                <td className="text-muted">-</td>
                <td className="text-muted">-</td>
            </tr>
        </tfoot>
    );
};

export default ReceivablesSummaryRow;
