// Date utilities for BaseClientCard

/**
 * Format days elapsed from a date in Arabic
 */
export const formatDaysElapsed = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'يوم';
  if (diffDays === 2) return 'يومين';
  if (diffDays > 2 && diffDays <= 10) return `${diffDays} أيام`;
  return `${diffDays} يوم`;
};

/**
 * Format date for display (shorter year format)
 */
export const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};
