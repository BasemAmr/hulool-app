import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useSearchClients, useCreateClient } from '../../queries/clientQueries';
import type { Client, ClientType } from '../../api/types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { User, Plus, Loader2 } from 'lucide-react';

interface ClientSearchCompactProps {
  onSelect: (client: Client) => void;
  onCreate?: (client: Client) => void;
  label?: string;
  disabled?: boolean;
}

const ClientSearchCompact = ({ onSelect, onCreate, label, disabled }: ClientSearchCompactProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const { data: clients = [], isLoading } = useSearchClients(debouncedSearchTerm);
  const [showCreate, setShowCreate] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientType, setNewClientType] = useState<ClientType>('Other');
  const [newClientDriveLink, setNewClientDriveLink] = useState('');
  const createClientMutation = useCreateClient();

  useEffect(() => {
    setShowCreate(false);
  }, [debouncedSearchTerm]);

  const handleSelect = (client: Client) => {
    setSearchTerm('');
    onSelect(client);
  };

  const handleCreate = () => {
    if (!newClientName || !newClientPhone || !newClientDriveLink) return;
    createClientMutation.mutate(
      { name: newClientName, phone: newClientPhone, type: newClientType, google_drive_link: newClientDriveLink },
      {
        onSuccess: (client) => {
          setShowCreate(false);
          setNewClientName('');
          setNewClientPhone('');
          setNewClientType('Other');
          setNewClientDriveLink('');
          onCreate?.(client);
          onSelect(client);
        },
      }
    );
  };

  return (
    <div className="client-search-compact">
      <Input
        label={label || 'ابحث عن عميل بالاسم أو الهاتف'}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        disabled={disabled}
        placeholder="بحث..."
      />
      {isLoading && (
        <div className="text-center py-2">
          <Loader2 className="spin" size={20} />
          <style>{`
            .spin {
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      {!isLoading && debouncedSearchTerm && clients.length > 0 && (
        <div className="list-group shadow-sm mb-2">
          {clients.map(client => (
            <button
              key={client.id}
              type="button"
              className="list-group-item list-group-item-action d-flex align-items-center"
              onClick={() => handleSelect(client)}
            >
              <User size={18} className="me-2 text-gold" />
              <span>{client.name}</span>
              <span className="ms-auto text-muted small">{client.phone}</span>
            </button>
          ))}
        </div>
      )}
      {!isLoading && debouncedSearchTerm && clients.length === 0 && (
        <div className="mb-2">
          <div className="alert alert-info py-2 px-3 mb-2 small">لا يوجد عميل بهذا الاسم أو الرقم.</div>
        </div>
      )}
      {!isLoading && !showCreate && (
        <div className="mb-2">
          <Button type="button" variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} className="me-1" /> إضافة عميل جديد
          </Button>
        </div>
      )}
      {showCreate && (
        <div className="border rounded p-2 mb-2 bg-light">
          <Input
            label="اسم العميل"
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            className="mb-2"
          />
          <Input
            label="رقم الجوال"
            value={newClientPhone}
            onChange={e => setNewClientPhone(e.target.value)}
            className="mb-2"
          />
          <div className="mb-2">
            <label className="form-label">نوع العميل</label>
            <select 
              className="form-select"
              value={newClientType}
              onChange={e => setNewClientType(e.target.value as ClientType)}
            >
              <option value="Government">حكومي</option>
              <option value="RealEstate">عقاري</option>
              <option value="Accounting">محاسبي</option>
              <option value="Other">أخرى</option>
            </select>
          </div>
          <Input
            label="رابط جوجل درايف"
            value={newClientDriveLink}
            onChange={e => setNewClientDriveLink(e.target.value)}
            className="mb-2"
          />
          <div className="d-flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={createClientMutation.isPending}
              onClick={handleCreate}
              disabled={!newClientName || !newClientPhone || !newClientDriveLink}
            >
              حفظ العميل
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSearchCompact;
