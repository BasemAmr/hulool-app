import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import { useGetClientReceivables } from '../../queries/receivableQueries';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/dateUtils';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId: number;
}

const PaymentHistoryModal = ({ isOpen, onClose, clientName, clientId }: PaymentHistoryModalProps) => {
  const [viewMode, setViewMode] = useState<'receivables' | 'payments'>('receivables');
  const { t } = useTranslation();

  // Fetch real receivables data for this client
  const { data: receivablesData, isLoading, error } = useGetClientReceivables(clientId);

  const receivables = receivablesData?.statementItems || [];

  // Calculate real stats from fetched data - StatementItems have debit/credit instead of amount/total_paid
  const stats = {
    totalDue: receivables.reduce((sum, r) => sum + r.debit, 0),
    totalPaid: receivables.reduce((sum, r) => sum + r.credit, 0),
    totalRemaining: receivables.reduce((sum, r) => sum + (r.remaining_amount || 0), 0),
    totalCount: receivables.length
  };

  // Extract all payments from receivables - StatementItems have payments array
  const allPayments = receivables.flatMap(statementItem => 
    statementItem.payments?.map(payment => ({
      ...payment,
      receivableDescription: statementItem.description
    })) || []
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1070 }}>
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header" style={{ 
              background: 'var(--gradient-gold)', 
              color: 'var(--color-white)' 
            }}>
              <div className="d-flex align-items-center">
                <CreditCard size={20} className="me-2" />
                <h5 className="modal-title mb-0 fw-bold">
                  {t('receivables.paymentHistoryFor', { clientName: clientName })}
                </h5>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} />
            </div>

            <div className="modal-body p-0">
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-warning" role="status">
                    <span className="visually-hidden">جاري التحميل...</span>
                  </div>
                  <p className="mt-2 text-muted">جاري تحميل بيانات المدفوعات...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <div className="text-danger mb-3">
                    <i className="fas fa-exclamation-triangle fa-2x"></i>
                  </div>
                  <p className="text-danger">حدث خطأ في تحميل البيانات</p>
                  <Button variant="outline-primary" size="sm" onClick={() => window.location.reload()}>
                    إعادة المحاولة
                  </Button>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="row g-2 p-3 bg-light">
                <div className="col-3">
                  <div className="card text-center border-warning">
                    <div className="card-body py-2">
                      <div className="fw-bold text-warning">{stats.totalDue.toLocaleString()}</div>
                      <small>إجمالي المستحقات</small>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="card text-center border-success">
                    <div className="card-body py-2">
                      <div className="fw-bold text-success">{stats.totalPaid.toLocaleString()}</div>
                      <small>إجمالي المدفوع</small>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="card text-center border-danger">
                    <div className="card-body py-2">
                      <div className="fw-bold text-danger">{stats.totalRemaining.toLocaleString()}</div>
                      <small>إجمالي المتبقي</small>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="card text-center border-info">
                    <div className="card-body py-2">
                      <div className="fw-bold text-info">{stats.totalCount}</div>
                      <small>عدد المستحقات</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="p-3 border-bottom">
                <div className="btn-group w-100">
                  <button 
                    className={`btn ${viewMode === 'receivables' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setViewMode('receivables')}
                  >
                    المستحقات
                  </button>
                  <button 
                    className={`btn ${viewMode === 'payments' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setViewMode('payments')}
                  >
                    تاريخ المدفوعات
                  </button>
                </div>
              </div>

              {/* Content based on view mode */}
              <div className="table-responsive">
                {viewMode === 'receivables' ? (
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>الوصف</th>
                        <th>المبلغ المستحق</th>
                        <th>المبلغ المدفوع</th>
                        <th>المبلغ المتبقي</th>
                        <th>تاريخ الأمر</th>
                        <th>الدفع بواسطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivables.map((statementItem) => (
                        <tr key={statementItem.id}>
                          <td className="fw-semibold">{statementItem.description}</td>
                          <td className="text-warning fw-bold">{statementItem.debit.toLocaleString()}</td>
                          <td className="text-success fw-bold">{statementItem.credit.toLocaleString()}</td>
                          <td className="text-danger fw-bold">{(statementItem.remaining_amount || 0).toLocaleString()}</td>
                          <td>{formatDate(statementItem.date)}</td>
                          <td>
                            <span className="badge bg-info">
                              {(statementItem.remaining_amount || 0) === 0 ? 'مدفوع كاملاً' : 'جزئي'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>الوصف</th>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                        <th>طريقة الدفع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPayments.map((payment: any) => (
                        <tr key={payment.id}>
                          <td className="fw-semibold">{payment.receivableDescription}</td>
                          <td className="text-success fw-bold">{payment.amount.toLocaleString()}</td>
                          <td>{payment.payment_date}</td>
                          <td>
                            <span className="badge bg-success">{payment.method}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
                </>
              )}
            </div>

            <div className="modal-footer bg-light">
              <Button variant="secondary" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentHistoryModal;
