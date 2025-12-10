import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';

interface ClientSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ClientSearch = ({ value, onChange, className = '' }: ClientSearchProps) => {
  const { t } = useTranslation();

  return (
    <div className={`client-search ${className}`}>
      <Input
        name="search"
        placeholder={t('clients.searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all min-w-[200px]"
      />
    </div>
  );
};

export default ClientSearch;