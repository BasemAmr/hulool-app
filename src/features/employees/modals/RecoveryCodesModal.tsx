import { useState, useCallback } from 'react';
import { Copy, Check, AlertTriangle, RefreshCw, Printer } from 'lucide-react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useToast } from '@/shared/hooks/useToast';
import { useRegenerateCodes, useAdminResetPassword } from '@/features/employees/api/userQueries';
import type { EmployeeAccount } from '@/api/types';

interface RecoveryCodesModalProps {
  employee: EmployeeAccount;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const RecoveryCodesModal = ({ employee, isOpen, onClose, isAdmin = false }: RecoveryCodesModalProps) => {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const regenerateMutation = useRegenerateCodes();
  const resetPasswordMutation = useAdminResetPassword();

  const handleRegenerate = useCallback(async () => {
    try {
      const result = await regenerateMutation.mutateAsync({ userId: employee.user_id || employee.id });
      setCodes(result.recovery_codes);
      showToast({ type: 'success', title: 'تم توليد رموز جديدة' });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'فشل توليد الرموز',
        message: error.response?.data?.message || 'حدث خطأ أثناء توليد الرموز'
      });
    }
  }, [employee, regenerateMutation, showToast]);

  const handleAdminReset = useCallback(async () => {
    if (newPassword.length < 4) {
      showToast({ type: 'error', title: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ type: 'error', title: 'كلمات المرور غير متطابقة' });
      return;
    }

    try {
      const result = await resetPasswordMutation.mutateAsync({
        userId: employee.user_id || employee.id,
        password: newPassword,
      });
      setCodes(result.recovery_codes);
      setShowResetForm(false);
      setNewPassword('');
      setConfirmPassword('');
      showToast({ type: 'success', title: 'تم إعادة تعيين كلمة المرور وتوليد رموز جديدة' });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'فشل إعادة التعيين',
        message: error.response?.data?.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور'
      });
    }
  }, [employee, newPassword, confirmPassword, resetPasswordMutation, showToast]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleCopyAll = useCallback(async () => {
    const allCodes = codes.join('\n');
    await copyToClipboard(allCodes);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    showToast({ type: 'success', title: 'تم نسخ جميع الرموز' });
  }, [codes, showToast]);

  const handleCopySingle = useCallback(async (code: string, index: number) => {
    await copyToClipboard(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const codesHtml = codes.length
      ? `<div style="margin-top:20px"><h3 style="font-size:16px;margin-bottom:10px">رموز الاسترجاع</h3>
         <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;direction:ltr;text-align:center">
         ${codes.map(c => `<div style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-family:monospace;font-size:14px;letter-spacing:1px;background:#f9f9f9">${c}</div>`).join('')}
         </div></div>`
      : '';
    printWindow.document.write(`
      <html dir="rtl"><head><title>رموز الاسترجاع - ${employee.display_name}</title></head>
      <body style="font-family:sans-serif;padding:40px">
        <h1 style="font-size:20px;margin-bottom:4px">${employee.display_name}</h1>
        <p style="color:#666;margin-bottom:20px">${employee.phone || ''}</p>
        ${codesHtml}
        <p style="margin-top:30px;color:#999;font-size:12px">تم التوليد في ${new Date().toLocaleDateString('ar-SA')}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [codes, employee]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="رموز الاسترجاع" className="max-w-2xl">
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">{employee.display_name}</p>
            <p className="text-xs text-text-secondary">{employee.phone}</p>
          </div>
        </div>

        {codes.length > 0 && (
          <div className="space-y-3">
            <div className="bg-status-warning-bg border border-status-warning-border rounded-lg p-4">
              <p className="text-status-warning-text font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                احتفظ بهذه الرموز في مكان آمن. لن تتمكن من رؤيتها مرة أخرى.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {codes.map((code, index) => (
                <div key={index} className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border group">
                  <span className="font-mono text-sm font-bold text-foreground tracking-wider" dir="ltr">{code}</span>
                  <button type="button" className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-muted/50 transition-colors"
                    onClick={() => handleCopySingle(code, index)} title="نسخ">
                    {copiedIndex === index ? <Check className="h-3.5 w-3.5 text-status-success-text" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline-primary" size="sm" onClick={handleCopyAll} className="flex-1">
                {copiedAll ? <><Check className="h-4 w-4" /> تم النسخ</> : <><Copy className="h-4 w-4" /> نسخ جميع الرموز</>}
              </Button>
              <Button variant="outline-primary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" /> طباعة
              </Button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-3 border-t border-border pt-4">
            <Button variant="outline-primary" onClick={handleRegenerate}
              isLoading={regenerateMutation.isPending} className="w-full">
              <RefreshCw className="h-4 w-4" /> توليد رموز جديدة
            </Button>
            {!showResetForm ? (
              <Button variant="outline-danger" onClick={() => setShowResetForm(true)} className="w-full">
                إعادة تعيين كلمة المرور
              </Button>
            ) : (
              <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                <h6 className="text-sm font-semibold text-text-primary">تعيين كلمة مرور جديدة</h6>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">كلمة المرور الجديدة</label>
                  <input type="password" className="base-input text-sm" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} placeholder="4 أحرف على الأقل"
                    disabled={resetPasswordMutation.isPending} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">تأكيد كلمة المرور</label>
                  <input type="password" className="base-input text-sm" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور"
                    disabled={resetPasswordMutation.isPending} />
                </div>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleAdminReset} isLoading={resetPasswordMutation.isPending}>تأكيد</Button>
                  <Button variant="outline-info" size="sm" onClick={() => { setShowResetForm(false); setNewPassword(''); setConfirmPassword(''); }}
                    disabled={resetPasswordMutation.isPending}>إلغاء</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-start gap-2 pt-2 border-t border-border">
          <Button variant="primary" onClick={onClose}>تم</Button>
          {codes.length > 0 && (
            <Button variant="outline-primary" onClick={handlePrint}><Printer className="h-4 w-4" /> طباعة</Button>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default RecoveryCodesModal;
