import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { useSearchClients } from '../../queries/clientQueries';
import { useModalStore } from '../../stores/modalStore';
import { Search, User, Phone, MessageSquare, Plus, Clock, FileText } from 'lucide-react';
import BaseModal from '../ui/BaseModal';

const ClientSearchModal = () => {
  const { t } = useTranslation();
  const closeModal = useModalStore((state) => state.closeModal);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data: clients, isLoading } = useSearchClients(debouncedSearchTerm);

  // Auto-focus search input when modal opens
  useEffect(() => {
    const searchInput = document.getElementById('client-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  const handleSelectClient = (clientId: number) => {
    navigate(`/clients/${clientId}`);
    closeModal();
  };

  const handleAddNewClient = () => {
    // Open client form modal instead of navigating
    closeModal();
    // You can open client form modal here if needed
  };

  const handleWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/966${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title={t('globalSearch.modalTitle') || 'البحث عن عميل'}
      className="max-w-2xl"
    >
      {/* Search Input */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="relative">
          <Search 
            size={18} 
            className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none"
          />
          <input
            id="client-search-input"
            type="text"
            className="base-input pr-10"
            placeholder={t('globalSearch.placeholder') || 'ابحث بالاسم أو رقم الهاتف...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Results */}
      <div className="min-h-[300px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-full py-12 animate-in fade-in duration-300">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 mt-3 mb-0">جاري البحث...</p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !clients?.length && debouncedSearchTerm && (
          <div className="flex flex-col justify-center items-center h-full py-12 animate-in fade-in duration-300">
            <User size={48} className="text-gray-400 mb-3" />
            <h6 className="text-gray-700 mb-2 font-semibold">لا توجد نتائج</h6>
            <p className="text-gray-500 text-sm mb-3">لم يتم العثور على عملاء بهذا البحث</p>
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                color: 'hsl(var(--primary-foreground))',
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.9) 100%)'
              }}
              onClick={handleAddNewClient}
            >
              <Plus size={16} />
              إضافة عميل جديد
            </button>
          </div>
        )}

        {/* Initial State */}
        {!isLoading && !debouncedSearchTerm && (
          <div className="flex flex-col justify-center items-center h-full py-12 animate-in fade-in duration-300">
            <Search size={48} className="text-gray-400 mb-3" />
            <h6 className="text-gray-700 mb-2 font-semibold">ابدأ البحث</h6>
            <p className="text-gray-500 text-sm text-center">
              اكتب اسم العميل أو رقم الهاتف للبحث السريع
            </p>
          </div>
        )}

        {/* Results List */}
        {clients && clients.length > 0 && (
          <div>
            {clients.map((client, index) => (
              <div
                key={client.id}
                className={`p-4 cursor-pointer transition-all duration-200 hover:bg-accent hover:-translate-y-px hover:shadow-sm ${
                  index < clients.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onClick={() => handleSelectClient(client.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center flex-grow">
                    {/* Avatar */}
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center mr-3 text-white text-lg font-semibold shadow-sm border-2 border-white/90 transition-all duration-200 hover:scale-105 hover:shadow-md"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)'
                      }}
                    >
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Client Info */}
                    <div className="flex-grow">
                      <div className="flex items-center mb-1">
                        <User size={14} className="mr-2" style={{ color: 'hsl(var(--primary))' }} />
                        <span 
                          className="font-semibold text-gray-900"
                        >
                          {client.name}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Phone size={14} className="text-gray-500 mr-2" />
                        <span className="text-gray-500 text-sm">
                          {client.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-green-500 text-green-600 hover:bg-green-50 hover:scale-110 transition-all duration-200"
                      onClick={(e) => handleWhatsApp(client.phone, e)}
                      title="فتح واتساب"
                    >
                      <MessageSquare size={16} />
                    </button>
                    
                    <div className="text-gray-400">
                      <FileText size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {clients && clients.length > 0 && (
        <div 
          className="flex items-center gap-1 py-2 px-4 bg-gray-50 border-t border-gray-200"
        >
          <Clock size={14} className="text-gray-500" />
          <small className="text-gray-500">
            {clients.length} نتيجة للبحث
          </small>
        </div>
      )}
    </BaseModal>
  )
};
export default ClientSearchModal;