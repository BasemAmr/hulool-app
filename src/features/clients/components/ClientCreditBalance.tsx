import { useGetClientCredits } from '@/features/clients/api/clientCreditQueries';
import SaudiRiyalIcon from '@/shared/ui/icons/SaudiRiyalIcon';

const ClientCreditBalance = ({ clientId }: { clientId: number }) => {
  const { data, isLoading } = useGetClientCredits(clientId);

  if (isLoading) {
    return <div className="text-text-primary text-sm">Loading credit...</div>;
  }

  const balance = data?.balance || 0;

  return (
    <div className="rounded-lg bg-status-warning-bg border-2 border-status-warning-border shadow-sm mb-3">
      <div className="text-center p-4">
        <h6 className="text-status-warning-text font-bold text-lg mb-2">الرصيد المتاح</h6>
        <p className="text-text-primary text-3xl font-bold flex items-center justify-center">
          <SaudiRiyalIcon size={28} className="me-2" />
          {balance.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
        </p>
      </div>
    </div>
  );
};
export default ClientCreditBalance;