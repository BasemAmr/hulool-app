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
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (voucherData && !descriptionOverride) {
      setDescriptionOverride(voucherData.description);
    }
  }, [voucherData]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleGenerate = async () => {
    if (!voucherData) return;
    setIsGenerating(true);
    try {
      // Temporarily render the template in a hidden div to capture it
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      // Render the template using a portal would be cleaner, but React 19 might need root.render.
      // A simpler way for html2canvas is to have the template always rendered but visually hidden 
      // when in Step 1, or just rendered within the modal DOM tree but off-screen.
      // Since it's easier, let's keep it in the DOM of step 1 but absolute positioned.
    } catch (err) {
      toast.error('حدث خطأ أثناء إنشاء السند');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

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
          ) : error || !voucherData ? (
            <div className="text-red-500 text-center py-8">
              فشل تحميل بيانات السند. تأكد من أن المعاملة موجودة.
            </div>
          ) : step === 1 ? (
            // Step 1: Edit Form
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وذلك مقابل (سبب السند)</label>
                <textarea
                  value={descriptionOverride}
                  onChange={(e) => setDescriptionOverride(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
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
                  إنشاء السند
                </Button>
              </div>

              {/* Hidden template for html2canvas to capture */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <VoucherTemplate 
                  id="hidden-voucher-template"
                  data={voucherData} 
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
