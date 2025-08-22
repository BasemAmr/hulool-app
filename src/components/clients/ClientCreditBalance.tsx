import { useGetClientCredits } from '../../queries/clientCreditQueries';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';

const ClientCreditBalance = ({ clientId }: { clientId: number }) => {
  const { data, isLoading } = useGetClientCredits(clientId);

  if (isLoading) {
    return <div className="text-muted small">Loading credit...</div>;
  }

  const balance = data?.balance || 0;

  return (
    <div className="card bg-light border-warning mb-3">
      <div className="card-body text-center">
        <h6 className="card-title text-warning">الرصيد المتاح</h6>
        <p className="card-text fs-4 fw-bold text-dark d-flex align-items-center justify-content-center">
          <SaudiRiyalIcon size={24} className="me-2" />
          {balance.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
        </p>
      </div>
    </div>
  );
};
export default ClientCreditBalance;