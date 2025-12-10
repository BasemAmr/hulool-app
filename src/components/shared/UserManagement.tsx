import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Shield, Briefcase, UserMinus } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUserCapabilities, useCurrentUserCapabilities } from '../../queries/userQueries';
import { useCreateEmployee, useRemoveEmployeeStatus } from '../../queries/employeeQueries';
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
  const createEmployeeMutation = useCreateEmployee();
  const removeEmployeeStatusMutation = useRemoveEmployeeStatus();

  // Check if current user can manage users
  console.log('Current capabilities:', currentCapabilities);
  const canManageUsers = currentCapabilities?.tm_manage_users || false;

  // Employee status is now directly available in the user object
  const isEmployee = (user: User) => user.employee_id !== null;

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

  const handleMakeEmployee = async (userId: number) => {
    try {
      await createEmployeeMutation.mutateAsync({ user_id: userId });
      
      showToast({
        type: 'success',
        title: 'تم إنشاء الموظف بنجاح',
        message: 'يمكن الآن تكليف هذا المستخدم بمهام'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'خطأ في إنشاء الموظف',
        message: error.message || 'حدث خطأ غير متوقع'
      });
    }
  };

  const handleRemoveEmployee = async (userId: number) => {
    try {
      await removeEmployeeStatusMutation.mutateAsync(userId);
      
      showToast({
        type: 'success',
        title: 'تم إزالة صفة الموظف بنجاح',
        message: 'لن يتمكن هذا المستخدم من تلقي مهام جديدة'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'خطأ في إزالة صفة الموظف',
        message: error.message || 'حدث خطأ غير متوقع'
      });
    }
  };

  if (!canManageUsers) {
    return (
      <div className="text-center p-12 bg-card border border-border rounded-lg">
        <Shield className="text-black mx-auto mb-4" size={48} />
        <h3 className="text-foreground mb-2 text-lg font-semibold">{t('users.noPermission') || 'لا تملك صلاحية إدارة المستخدمين'}</h3>
        <p className="text-black">{t('users.contactAdmin') || 'اتصل بالمدير للحصول على الصلاحيات المطلوبة'}</p>
      </div>
    );
  }

  if (usersLoading) {
    return (
      <div className="text-center p-8">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-black">{t('users.loading') || 'جاري تحميل المستخدمين...'}</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-foreground m-0">
          <Users size={20} />
          {t('users.title') || 'إدارة المستخدمين'}
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground rounded-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.9) 100%)'
          }}
        >
          <UserPlus size={16} />
          {t('users.createNew') || 'إنشاء مستخدم جديد'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h4 className="m-0 mb-6 text-foreground text-lg font-semibold">{t('users.createFormTitle') || 'إنشاء مستخدم جديد'}</h4>
          <form onSubmit={handleCreateUser}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="username" className="block mb-2 text-foreground font-medium text-sm">{t('users.username') || 'اسم المستخدم'}</label>
                <input
                  type="text"
                  id="username"
                  className="base-input"
                  value={createForm.username}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block mb-2 text-foreground font-medium text-sm">{t('users.email') || 'البريد الإلكتروني'}</label>
                <input
                  type="email"
                  id="email"
                  className="base-input"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="display_name" className="block mb-2 text-foreground font-medium text-sm">{t('users.displayName') || 'الاسم المعروض'}</label>
                <input
                  type="text"
                  id="display_name"
                  className="base-input"
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, display_name: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block mb-2 text-foreground font-medium text-sm">{t('users.password') || 'كلمة المرور'}</label>
                <input
                  type="password"
                  id="password"
                  className="base-input"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="px-6 py-3 text-sm font-medium text-primary-foreground rounded-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.9) 100%)'
                }}
              >
                {createUserMutation.isPending ? 
                  (t('users.creating') || 'جاري الإنشاء...') : 
                  (t('users.create') || 'إنشاء')
                }
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 bg-background text-foreground border border-border rounded-md text-sm transition-colors duration-200 hover:bg-card"
              >
                {t('common.cancel') || 'إلغاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {users.map((user: User) => (
          <div key={user.id} className="bg-card border border-border rounded-lg p-6 grid md:grid-cols-[1fr_auto] gap-8 items-start">
            <div>
              <h4 className="m-0 mb-1 text-foreground text-lg font-semibold">{user.display_name || user.username}</h4>
              <p className="m-0 mb-3 text-black text-sm">{user.email}</p>
              <div className="flex gap-2 flex-wrap">
                {user.roles.map(role => (
                  <span key={role} className="px-3 py-1 bg-primary/10 rounded text-xs font-medium capitalize" style={{ color: 'hsl(var(--primary))' }}>{role}</span>
                ))}
              </div>
            </div>
            
            <div className="min-w-[300px]">
              <h5 className="m-0 mb-4 text-foreground text-base font-semibold">{t('users.capabilities') || 'الصلاحيات'}</h5>
              <div className="flex flex-col gap-3">
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
                  <label key={capability.key} className="flex items-center gap-3 cursor-pointer text-sm text-foreground hover:text-primary transition-colors duration-200">
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-primary"
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
            
            <div className="md:col-span-2 pt-4 border-t border-border">
              <h5 className="m-0 mb-3 text-foreground text-base font-semibold">حالة الموظف</h5>
              {isEmployee(user) ? (
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium transition-all duration-200 hover:bg-destructive/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => handleRemoveEmployee(user.id)}
                  disabled={removeEmployeeStatusMutation.isPending}
                >
                  <UserMinus size={16} />
                  {removeEmployeeStatusMutation.isPending ? 'جاري الإزالة...' : 'إزالة كموظف'}
                </button>
              ) : (
                <button 
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground rounded-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.9) 100%)'
                  }}
                  onClick={() => handleMakeEmployee(user.id)}
                  disabled={createEmployeeMutation.isPending}
                >
                  <Briefcase size={16} />
                  {createEmployeeMutation.isPending ? 'جاري الإنشاء...' : 'تعيين كموظف'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
