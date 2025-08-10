import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Shield } from 'lucide-react';
import styles from './UserManagement.module.scss';
import { useUsers, useCreateUser, useUpdateUserCapabilities, useCurrentUserCapabilities } from '../../queries/userQueries';
import { useToast } from '../../hooks/useToast';
import type { CreateUserRequest, User } from '../../api/types';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    display_name: '',
    role: 'subscriber'
  });

  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: currentCapabilities } = useCurrentUserCapabilities();
  const createUserMutation = useCreateUser();
  const updateCapabilitiesMutation = useUpdateUserCapabilities();

  // Check if current user can manage users
  console.log('Current capabilities:', currentCapabilities);
  const canManageUsers = currentCapabilities?.tm_manage_users || false;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createUserMutation.mutateAsync(createForm);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        display_name: '',
        role: 'subscriber'
      });
      setShowCreateForm(false);
      
      showToast({
        type: 'success',
        title: t('users.createSuccess') || 'تم إنشاء المستخدم بنجاح'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('users.createError') || 'خطأ في إنشاء المستخدم',
        message: error.message || 'حدث خطأ غير متوقع'
      });
    }
  };

  const handleCapabilityToggle = async (userId: number, capability: string, currentValue: boolean) => {
    try {
      await updateCapabilitiesMutation.mutateAsync({
        userId,
        capabilities: { [capability]: !currentValue }
      });
      
      showToast({
        type: 'success',
        title: t('users.capabilityUpdateSuccess') || 'تم تحديث الصلاحيات بنجاح'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('users.capabilityUpdateError') || 'خطأ في تحديث الصلاحيات',
        message: error.message || 'حدث خطأ غير متوقع'
      });
    }
  };

  if (!canManageUsers) {
    return (
      <div className={styles.noPermission}>
        <Shield className={styles.noPermissionIcon} size={48} />
        <h3>{t('users.noPermission') || 'لا تملك صلاحية إدارة المستخدمين'}</h3>
        <p>{t('users.contactAdmin') || 'اتصل بالمدير للحصول على الصلاحيات المطلوبة'}</p>
      </div>
    );
  }

  if (usersLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>{t('users.loading') || 'جاري تحميل المستخدمين...'}</p>
      </div>
    );
  }

  return (
    <div className={styles.userManagement}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          <Users size={20} />
          {t('users.title') || 'إدارة المستخدمين'}
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={styles.createButton}
        >
          <UserPlus size={16} />
          {t('users.createNew') || 'إنشاء مستخدم جديد'}
        </button>
      </div>

      {showCreateForm && (
        <div className={styles.createForm}>
          <h4>{t('users.createFormTitle') || 'إنشاء مستخدم جديد'}</h4>
          <form onSubmit={handleCreateUser}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="username">{t('users.username') || 'اسم المستخدم'}</label>
                <input
                  type="text"
                  id="username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="email">{t('users.email') || 'البريد الإلكتروني'}</label>
                <input
                  type="email"
                  id="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="display_name">{t('users.displayName') || 'الاسم المعروض'}</label>
                <input
                  type="text"
                  id="display_name"
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, display_name: e.target.value }))}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="password">{t('users.password') || 'كلمة المرور'}</label>
                <input
                  type="password"
                  id="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className={styles.submitButton}
              >
                {createUserMutation.isPending ? 
                  (t('users.creating') || 'جاري الإنشاء...') : 
                  (t('users.create') || 'إنشاء')
                }
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className={styles.cancelButton}
              >
                {t('common.cancel') || 'إلغاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.usersList}>
        {users.map((user: User) => (
          <div key={user.id} className={styles.userCard}>
            <div className={styles.userInfo}>
              <h4 className={styles.userName}>{user.display_name || user.username}</h4>
              <p className={styles.userEmail}>{user.email}</p>
              <div className={styles.userRoles}>
                {user.roles.map(role => (
                  <span key={role} className={styles.role}>{role}</span>
                ))}
              </div>
            </div>
            
            <div className={styles.userCapabilities}>
              <h5>{t('users.capabilities') || 'الصلاحيات'}</h5>
              <div className={styles.capabilityList}>
                {[
                  { key: 'tm_manage_users', label: t('users.capability.manageUsers') || 'إدارة المستخدمين' },
                  { key: 'tm_delete_any_task', label: t('users.capability.deleteAnyTask') || 'حذف أي مهمة' },
                  { key: 'tm_delete_any_receivable', label: t('users.capability.deleteAnyReceivable') || 'حذف أي مستحقات' },
                  { key: 'tm_delete_any_payment', label: t('users.capability.deleteAnyPayment') || 'حذف أي دفعة' },
                  { key: 'tm_view_receivables_amounts', label: t('users.capability.viewReceivablesAmounts') || 'عرض مبالغ المستحقات' },
                  { key: 'tm_view_paid_receivables', label: t('users.capability.viewPaidReceivables') || 'عرض المستحقات المسددة' },
                  { key: 'tm_view_overdue_receivables', label: t('users.capability.viewOverdueReceivables') || 'عرض المستحقات المتأخرة' },
                  { key: 'tm_view_all_receivables', label: t('users.capability.viewAllReceivables') || 'عرض جميع المستحقات' }
                ].map(capability => (
                  <label key={capability.key} className={styles.capabilityItem}>
                    <input
                      type="checkbox"
                      checked={user.capabilities[capability.key] || false}
                      onChange={() => handleCapabilityToggle(
                        user.id, 
                        capability.key, 
                        user.capabilities[capability.key] || false
                      )}
                      disabled={updateCapabilitiesMutation.isPending}
                    />
                    <span>{capability.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
