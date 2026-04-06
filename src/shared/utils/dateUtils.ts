/**
 * Centralized date formatting utility
 * Provides consistent date formatting across the application
 */

// Default date format configuration
const DEFAULT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Format a date string or Date object using consistent formatting
 * @param date - Date string, Date object, or timestamp
 * @param options - Optional formatting options
 * @param locale - Optional locale (defaults to 'ar-SA' for Arabic)
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | number | null | undefined,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT_OPTIONS,
  locale: string = 'en-US'
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : 
                   typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return '';
  }
};

/**
 * Format a date with time
 * @param date - Date string, Date object, or timestamp
 * @param locale - Optional locale (defaults to 'ar-SA' for Arabic)
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: string | Date | number | null | undefined,
  locale: string = 'ar-SA'
): string => {
  return formatDate(date, DEFAULT_DATETIME_OPTIONS, locale);
};

/**
 * Format date for input fields (YYYY-MM-DD format)
 * @param date - Date string, Date object, or timestamp
 * @returns ISO date string (YYYY-MM-DD)
 */
export const formatDateForInput = (
  date: string | Date | number | null | undefined
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : 
                   typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Date input formatting error:', error);
    return '';
  }
};

/**
 * Legacy format date as dd-mm-yyyy (kept for backward compatibility)
 * @param date - Date object, ISO string, or date string
 * @returns Formatted date string as dd-mm-yyyy
 */
export const formatDateLegacy = (date: string | Date): string => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Get relative date string (e.g., "منذ يومين", "قبل أسبوع")
 * @param date - Date string, Date object, or timestamp
 * @param locale - Optional locale (defaults to 'ar-SA' for Arabic)
 * @returns Relative date string
 */
export const formatRelativeDate = (
  date: string | Date | number | null | undefined,
  locale: string = 'ar-SA'
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : 
                   typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (locale === 'ar-SA') {
      if (diffDays === 0) return 'اليوم';
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
      if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
      return `منذ ${Math.floor(diffDays / 365)} سنوات`;
    }
    
    // Fallback to English
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
    
  } catch (error) {
    console.warn('Relative date formatting error:', error);
    return '';
  }
};

/**
 * Check if a date is overdue
 * @param date - Date string, Date object, or timestamp
 * @returns boolean indicating if the date is in the past
 */
export const isOverdue = (
  date: string | Date | number | null | undefined
): boolean => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : 
                   typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return false;
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    dateObj.setHours(0, 0, 0, 0); // Start of the given date
    
    return dateObj < now;
  } catch (error) {
    console.warn('Overdue check error:', error);
    return false;
  }
};
