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
        className="form-control-sm"
      />
    </div>
  );
};

export default ClientSearch;