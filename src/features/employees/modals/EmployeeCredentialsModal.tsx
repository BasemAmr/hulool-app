import { useState, useCallback } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { Copy, Check, Printer, AlertTriangle } from 'lucide-react';
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
                    className={`flex-1 px-4 py-2 border border-border rounded-lg bg-muted/50 text-foreground font-mono text-sm ${sensitive ? 'select-all' : ''}`}
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

    const handlePrint = useCallback(() => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const codesHtml = credentials?.recovery_codes?.length
            ? `<div style="margin-top:20px"><h3 style="font-size:16px;margin-bottom:10px">رموز الاسترجاع</h3>
               <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;direction:ltr;text-align:center">
               ${credentials.recovery_codes.map(c => `<div style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-family:monospace;font-size:14px;letter-spacing:1px;background:#f9f9f9">${c}</div>`).join('')}
               </div></div>`
            : '';
        printWindow.document.write(`
            <html dir="rtl"><head><title>بيانات حساب الموظف</title></head>
            <body style="font-family:sans-serif;padding:40px">
                <h1 style="font-size:20px;margin-bottom:4px">${credentials.display_name || ''}</h1>
                <p style="color:#666;margin-bottom:20px">بيانات الدخول إلى النظام</p>
                <table style="width:100%;border-collapse:collapse">
                    ${[
                        ['اسم المستخدم', credentials.username],
                        ['الاسم المعروض', credentials.display_name],
                        ['البريد الإلكتروني', credentials.email],
                        ['كلمة المرور', credentials.app_password],
                    ].filter(([, v]) => v).map(([k, v]) =>
                        `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600">${k}</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace" dir="ltr">${v}</td></tr>`
                    ).join('')}
                </table>
                ${codesHtml}
                <p style="margin-top:30px;color:#999;font-size:12px">تم إنشاء الحساب في ${new Date().toLocaleDateString('ar-SA')}</p>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    }, [credentials]);

    const isViewOnly = credentials?.app_password?.includes('***');

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={isViewOnly ? 'بيانات الموظف' : 'تم إنشاء حساب الموظف'} className="max-w-xl">
            <div className="space-y-4" dir="rtl">
                {!isViewOnly && (
                    <div className="bg-status-warning-bg border border-status-warning-border rounded-lg p-4 mb-6">
                        <p className="text-status-warning-text font-semibold text-sm flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            احفظ بيانات الدخول - لن تظهر مرة أخرى!
                        </p>
                    </div>
                )}

                <CredentialField label="اسم المستخدم" value={credentials.username} fieldName="username" />
                <CredentialField label="الاسم المعروض" value={credentials.display_name} fieldName="display_name" />
                <CredentialField label="رقم الجوال" value={credentials.phone || ''} fieldName="phone" />
                <CredentialField label="كلمة المرور" value={credentials.app_password} fieldName="app_password" sensitive />

                {credentials.recovery_codes && credentials.recovery_codes.length > 0 && (
                    <div className="border-t border-border pt-4 mt-4">
                        <label className="block text-sm font-medium text-foreground/70 mb-3">
                            رموز الاسترجاع ({} من {} متبقي)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {credentials.recovery_codes.map((code, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border group">
                                    <span className="font-mono text-sm font-bold text-foreground tracking-wider" dir="ltr">{code}</span>
                                    <button
                                        type="button"
                                        className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-muted/50 transition-colors"
                                        onClick={() => copyToClipboard(code, `rc-${idx}`)}
                                        title="نسخ"
                                    >
                                        {copiedField === `rc-${idx}` ? <Check className="h-3.5 w-3.5 text-status-success-text" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="bg-status-warning-bg border border-status-warning-border rounded-lg p-3 mt-3">
                            <p className="text-status-warning-text font-semibold text-xs flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                احتفظ بهذه الرموز في مكان آمن. لن تتمكن من رؤيتها مرة أخرى.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-start gap-2 mt-6 pt-4 border-t border-border">
                    <Button variant="primary" onClick={onClose}>
                        تم
                    </Button>
                    <Button variant="outline-primary" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                        طباعة
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};

export default EmployeeCredentialsModal;
