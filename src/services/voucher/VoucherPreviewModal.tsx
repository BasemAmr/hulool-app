import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Printer, Download, ArrowRight } from 'lucide-react';
import Button from '@/shared/ui/primitives/Button';
import { useGetTransactionVoucher } from './voucherQueries';
import { VoucherTemplate } from './VoucherTemplate';
import { VoucherService } from './VoucherService';
import { useToast } from '@/shared/hooks/useToast';

interface Props {
  transactionId: number;
  onClose: () => void;
}

export const VoucherPreviewModal: React.FC<Props> = ({ transactionId, onClose }) => {
  const { data: voucherData, isLoading, error } = useGetTransactionVoucher(transactionId);
  const [step, setStep] = useState<1 | 2>(1);
  const [descriptionOverride, setDescriptionOverride] = useState('');
  const [voucherTypeState, setVoucherTypeState] = useState<'receipt' | 'expense' | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (voucherData) {
      if (!descriptionOverride) {
        // Clean default description of redundant internal tags
        let cleanDesc = voucherData.description || '';
        if (cleanDesc.startsWith('سند صرف (') || cleanDesc.startsWith('سند قبض (')) {
          const match = cleanDesc.match(/^(?:سند صرف|سند قبض)\s*\((.*?)\)$/);
          if (match && match[1]) {
            cleanDesc = match[1];
          }
        }
        setDescriptionOverride(cleanDesc);
      }
      if (voucherTypeState === null) {
        setVoucherTypeState(voucherData.voucher_type);
      }
    }
  }, [voucherData]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const activeVoucherData = voucherData ? {
    ...voucherData,
    voucher_type: voucherTypeState ?? voucherData.voucher_type,
  } : null;

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
        <Dialog.Content 
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 p-6 flex flex-col ${step === 2 ? 'w-[90vw] h-[90vh] max-w-5xl' : 'w-full max-w-md'}`}
          dir="rtl"
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-bold">
              {step === 1 ? 'إنشاء سند' : 'معاينة السند'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error || !voucherData || !activeVoucherData ? (
            <div className="text-red-500 text-center py-8">
              فشل تحميل بيانات السند. تأكد من أن المعاملة موجودة.
            </div>
          ) : step === 1 ? (
            // Step 1: Edit Form
            <div className="flex flex-col gap-4">
              {/* Voucher Format / Template Toggle */}
              {(() => {
                let meta = voucherData.metadata;
                if (typeof meta === 'string') {
                  try { meta = JSON.parse(meta); } catch {}
                }
                const hasExplicitOverride = Boolean(meta?.voucher_type_override);

                if (hasExplicitOverride) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع السند المعتمد</label>
                      <div className={`py-2 px-3 rounded-md text-xs font-bold border text-center ${
                        voucherTypeState === 'receipt'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-red-50 border-red-500 text-red-700'
                      }`}>
                        {voucherTypeState === 'receipt' ? 'سند قبض (Receipt Voucher)' : 'سند صرف (Expense Voucher)'}
                      </div>
                    </div>
                  );
                }

                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع السند</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVoucherTypeState('expense')}
                        className={`py-2 px-3 rounded-md text-xs font-bold border transition-all ${
                          voucherTypeState === 'expense'
                            ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        سند صرف (Expense)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoucherTypeState('receipt')}
                        className={`py-2 px-3 rounded-md text-xs font-bold border transition-all ${
                          voucherTypeState === 'receipt'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        سند قبض (Receipt)
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وذلك مقابل (سبب السند)</label>
                <textarea
                  value={descriptionOverride}
                  onChange={(e) => setDescriptionOverride(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-xs focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline-secondary" onClick={onClose}>إلغاء</Button>
                <Button 
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      const blob = await VoucherService.generatePDF('hidden-voucher-template');
                      setPdfBlob(blob);
                      setPdfUrl(VoucherService.createPreviewUrl(blob));
                      setStep(2);
                    } catch (err) {
                      toast.error('حدث خطأ أثناء إنشاء الـ PDF');
                      console.error(err);
                    } finally {
                      setIsGenerating(false);
                    }
                  }} 
                  isLoading={isGenerating}
                >
                  إنشاء ومعاينة السند
                </Button>
              </div>

              {/* Hidden template for html2canvas to capture */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <VoucherTemplate 
                  id="hidden-voucher-template"
                  data={activeVoucherData} 
                  descriptionOverride={descriptionOverride} 
                />
              </div>
            </div>
          ) : (
            // Step 2: PDF Preview
            <div className="flex flex-col flex-1 gap-4 min-h-0">
              <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {pdfUrl && (
                  <iframe 
                    src={`${pdfUrl}#toolbar=0`} 
                    className="w-full h-full" 
                    title="PDF Preview"
                  />
                )}
              </div>
              <div className="flex justify-between mt-2">
                <Button variant="outline-secondary" onClick={() => setStep(1)}>
                  <ArrowRight size={16} className="ml-2" />
                  تعديل
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline-primary" 
                    onClick={() => {
                      if (pdfUrl) {
                        const win = window.open(pdfUrl, '_blank');
                        if (win) {
                          win.onload = () => win.print();
                        }
                      }
                    }}
                  >
                    <Printer size={16} className="ml-2" />
                    طباعة
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      if (pdfBlob) {
                        VoucherService.downloadPDF(pdfBlob, `Voucher_${voucherData.voucher_number}.pdf`);
                      }
                    }}
                  >
                    <Download size={16} className="ml-2" />
                    تحميل PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
