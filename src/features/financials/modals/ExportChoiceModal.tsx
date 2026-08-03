import React, { useState } from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { FileSpreadsheet, Download, Calendar, Filter } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { arSA } from 'date-fns/locale';

interface ExportChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportFiltered: () => void;
  onExportFull: () => void;
  onExportDateRange?: (startDate?: string, endDate?: string) => void;
  title: string;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-CA');
}

const modalDateStyles = `
  .export-modal-datepicker .react-datepicker__input-container input {
    height: 2.3rem;
    padding-inline: 0.75rem;
    font-size: 0.85rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    background-color: var(--color-background, #fff);
    color: var(--color-foreground, #0f172a);
    outline: none;
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    direction: rtl;
    text-align: right;
  }
  .export-modal-datepicker .react-datepicker-wrapper {
    width: 100%;
  }
  .export-modal-datepicker .react-datepicker-popper {
    z-index: 9999 !important;
  }
`;

export const ExportChoiceModal: React.FC<ExportChoiceModalProps> = ({
  isOpen,
  onClose,
  onExportFiltered,
  onExportFull,
  onExportDateRange,
  title
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleResetDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleExportRange = () => {
    if (!onExportDateRange) return;
    const startStr = startDate ? `${formatDate(startDate)} 00:00:00` : '';
    const endStr = endDate ? `${formatDate(endDate)} 23:59:59` : '';
    onExportDateRange(startStr, endStr);
    onClose();
  };

  const hasSelectedRange = Boolean(startDate || endDate);

  return (
    <>
      <style>{modalDateStyles}</style>
      <BaseModal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
        <div className="space-y-4 p-4 text-right" dir="rtl">
          <p className="text-text-secondary text-sm font-medium">اختر نوع التصدير:</p>
          
          <div className="flex flex-col gap-2.5">
            <Button
              variant="outline-primary"
              className="w-full justify-start gap-3 py-3"
              onClick={() => { onExportFiltered(); onClose(); }}
            >
              <FileSpreadsheet className="h-5 w-5 shrink-0" />
              <div className="text-right">
                <div className="font-semibold">تصدير البيانات المعروضة</div>
                <div className="text-xs text-text-secondary">تصدير البيانات المفلترة حالياً في الصفحة</div>
              </div>
            </Button>

            <Button
              variant="outline-primary"
              className="w-full justify-start gap-3 py-3"
              onClick={() => { onExportFull(); onClose(); }}
            >
              <Download className="h-5 w-5 shrink-0" />
              <div className="text-right">
                <div className="font-semibold">تصدير كامل التاريخ</div>
                <div className="text-xs text-text-secondary">تصدير جميع الحركات من بداية الإنشاء بدون فلترة</div>
              </div>
            </Button>
          </div>

          {onExportDateRange && (
            <div className="border-t border-border-default pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>تصدير حسب نطاق تاريخي</span>
                </div>
                {hasSelectedRange && (
                  <button
                    type="button"
                    onClick={handleResetDates}
                    className="text-xs text-primary hover:underline"
                  >
                    تفريغ التواريخ
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-right">
                <div className="export-modal-datepicker space-y-1">
                  <label className="text-xs text-text-secondary block">تاريخ البداية (12:00 ص)</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(d: Date | null) => setStartDate(d)}
                    dateFormat="yyyy-MM-dd"
                    locale={arSA}
                    placeholderText="من تاريخ"
                    isClearable
                    className="w-full"
                  />
                </div>

                <div className="export-modal-datepicker space-y-1">
                  <label className="text-xs text-text-secondary block">تاريخ النهاية (11:59 م)</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(d: Date | null) => setEndDate(d)}
                    dateFormat="yyyy-MM-dd"
                    locale={arSA}
                    placeholderText="إلى تاريخ"
                    isClearable
                    className="w-full"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full justify-center gap-2 py-2.5"
                disabled={!hasSelectedRange}
                onClick={handleExportRange}
              >
                <Filter className="h-4 w-4" />
                <span>تصدير النطاق المحدد</span>
              </Button>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button variant="outline-secondary" onClick={onClose}>إلغاء</Button>
          </div>
        </div>
      </BaseModal>
    </>
  );
};
