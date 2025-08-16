import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { useSearchClients } from '../../queries/clientQueries';
import { useModalStore } from '../../stores/modalStore';
import { Search, User, Phone, MessageSquare, Plus, Clock, FileText } from 'lucide-react';
import styles from './ClientSearchModal.module.scss';

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
    <>
      {/* Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={closeModal}
      />
      
      {/* Modal */}
      <div 
        className={`modal fade show d-block ${styles.searchModal}`}
        style={{ zIndex: 1050 }}
        onClick={closeModal}
      >
        <div 
          className="modal-dialog modal-lg modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-xl">
            {/* Header */}
            <div className="modal-header border-0 py-3" style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: 'white'
            }}>
              <div className="d-flex align-items-center">
                <Search size={20} className="me-2" style={{ color: 'white' }} />
                <h5 className="modal-title mb-0 fw-semibold" style={{ color: 'white' }}>
                  {t('globalSearch.modalTitle') || 'البحث عن عميل'}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={closeModal}
              />
            </div>

            {/* Search Input */}
            <div className="p-3 border-bottom" style={{ backgroundColor: 'var(--color-gray-50)' }}>
              <div className="position-relative">
                <Search 
                  size={18} 
                  className="position-absolute top-50 translate-middle-y ms-3" 
                  style={{ 
                    left: '0.5rem',
                    color: 'var(--color-gray-400)'
                  }}
                />
                <input
                  id="client-search-input"
                  type="text"
                  className={`form-control form-control-lg ps-5 border-0 shadow-sm ${styles.searchInput}`}
                  placeholder={t('globalSearch.placeholder') || 'ابحث بالاسم أو رقم الهاتف...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    backgroundColor: 'var(--color-white)',
                    fontSize: 'var(--font-size-base)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-gray-100)',
                    transition: 'var(--transition-fast)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-gold)';
                    e.target.style.boxShadow = '0 0 0 0.2rem rgba(212, 175, 55, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-gray-100)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Results */}
            <div className="modal-body p-0" style={{ minHeight: '300px', maxHeight: '400px' }}>
              {/* Loading State */}
              {isLoading && (
                <div className={`d-flex justify-content-center align-items-center h-100 py-5 ${styles.emptyState}`}>
                  <div className="text-center">
                    <div className={`spinner-border text-gold ${styles.loadingSpinner}`} role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2 mb-0">جاري البحث...</p>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!isLoading && !clients?.length && debouncedSearchTerm && (
                <div className={`d-flex flex-column justify-content-center align-items-center h-100 py-5 ${styles.emptyState}`}>
                  <User size={48} className="text-muted mb-3" />
                  <h6 className="text-muted mb-2">لا توجد نتائج</h6>
                  <p className="text-muted small mb-3">لم يتم العثور على عملاء بهذا البحث</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleAddNewClient}
                  >
                    <Plus size={16} className="me-1" />
                    إضافة عميل جديد
                  </button>
                </div>
              )}

              {/* Initial State */}
              {!isLoading && !debouncedSearchTerm && (
                <div className={`d-flex flex-column justify-content-center align-items-center h-100 py-5 ${styles.emptyState}`}>
                  <Search size={48} className="text-muted mb-3" />
                  <h6 className="text-muted mb-2">ابدأ البحث</h6>
                  <p className="text-muted small text-center">
                    اكتب اسم العميل أو رقم الهاتف للبحث السريع
                  </p>
                </div>
              )}

              {/* Results List */}
              {clients && clients.length > 0 && (
                <div className="list-group list-group-flush">
                  {clients.map((client, index) => (
                    <div
                      key={client.id}
                      className={`list-group-item list-group-item-action border-0 p-3 cursor-pointer ${styles.clientItem}`}
                      onClick={() => handleSelectClient(client.id)}
                      style={{
                        borderBottom: index < clients.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center flex-grow-1">
                          {/* Avatar */}
                          <div 
                            className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${styles.clientAvatar}`}
                            style={{
                              width: '44px',
                              height: '44px',
                              color: 'var(--color-white)',
                              fontSize: 'var(--font-size-lg)',
                              fontWeight: 'var(--font-weight-semibold)'
                            }}
                          >
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Client Info */}
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <User size={14} className="text-gold me-2" />
                              <span 
                                className="fw-semibold"
                                style={{ 
                                  color: 'var(--color-primary)',
                                  fontSize: 'var(--font-size-base)'
                                }}
                              >
                                {client.name}
                              </span>
                            </div>
                            <div className="d-flex align-items-center">
                              <Phone size={14} className="text-muted me-2" />
                              <span 
                                className="text-muted small"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                              >
                                {client.phone}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex align-items-center gap-2">
                          <button
                            className={`btn btn-sm btn-outline-success rounded-circle p-2 ${styles.actionButton}`}
                            onClick={(e) => handleWhatsApp(client.phone, e)}
                            title="فتح واتساب"
                            style={{
                              width: '36px',
                              height: '36px',
                              border: '1px solid var(--color-success)',
                            }}
                          >
                            <MessageSquare size={16} />
                          </button>
                          
                          <div className="text-muted">
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
                className="modal-footer border-0 py-2 px-3"
                style={{ backgroundColor: 'var(--color-gray-50)' }}
              >
                <small className="text-muted d-flex align-items-center">
                  <Clock size={14} className="me-1" />
                  {clients.length} نتيجة للبحث
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientSearchModal;