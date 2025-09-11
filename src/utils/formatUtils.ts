// src/utils/formatUtils.ts
/**
 * Format a number as currency in SAR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string in Arabic locale
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Format a date string for Excel (dd/mm/yyyy)
 */
export function formatDateForExcel(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Format phone number with +966 prefix
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove any existing +966 prefix and clean the number
  const cleanPhone = phone.replace(/^\+?966/, '').replace(/\D/g, '');
  
  // Add +966 prefix if we have a valid number
  return cleanPhone ? `+966${cleanPhone}` : '';
}

/**
 * Calculate duration between two dates in days
 */
export function calculateDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is overdue compared to today
 */
export function isOverdue(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  return date < today;
}

/**
 * Format task status to Arabic
 */
export function formatTaskStatusArabic(status: string): string {
  const statusMap: Record<string, string> = {
    'New': 'جديدة',
    'Deferred': 'مؤجلة',
    'Completed': 'منجزة',
    'Cancelled': 'ملغية',
  };
  return statusMap[status] || status;
}

/**
 * Format client type to Arabic
 */
export function formatClientTypeArabic(type: string): string {
  const typeMap: Record<string, string> = {
    'Government': 'حكومي',
    'RealEstate': 'عقاري',
    'Accounting': 'محاسبي',
    'Other': 'آخر',
  };
  return typeMap[type] || type;
}

/**
 * Format task type to Arabic
 */
export function formatTaskTypeArabic(type: string): string {
  const typeMap: Record<string, string> = {
    'Government': 'حكومي',
    'RealEstate': 'عقاري', 
    'Accounting': 'محاسبي',
    'Other': 'آخر',
    'Consultation': 'استشارة',
    'Documentation': 'توثيق',
    'Legal': 'قانوني',
    'Financial': 'مالي',
    'Administrative': 'إداري',
  };
  return typeMap[type] || type;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Format percentage as string
 */
export function formatPercentage(value: number, total: number): string {
  const percentage = calculatePercentage(value, total);
  return `${percentage}%`;
}
