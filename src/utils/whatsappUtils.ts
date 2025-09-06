/**
 * WhatsApp utility functions for sending messages
 */

interface WhatsAppOptions {
  phone: string;
  message?: string;
  showConfirmation?: boolean;
  fallbackToClipboard?: boolean;
}

/**
 * Clean and format phone number for WhatsApp
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove all non-digit characters
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Handle Saudi phone numbers
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '966' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('966')) {
    cleanPhone = '966' + cleanPhone;
  }
  
  return cleanPhone;
};

/**
 * Copy text to clipboard
 */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      document.body.prepend(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      return true;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Open WhatsApp with message
 */
export const openWhatsAppWithMessage = async (options: WhatsAppOptions): Promise<void> => {
  const { phone, message = '', showConfirmation = false, fallbackToClipboard = true } = options;
  
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  
  // Different URL formats for different scenarios
  const webUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
  const mobileUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  const desktopUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
  
  let shouldProceed = true;
  
  if (showConfirmation && message) {
    const confirmationMessage = `سيتم إرسال الرسالة التالية عبر واتساب:\n\n"${message}"\n\n${
      fallbackToClipboard ? 'إذا لم تظهر الرسالة في واتساب، سيتم نسخها للحافظة تلقائياً.\n\n' : ''
    }هل تريد المتابعة؟`;
    
    shouldProceed = window.confirm(confirmationMessage);
  }
  
  if (!shouldProceed) return;
  
  // Copy to clipboard as fallback
  if (message && fallbackToClipboard) {
    const copied = await copyToClipboard(message);
    if (copied) {
      console.log('Message copied to clipboard as fallback');
    }
  }
  
  // Try different approaches based on user agent
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isDesktop = !isMobile;
  
  if (isDesktop) {
    // For desktop, try web WhatsApp first, then desktop app
    try {
      const webWindow = window.open(webUrl, '_blank');
      
      // If web WhatsApp doesn't load properly, try desktop protocol
      setTimeout(() => {
        if (webWindow && (webWindow.closed || !webWindow.location)) {
          window.location.href = desktopUrl;
          
          // Final fallback to mobile URL
          setTimeout(() => {
            window.open(mobileUrl, '_blank');
          }, 2000);
        }
      }, 1500);
    } catch (error) {
      // Fallback to mobile URL
      window.open(mobileUrl, '_blank');
    }
  } else {
    // For mobile, use the mobile URL directly
    window.open(mobileUrl, '_blank');
  }
};

/**
 * Create a payment reminder message
 */
export const createPaymentReminderMessage = (clientName: string, amount: string): string => {
  return `عزيزي العميل ${clientName}، نرجو سداد المبلغ المستحق عليك وقدره ${amount}. شكراً لتعاونكم.`;
};

/**
 * Send payment reminder via WhatsApp
 */
export const sendPaymentReminder = (phone: string, clientName: string, formattedAmount: string): void => {
  const message = createPaymentReminderMessage(clientName, formattedAmount);
  
  openWhatsAppWithMessage({
    phone,
    message,
    showConfirmation: true,
    fallbackToClipboard: true
  });
};
