import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { FileSpreadsheet, Download } from 'lucide-react';

interface ExportChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportFiltered: () => void;
  onExportFull: () => void;
  title: string;
}

export const ExportChoiceModal: React.FC<ExportChoiceModalProps> = ({
  isOpen,
  onClose,
  onExportFiltered,
  onExportFull,
  title
}) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-4 p-4 text-right" dir="rtl">
        <p className="text-text-secondary text-sm">اختر نوع التصدير:</p>
        <div className="flex flex-col gap-3">
          <Button
            variant="outline-primary"
            className="w-full justify-start gap-3 py-3"
            onClick={() => { onExportFiltered(); onClose(); }}
          >
            <FileSpreadsheet className="h-5 w-5" />
            <div className="text-right">
              <div className="font-semibold">تصدير البيانات المعروضة</div>
              <div className="text-xs text-text-secondary">تصدير البيانات المفلترة في الصفحة الحالية</div>
            </div>
          </Button>
          <Button
            variant="outline-primary"
            className="w-full justify-start gap-3 py-3"
            onClick={() => { onExportFull(); onClose(); }}
          >
            <Download className="h-5 w-5" />
            <div className="text-right">
              <div className="font-semibold">تصدير كامل التاريخ</div>
              <div className="text-xs text-text-secondary">تصدير جميع الحركات بدون فلترة</div>
            </div>
          </Button>
        </div>
        <div className="flex justify-center pt-2">
          <Button variant="outline-secondary" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </BaseModal>
  );
};
