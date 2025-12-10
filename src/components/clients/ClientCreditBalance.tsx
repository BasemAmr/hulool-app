import { useGetClientCredits } from '../../queries/clientCreditQueries';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';

const ClientCreditBalance = ({ clientId }: { clientId: number }) => {
  const { data, isLoading } = useGetClientCredits(clientId);

  if (isLoading) {
    return <div className="text-black text-sm">Loading credit...</div>;
  }

  const balance = data?.balance || 0;

  return (
    <div className="rounded-lg bg-yellow-50 border-2 border-yellow-400 shadow-sm mb-3">
      <div className="text-center p-4">
        <h6 className="text-yellow-600 font-bold text-lg mb-2">الرصيد المتاح</h6>
        <p className="text-black text-3xl font-bold flex items-center justify-center">
          <SaudiRiyalIcon size={28} className="me-2" />
          {balance.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
        </p>
      </div>
    </div>
  );
};
export default ClientCreditBalance;