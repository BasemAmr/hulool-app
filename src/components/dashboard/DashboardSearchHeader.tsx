import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../stores/modalStore';
import Button from '../ui/Button';
import Logo from '../ui/Logo';
import { Plus, Receipt } from 'lucide-react';
import styles from '../layout/Layout.module.scss';

const DashboardSearchHeader = () => {
    const { t } = useTranslation();
    const openModal = useModalStore((state) => state.openModal);

    const handleAddTask = () => openModal('taskForm', {});
    const handleAddReceivable = () => openModal('manualReceivable', {});
    const handleSearchFocus = () => openModal('clientSearch', {});

    return (
        <div className="premium-header-card shadow-lg mb-4" style={{
            background: 'var(--gradient-gold)',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
            border: '2px solid var(--color-gold)'
        }}>
            <div className="card-body p-4">
                <div className="row align-items-center g-4">
                    {/* Logo Section */}
                    <div className="col-lg-2 col-md-3">
                        <div className={styles.logoContainer}>
                            <Logo />
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="col-lg-6 col-md-5">
                        <div className="search-container position-relative">
                            <div className="input-group input-group-lg">
                                <input
                                    type="text"
                                    className="form-control border-0"
                                    placeholder={t('dashboard.searchPlaceholder')}
                                    onFocus={handleSearchFocus}
                                    readOnly
                                    style={{
                                        fontSize: 'var(--font-size-base)',
                                        padding: '12px 20px',
                                        backgroundColor: 'var(--color-white)',
                                        color: 'var(--color-primary)',
                                        borderRadius: 'var(--border-radius)',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="col-lg-4 col-md-4">
                        <div className="action-buttons d-flex gap-2 justify-content-md-end">
                            <Button
                                onClick={handleAddTask}
                                className="btn-primary flex-fill flex-md-grow-0"
                                style={{
                                    borderRadius: 'var(--border-radius)',
                                    padding: '10px 20px',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    fontSize: 'var(--font-size-sm)',
                                    boxShadow: 'var(--shadow-md)',
                                    transition: 'var(--transition-normal)'
                                }}
                            >
                                <Plus size={16} className="me-2" />
                                {t('dashboard.addTask')}
                            </Button>
                            <Button
                                onClick={handleAddReceivable}
                                className="btn-gold flex-fill flex-md-grow-0"
                                style={{
                                    borderRadius: 'var(--border-radius)',
                                    padding: '10px 20px',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    fontSize: 'var(--font-size-sm)',
                                    boxShadow: 'var(--shadow-md)',
                                    transition: 'var(--transition-normal)',
                                    backgroundColor: '#d4af37',
                                    borderColor: '#d4af37',
                                    color: 'white'
                                }}
                            >
                                <Receipt size={16} className="me-2" />
                                {t('dashboard.addManualReceivable')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSearchHeader;