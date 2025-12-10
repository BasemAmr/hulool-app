import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useSearchClients, useCreateClient } from '../../queries/clientQueries';
import type { Client } from '../../api/types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import RegionSelect from './RegionSelect';
import { useToast } from '../../hooks/useToast';
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
  const [newClientRegionId, setNewClientRegionId] = useState<number | null>(null);
  const [newClientDriveLink, setNewClientDriveLink] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const createClientMutation = useCreateClient();
  const { error: toast } = useToast();

  useEffect(() => {
    setShowCreate(false);
  }, [debouncedSearchTerm]);

  const handleSelect = (client: Client) => {
    setSearchTerm('');
    onSelect(client);
  };

  const handleCreate = () => {
    if (!newClientName || !newClientPhone) return;
    createClientMutation.mutate(
      { name: newClientName, phone: newClientPhone, region_id: newClientRegionId, google_drive_link: newClientDriveLink, notes: newClientNotes },
      {
        onSuccess: (client) => {
          setShowCreate(false);
          setNewClientName('');
          setNewClientPhone('');
          setNewClientRegionId(null);
          setNewClientDriveLink('');
          setNewClientNotes('');
          onCreate?.(client);
          onSelect(client);
        },
        onError: (error: any) => {
          console.error('Client creation error:', error);
          const errorMessage = error?.response?.data?.message;
          
          // Check for duplicate phone number error
          if (errorMessage && errorMessage.includes('phone number already exists')) {
            toast('خطأ في التسجيل', 'رقم الجوال مسجل مسبقاً في النظام. يرجى استخدام رقم جوال آخر.');
          } else {
            toast('خطأ في إنشاء العميل', errorMessage || 'حدث خطأ أثناء إنشاء العميل');
          }
        }
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
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}
      {!isLoading && debouncedSearchTerm && clients.length > 0 && (
        <div className="shadow-sm rounded-lg overflow-hidden mb-2 border border-gray-200">
          {clients.map(client => (
            <button
              key={client.id}
              type="button"
              className="w-full flex items-center px-4 py-3 border-b border-gray-100 last:border-b-0 bg-white hover:bg-muted transition-colors duration-150 text-right"
              onClick={() => handleSelect(client)}
            >
              <User size={18} className="mr-2" style={{ color: 'hsl(var(--primary))' }} />
              <span className="text-gray-900">{client.name}</span>
              <span className="mr-auto text-gray-500 text-sm">{client.phone}</span>
            </button>
          ))}
        </div>
      )}
      {!isLoading && debouncedSearchTerm && clients.length === 0 && (
        <div className="mb-2">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 py-2 px-3 rounded-lg mb-2 text-sm">
            لا يوجد عميل بهذا الاسم أو الرقم.
          </div>
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
        <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50">
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
          <RegionSelect
            value={newClientRegionId}
            onChange={setNewClientRegionId}
            label="منطقة العميل"
            placeholder="اختر منطقة"
            allowCreate={true}
            className="mb-2"
          />
          <Input
            label="رابط جوجل درايف"
            value={newClientDriveLink}
            onChange={e => setNewClientDriveLink(e.target.value)}
            className="mb-2"
          />
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">ملاحظات</label>
            <textarea 
              className="base-input w-full resize-y"
              value={newClientNotes}
              onChange={e => setNewClientNotes(e.target.value)}
              rows={3}
              placeholder="أدخل ملاحظات العميل..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={createClientMutation.isPending}
              onClick={handleCreate}
              disabled={!newClientName || !newClientPhone}
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
