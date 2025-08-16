// Time utility functions
export const formatTimeElapsed = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // If the date is in the future
  if (diffInMs < 0) {
    const futureDays = Math.abs(diffInDays);
    if (futureDays === 0) {
      return 'اليوم';
    } else if (futureDays === 1) {
      return 'غداً';
    } else if (futureDays === 2) {
      return 'بعد يومين';
    } else if (futureDays <= 10) {
      return `خلال ${futureDays} أيام`;
    } else {
      return `خلال ${futureDays} يوم`;
    }
  }

  // If the date is in the past
  if (diffInHours < 1) {
    return 'منذ أقل من ساعة';
  } else if (diffInHours < 24) {
    return `منذ ${diffInHours} ${diffInHours === 1 ? 'ساعة' : diffInHours === 2 ? 'ساعتين' : diffInHours <= 10 ? 'ساعات' : 'ساعة'}`;
  } else if (diffInDays === 1) {
    return 'منذ يوم واحد';
  } else if (diffInDays === 2) {
    return 'منذ يومين';
  } else if (diffInDays <= 10) {
    return `منذ ${diffInDays} أيام`;
  } else {
    return `منذ ${diffInDays} يوم`;
  }
};
