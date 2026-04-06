/**
 * Error utility functions for consistent error message extraction
 */

export const getErrorMessage = (error: any, defaultMessage: string = 'حدث خطأ غير متوقع'): string => {
  // Try API response error message first
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Try error data object
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  // Try direct error message
  if (error?.message) {
    return error.message;
  }

  // Return default
  return defaultMessage;
};

/**
 * Extract error details from API response or error object
 */
export const getErrorDetails = (error: any) => {
  return {
    message: getErrorMessage(error),
    status: error?.response?.status,
    code: error?.code,
    details: error?.response?.data?.details || null,
  };
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: any): boolean => {
  return error?.response?.status === 422 || error?.response?.status === 400;
};

/**
 * Check if error is a conflict error
 */
export const isConflictError = (error: any): boolean => {
  return error?.response?.status === 409;
};

/**
 * Check if error is a not found error
 */
export const isNotFoundError = (error: any): boolean => {
  return error?.response?.status === 404;
};

/**
 * Check if error is a permission error
 */
export const isPermissionError = (error: any): boolean => {
  return error?.response?.status === 403 || error?.response?.status === 401;
};
