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
        className="form-control m-0"
        style={{
          borderRadius: '6px',
          border: '1px solid #ddd',
          fontSize: '14px',
          padding: '8px 12px',
          minWidth: '200px'
        }}
      />
    </div>
  );
};

export default ClientSearch;