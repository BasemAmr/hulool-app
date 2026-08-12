import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { VoucherData } from '@/api/types';

class VoucherServiceClass {
  /**
   * Generates a PDF Blob from an HTML element
   * Uses A5 landscape format (210mm x 148mm)
   */
  public async generatePDF(elementId: string): Promise<Blob> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    // Wait a tiny bit for any fonts/images to render
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better resolution
      useCORS: true, // Allow loading external images
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // A5 dimensions in mm
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    return pdf.output('blob');
  }

  /**
   * Downloads a Blob as a file
   */
  public downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Creates a Blob URL for preview in an iframe
   */
  public createPreviewUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }
}

export const VoucherService = new VoucherServiceClass();
