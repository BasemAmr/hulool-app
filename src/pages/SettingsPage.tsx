import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Settings, Image as ImageIcon } from 'lucide-react';
import styles from './SettingsPage.module.scss';
import { useToast } from '../hooks/useToast';
import { setPageBackground, removePageBackground, getPageBackground } from '../utils/backgroundUtils';
import UserManagement from '../components/shared/UserManagement';
import PasswordResetForm from '../components/settings/PasswordResetForm';
import { useSetMyPassword, /*useSetEmployeePassword, useUsers*/ } from '../queries/userQueries';
// import { useAuthStore } from '../stores/authStore';

interface BackgroundSettings {
  dashboard: string;
  tasks: string;
  clients: string;
  receivables: string;
  clientProfile: string;
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  
  // NEW: Auth and password management
  // const { user, isAdmin } = useAuthStore();
  const setMyPasswordMutation = useSetMyPassword();
  // const setEmployeePasswordMutation = useSetEmployeePassword();
  // const { data: users = [] } = useUsers();
  
  // Background settings state
  const [backgrounds, setBackgrounds] = useState<BackgroundSettings>({
    dashboard: getPageBackground('dashboard'),
    tasks: getPageBackground('tasks'),
    clients: getPageBackground('clients'),
    receivables: getPageBackground('receivables'),
    clientProfile: getPageBackground('clientProfile'),
  });

  // File input refs for each background type
  const fileInputRefs = {
    dashboard: useRef<HTMLInputElement>(null),
    tasks: useRef<HTMLInputElement>(null),
    clients: useRef<HTMLInputElement>(null),
    receivables: useRef<HTMLInputElement>(null),
    clientProfile: useRef<HTMLInputElement>(null),
  };

  const uploadImageToWordPress = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'background');

    // Use the custom API endpoint from our plugin
    const wpApiUrl = import.meta.env.VITE_API_MEDIA_URL || `${window.location.origin}/wordpress`;
    const authStorage = localStorage.getItem('hulool-auth-storage');
    if (!authStorage) {
        throw new Error('Authentication not found');
    }

    const { state } = JSON.parse(authStorage);
    if (!state?.token) {
        throw new Error('Authentication token not found');
    }

    const response = await fetch(`${wpApiUrl}/wp-json/hulool/v1/media/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${state.token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
    }

    const result = await response.json();
    return result.source_url || result.url;
  };

  const handleImageUpload = async (pageType: keyof BackgroundSettings, file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'error',
        title: t('settings.uploadError') || 'خطأ في الرفع',
        message: 'الملف المختار ليس صورة'
      });
      return;
    }

    setUploading(pageType);
    
    try {
      const imageUrl = await uploadImageToWordPress(file);
      
      // Update state and localStorage
      const newBackgrounds = { ...backgrounds, [pageType]: imageUrl };
      setBackgrounds(newBackgrounds);
      setPageBackground(pageType, imageUrl);
      
      showToast({
        type: 'success',
        title: t('settings.uploadSuccess') || 'تم رفع الصورة بنجاح'
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      showToast({
        type: 'error',
        title: t('settings.uploadError') || 'خطأ في الرفع',
        message: 'حدث خطأ أثناء رفع الصورة'
      });
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveBackground = (pageType: keyof BackgroundSettings) => {
    const newBackgrounds = { ...backgrounds, [pageType]: '' };
    setBackgrounds(newBackgrounds);
    removePageBackground(pageType);
    
    showToast({
      type: 'success',
      title: t('settings.removeSuccess') || 'تم حذف الصورة بنجاح'
    });
  };

  const backgroundOptions = [
    { key: 'dashboard' as const, label: t('settings.dashboardBackground') || 'خلفية لوحة التحكم' },
    { key: 'tasks' as const, label: t('settings.tasksBackground') || 'خلفية صفحة المهام' },
    { key: 'clients' as const, label: t('settings.clientsBackground') || 'خلفية صفحة العملاء' },
    { key: 'receivables' as const, label: t('settings.receivablesBackground') || 'خلفية صفحة المستحقات' },
    { key: 'clientProfile' as const, label: t('settings.clientProfileBackground') || 'خلفية ملف العميل' },
  ];

  // NEW: Password management handlers
  const handleSetMyPassword = async (password: string) => {
    await setMyPasswordMutation.mutateAsync({ new_password: password });
    showToast({ type: 'success', title: 'Password Updated' });
  };

  // const handleSetEmployeePassword = async (userId: number, password: string) => {
  //   await setEmployeePasswordMutation.mutateAsync({ userId, new_password: password });
  //   showToast({ type: 'success', title: 'Employee Password Updated' });
  // };

  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <Settings className={styles.titleIcon} size={28} />
          <h1 className={styles.pageTitle}>
            {t('settings.title') || 'الإعدادات'}
          </h1>
        </div>
      </div>

      <div className={styles.content}>
        {/* User Management Section */}
        <div className={styles.section}>
          <UserManagement />
        </div>

        {/* NEW: Password Management Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Password Management</h2>
          
          {/* Change Own Password */}
          <div className="mb-4">
            <h3 className="h5">Change My Password</h3>
            <p className="text-muted small">Update your short password for logging into this application.</p>
            <PasswordResetForm
              onSubmit={handleSetMyPassword}
              isLoading={setMyPasswordMutation.isPending}
            />
          </div>
          
          {/* Admin: Reset Employee Passwords
          {isAdmin() && (
            <div className="mt-4 pt-4 border-top">
              <h3 className="h5">Reset Employee Passwords</h3>
              {users.filter(u => u.id !== user?.id && u.employee_id).map(employee => (
                <div key={employee.id} className="mb-3 p-3 border rounded">
                  <p className="fw-bold mb-1">{employee.display_name}</p>
                  <PasswordResetForm
                    onSubmit={(password) => handleSetEmployeePassword(employee.id, password)}
                    isLoading={setEmployeePasswordMutation.isPending && setEmployeePasswordMutation.variables?.userId === employee.id}
                  />
                </div>
              ))}
            </div>
          )} */}
        </div>

        {/* Page Backgrounds Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <ImageIcon size={20} />
            {t('settings.pageBackgrounds') || 'خلفيات الصفحات'}
          </h2>
          
          <div className={styles.backgroundGrid}>
            {backgroundOptions.map((option) => (
              <div key={option.key} className={styles.backgroundCard}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{option.label}</h3>
                </div>
                
                <div className={styles.cardContent}>
                  {backgrounds[option.key] ? (
                    <div className={styles.imagePreview}>
                      <img 
                        src={backgrounds[option.key]} 
                        alt={option.label}
                        className={styles.previewImage}
                      />
                      <div className={styles.imageActions}>
                        <button
                          onClick={() => handleRemoveBackground(option.key)}
                          className={styles.removeButton}
                          title={t('settings.removeImage') || 'إزالة الصورة'}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.uploadPlaceholder}>
                      <ImageIcon size={32} className={styles.placeholderIcon} />
                      <p className={styles.placeholderText}>لا توجد صورة خلفية</p>
                    </div>
                  )}
                  
                  <div className={styles.cardActions}>
                    <input
                      type="file"
                      ref={fileInputRefs[option.key]}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(option.key, file);
                        }
                      }}
                      accept="image/*"
                      className={styles.hiddenInput}
                    />
                    <button
                      onClick={() => fileInputRefs[option.key].current?.click()}
                      disabled={uploading === option.key}
                      className={styles.uploadButton}
                    >
                      <Upload size={16} />
                      {uploading === option.key 
                        ? (t('settings.uploadInProgress') || 'جاري الرفع...')
                        : (t('settings.uploadImage') || 'رفع صورة')
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
