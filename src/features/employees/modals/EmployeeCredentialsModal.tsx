import { useState } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { Copy, Check } from 'lucide-react';
import type { EmployeeCredentials } from '@/api/types';

interface EmployeeCredentialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    credentials: EmployeeCredentials | null;
}

const EmployeeCredentialsModal = ({ isOpen, onClose, credentials }: EmployeeCredentialsModalProps) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!credentials) return null;

    const copyToClipboard = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const CredentialField = ({ label, value, fieldName, sensitive = false }: {
        label: string;
        value: string;
        fieldName: string;
        sensitive?: boolean;
    }) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-foreground/70 mb-2">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={value}
                    readOnly
                    dir="ltr"
                    className={`flex-1 px-4 py-2 border border-border rounded-lg bg-muted/50 text-foreground font-mono text-sm ${sensitive ? 'select-all' : ''
                        }`}
                />
                <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => copyToClipboard(value, fieldName)}
                    title="نسخ"
                >
                    {copiedField === fieldName ? <Check className="h-4 w-4 text-status-success-text" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );

    const isViewOnly = credentials?.app_password?.includes('***');

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={isViewOnly ? "بيانات الموظف" : "تم إنشاء حساب الموظف"}>
            <div className="space-y-4" dir="rtl">
                {!isViewOnly && (
                    <div className="bg-status-warning-bg border border-status-warning-border rounded-lg p-4 mb-6">
                        <p className="text-status-warning-text font-semibold text-sm flex items-center gap-2">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            احفظ بيانات الدخول - لن تظهر مرة أخرى!
                        </p>
                    </div>
                )}

                <CredentialField label="اسم المستخدم" value={credentials.username} fieldName="username" />
                <CredentialField label="الاسم المعروض" value={credentials.display_name} fieldName="display_name" />
                <CredentialField label="البريد الإلكتروني" value={credentials.email} fieldName="email" />
                <CredentialField label="كلمة المرور" value={credentials.app_password} fieldName="app_password" sensitive />

                <div className="flex justify-start mt-6 pt-4 border-t border-border">
                    <Button variant="primary" onClick={onClose}>
                        تم
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};

export default EmployeeCredentialsModal;
