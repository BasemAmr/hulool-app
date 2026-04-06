/**
 * Grid Column Factory
 * 
 * Helper functions to create common column configurations
 * for the HuloolDataGrid component.
 */

import type { HuloolGridColumn } from './HuloolDataGrid';

// ================================
// COLUMN FACTORIES
// ================================

/**
 * Create a text column
 */
export function textColumn<T>(
  key: keyof T | string,
  title: string,
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: String(key),
    key: String(key),
    title,
    type: 'text',
    ...options,
  };
}

/**
 * Create a client name column (bold, black)
 */
export function clientNameColumn<T>(
  key: keyof T | string = 'name',
  title: string = 'اسم العميل',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'clientName',
    key: String(key),
    title,
    type: 'clientName',
    grow: 1,
    ...options,
  };
}

/**
 * Create a phone column with WhatsApp button
 */
export function phoneColumn<T>(
  key: keyof T | string = 'phone',
  title: string = 'الهاتف',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'phone',
    key: String(key),
    title,
    type: 'phone',
    grow: 1,
    ...options,
  };
}

/**
 * Create a debit column (black currency)
 */
export function debitColumn<T>(
  key: keyof T | string = 'debit',
  title: string = 'المدين',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'debit',
    key: String(key),
    title,
    type: 'debit',
    grow: 1,
    ...options,
  };
}

/**
 * Create a credit column (green currency)
 */
export function creditColumn<T>(
  key: keyof T | string = 'credit',
  title: string = 'الدائن',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'credit',
    key: String(key),
    title,
    type: 'credit',
    grow: 1,
    ...options,
  };
}

/**
 * Create a due/outstanding column (red currency)
 */
export function dueColumn<T>(
  key: keyof T | string = 'total_outstanding',
  title: string = 'المستحق',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'due',
    key: String(key),
    title,
    type: 'due',
    grow: 1,
    ...options,
  };
}

/**
 * Create a currency column
 */
export function currencyColumn<T>(
  key: keyof T | string,
  title: string,
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: String(key),
    key: String(key),
    title,
    type: 'currency',
    grow: 1,
    ...options,
  };
}

/**
 * Create a date column
 */
export function dateColumn<T>(
  key: keyof T | string = 'date',
  title: string = 'التاريخ',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: String(key),
    key: String(key),
    title,
    type: 'date',
    grow: 1,
    ...options,
  };
}

/**
 * Create a badge column for status/type fields
 */
export function badgeColumn<T>(
  key: keyof T | string,
  title: string,
  options?: {
    badgeColors?: Record<string, string>;
    formatter?: (value: any, row: T) => string;
  } & Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: String(key),
    key: String(key),
    title,
    type: 'badge',
    grow: 1,
    ...options,
  };
}

/**
 * Create a status badge column with default Arabic translations
 */
export function statusColumn<T>(
  key: keyof T | string = 'status',
  title: string = 'الحالة',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  const statusMap: Record<string, string> = {
    New: 'جديدة',
    Deferred: 'مؤجلة',
    Completed: 'منجزة',
    Cancelled: 'ملغية',
    'Pending Review': 'قيد المراجعة',
    pending: 'معلق',
    paid: 'مسدد',
    overdue: 'متأخر',
    partially_paid: 'مسدد جزئياً',
    draft: 'مسودة',
  };

  return badgeColumn<T>(key, title, {
    formatter: (value) => statusMap[value] || value,
    badgeColors: {
      New: '#eab308',
      Deferred: '#ef4444',
      Completed: '#22c55e',
      Cancelled: '#6b7280',
      'Pending Review': '#f97316',
      pending: '#eab308',
      paid: '#22c55e',
      overdue: '#ef4444',
      partially_paid: '#f97316',
      draft: '#6b7280',
    },
    ...options,
  });
}

/**
 * Create a type badge column with default Arabic translations
 */
export function typeColumn<T>(
  key: keyof T | string = 'type',
  title: string = 'النوع',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  const typeMap: Record<string, string> = {
    Government: 'حكومي',
    RealEstate: 'عقاري',
    Accounting: 'محاسبة',
    Other: 'أخرى',
  };

  return badgeColumn<T>(key, title, {
    formatter: (value) => typeMap[value] || value,
    badgeColors: {
      Government: '#3b82f6',
      RealEstate: '#22c55e',
      Accounting: '#eab308',
      Other: '#6b7280',
    },
    ...options,
  });
}

/**
 * Create a region column
 */
export function regionColumn<T>(
  key: keyof T | string = 'region_name',
  title: string = 'المنطقة',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'region',
    key: String(key),
    title,
    type: 'badge',
    grow: 1,
    badgeColors: {},
    // Dynamic coloring based on region name
    ...options,
  };
}

/**
 * Create a notes/description column with truncation
 */
export function notesColumn<T>(
  key: keyof T | string = 'notes',
  title: string = 'الملاحظات',
  options?: {
    maxLength?: number;
  } & Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  const maxLength = options?.maxLength || 50;

  return {
    id: 'notes',
    key: String(key),
    title,
    type: 'text',
    grow: 2,
    formatter: (value) => {
      if (!value) return '—';
      const str = String(value);
      return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
    },
    ...options,
  };
}

/**
 * Create an employee/assigned column
 */
export function employeeColumn<T>(
  key: keyof T | string = 'assigned_to_name',
  title: string = 'المكلف',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'employee',
    key: String(key),
    title,
    type: 'text',
    grow: 1,
    formatter: (value) => value || '—',
    ...options,
  };
}

/**
 * Create a service/task name column
 */
export function serviceColumn<T>(
  key: keyof T | string = 'task_name',
  title: string = 'الخدمة',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'service',
    key: String(key),
    title,
    type: 'text',
    grow: 1,
    ...options,
  };
}

/**
 * Create a description column
 */
export function descriptionColumn<T>(
  key: keyof T | string = 'description',
  title: string = 'الوصف',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return {
    id: 'description',
    key: String(key),
    title,
    type: 'text',
    grow: 2,
    ...options,
  };
}

/**
 * Create an amount column
 */
export function amountColumn<T>(
  key: keyof T | string = 'amount',
  title: string = 'المبلغ',
  options?: Partial<HuloolGridColumn<T>>
): HuloolGridColumn<T> {
  return currencyColumn<T>(key, title, options);
}

// ================================
// PRESET COLUMN SETS
// ================================

/**
 * Get standard client columns
 */
export function getClientColumns<T extends { id?: number; name?: string; phone?: string; region_name?: string; notes?: string; total_outstanding?: number }>(): HuloolGridColumn<T>[] {
  return [
    clientNameColumn<T>('name', 'اسم العميل'),
    phoneColumn<T>('phone', 'الهاتف'),
    textColumn<T>('region_name', 'المنطقة'),
    notesColumn<T>('notes', 'الملاحظات'),
    dueColumn<T>('total_outstanding', 'المستحق'),
  ];
}

/**
 * Get standard task columns
 */
export function getTaskColumns<T extends { id?: number; client?: { name?: string; phone?: string }; task_name?: string; type?: string; status?: string; notes?: string }>(): HuloolGridColumn<T>[] {
  return [
    clientNameColumn<T>('client.name', 'العميل'),
    phoneColumn<T>('client.phone', 'الهاتف'),
    serviceColumn<T>('task_name', 'الخدمة'),
    typeColumn<T>('type', 'النوع'),
    notesColumn<T>('notes', 'الملاحظات'),
    statusColumn<T>('status', 'الحالة'),
  ];
}

/**
 * Get standard receivable/statement columns
 */
export function getReceivableColumns<T extends { description?: string; debit?: number; credit?: number; balance?: number; date?: string; type?: string }>(): HuloolGridColumn<T>[] {
  return [
    descriptionColumn<T>('description', 'الوصف'),
    debitColumn<T>('debit', 'المدين'),
    creditColumn<T>('credit', 'الدائن'),
    dueColumn<T>('balance', 'المستحق'),
    dateColumn<T>('date', 'التاريخ'),
    typeColumn<T>('type', 'النوع'),
  ];
}

/**
 * Get standard transaction columns
 */
export function getTransactionColumns<T extends { client_name?: string; task_name?: string; amount?: number; balance?: number; transaction_date?: string; direction?: string }>(): HuloolGridColumn<T>[] {
  return [
    textColumn<T>('client_name', 'العميل'),
    textColumn<T>('task_name', 'المهمة'),
    currencyColumn<T>('amount', 'المبلغ'),
    currencyColumn<T>('balance', 'الرصيد'),
    dateColumn<T>('transaction_date', 'التاريخ'),
    badgeColumn<T>('direction', 'النوع', {
      formatter: (val) => val === 'CREDIT' ? 'دائن' : 'مدين',
      badgeColors: {
        CREDIT: '#22c55e',
        DEBIT: '#ef4444',
      },
    }),
  ];
}

