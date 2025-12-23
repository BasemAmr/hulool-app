export const TOAST_MESSAGES = {
  // Client operations
  CLIENT_CREATED: 'تم إضافة العميل بنجاح',
  CLIENT_UPDATED: 'تم تحديث بيانات العميل بنجاح',
  CLIENT_DELETED: 'تم حذف العميل بنجاح',
  
  // Task operations
  TASK_CREATED: 'تم إضافة المهمة بنجاح',
  TASK_UPDATED: 'تم تحديث المهمة بنجاح',
  TASK_COMPLETED: 'تم إكمال المهمة بنجاح',
  TASK_CANCELLED: 'تم إلغاء المهمة بنجاح',
  TASK_DELETED: 'تم حذف المهمة بنجاح',
  TASK_RESTORED: 'تم استعادة المهمة بنجاح',
  TASK_ASSIGNED: 'تم تعيين المهمة بنجاح',
  TASK_SUBMITTED_REVIEW: 'تم إرسال المهمة للمراجعة بنجاح',
  TASK_APPROVED: 'تم اعتماد المهمة بنجاح',
  TASK_REJECTED: 'تم رفض المهمة',
  
  // Invoice operations
  INVOICE_CREATED: 'تم إنشاء الفاتورة بنجاح',
  INVOICE_UPDATED: 'تم تحديث الفاتورة بنجاح',
  INVOICE_DELETED: 'تم حذف الفاتورة بنجاح',
  INVOICE_CANCELLED: 'تم إلغاء الفاتورة بنجاح',
  INVOICE_PAYMENT_RECORDED: 'تم تسجيل الدفعة بنجاح',
  INVOICE_GENERATED: 'تم إنشاء الفاتورة النهائية بنجاح',
  
  // Payment operations
  PAYMENT_RECORDED: 'تم تسجيل الدفعة بنجاح',
  PAYMENT_UPDATED: 'تم تحديث الدفعة بنجاح',
  PAYMENT_DELETED: 'تم حذف الدفعة بنجاح',
  
  // Receivable operations
  RECEIVABLE_CREATED: 'تم إضافة المستحق بنجاح',
  RECEIVABLE_UPDATED: 'تم تحديث المستحق بنجاح',
  RECEIVABLE_DELETED: 'تم حذف المستحق بنجاح',
  
  // Transaction operations
  TRANSACTION_CREATED: 'تم إنشاء المعاملة بنجاح',
  TRANSACTION_UPDATED: 'تم تحديث المعاملة بنجاح',
  TRANSACTION_DELETED: 'تم حذف المعاملة بنجاح',
  SANAD_QABD_CREATED: 'تم إنشاء سند القبض بنجاح',
  SANAD_SARF_CREATED: 'تم إنشاء سند الصرف بنجاح',
  
  // Employee operations
  EMPLOYEE_CREATED: 'تم إضافة الموظف بنجاح',
  EMPLOYEE_UPDATED: 'تم تحديث بيانات الموظف بنجاح',
  EMPLOYEE_DELETED: 'تم حذف الموظف بنجاح',
  PAYOUT_RECORDED: 'تم تسجيل الصرف للموظف بنجاح',
  EMPLOYEE_PAYOUT_RECORDED: 'تم تسجيل صرف الموظف بنجاح',
  BORROW_RECORDED: 'تم تسجيل السلفة بنجاح',
  COMMISSION_UPDATED: 'تم تحديث العمولة بنجاح',
  
  // Tag operations
  TAG_CREATED: 'تم إضافة الوسم بنجاح',
  TAG_UPDATED: 'تم تحديث الوسم بنجاح',
  TAG_DELETED: 'تم حذف الوسم بنجاح',
  
  // Credit operations
  CREDIT_RECORDED: 'تم تسجيل الرصيد بنجاح',
  CREDIT_APPLIED: 'تم تطبيق الرصيد بنجاح',
  CREDIT_UPDATED: 'تم تحديث الرصيد بنجاح',
  CREDIT_DELETED: 'تم حذف الرصيد بنجاح',
  CREDIT_REDUCTION_RESOLVED: 'تم حل تعارض تخفيض الرصيد بنجاح',

  // Allocation operations
  ALLOCATION_CREATED: 'تم إنشاء التخصيص بنجاح',
  ALLOCATION_UPDATED: 'تم تحديث التخصيص بنجاح',
  ALLOCATION_DELETED: 'تم حذف التخصيص بنجاح',

  // Receivable operations (expanded)
  RECEIVABLE_OVERPAYMENT_RESOLVED: 'تم حل تعارض الدفع الزائد بنجاح',
  RECEIVABLE_DELETION_RESOLVED: 'تم حذف المستحق وحل التعارضات بنجاح',

  // Task operations (expanded)
  TASK_AMOUNT_UPDATED: 'تم تحديث مبلغ المهمة بنجاح',
  TASK_PREPAID_UPDATED: 'تم تحديث المبلغ المدفوع مقدماً بنجاح',
  TASK_CONFLICT_RESOLVED: 'تم حل تعارض المهمة بنجاح',
  TASK_DEFERRED: 'تم تأجيل المهمة بنجاح',
  TASK_RESUMED: 'تم استئناف المهمة بنجاح',

  // Subtask operations
  SUBTASKS_UPDATED: 'تم تحديث المهام الفرعية بنجاح',

  // Tag operations (expanded)
  TAG_TASKS_UPDATED: 'تم تحديث مهام الوسم بنجاح',

  // Urgent alert operations
  URGENT_ALERT_CREATED: 'تم إنشاء التنبيه العاجل بنجاح',

  // Conflict resolution operations
  PREPAID_CONFLICT_RESOLVED: 'تم حل تعارض الدفع المقدم بنجاح',
  TASK_AMOUNT_CONFLICT_RESOLVED: 'تم حل تعارض مبلغ المهمة بنجاح',
  TASK_CANCELLATION_RESOLVED: 'تم إلغاء المهمة وحل التعارضات بنجاح',

  // Validation operations
  VALIDATION_PASSED: 'تم التحقق بنجاح',
  VALIDATION_FAILED: 'فشل التحقق من البيانات',

  // Employee transaction operations
  EMPLOYEE_TRANSACTION_UPDATED: 'تم تحديث معاملة الموظف بنجاح',
  EMPLOYEE_TRANSACTION_DELETED: 'تم حذف معاملة الموظف بنجاح',

  // Message operations
  MESSAGE_SENT: 'تم إرسال الرسالة بنجاح',
  MESSAGE_FAILED: 'فشل إرسال الرسالة',

  // Generic success messages with context
  OPERATION_SUCCESS: 'تمت العملية بنجاح',
  SAVE_SUCCESS: 'تم الحفظ بنجاح',
  UPDATE_SUCCESS: 'تم التحديث بنجاح',
  DELETE_SUCCESS: 'تم الحذف بنجاح',
  CREATE_SUCCESS: 'تم الإنشاء بنجاح',

  // Generic error messages with context
  SAVE_FAILED: 'فشل الحفظ',
  UPDATE_FAILED: 'فشل التحديث',
  DELETE_FAILED: 'فشل الحذف',
  CREATE_FAILED: 'فشل الإنشاء',
  LOAD_FAILED: 'فشل تحميل البيانات',
  REASON_REQUIRED: 'يرجى تقديم سبب الحذف',
  TASK_COMPLETED_WITH_PAYMENT: 'تم إكمال المهمة وتسجيل الدفعة بنجاح',
  
  // Export operations
  EXPORT_SUCCESS: 'تم تصدير الملف بنجاح',
  EXPORT_FAILED: 'فشل التصدير',

  // Error messages
  OPERATION_FAILED: 'فشلت العملية',
  VALIDATION_ERROR: 'خطأ في التحقق من البيانات',
  NETWORK_ERROR: 'خطأ في الاتصال بالخادم',
  PERMISSION_DENIED: 'ليس لديك صلاحية لتنفيذ هذه العملية',
  UNKNOWN_ERROR: 'حدث خطأ غير متوقع',

  // Success titles
  SUCCESS: 'نجح',
  CREATED: 'تم الإنشاء',
  UPDATED: 'تم التحديث',
  DELETED: 'تم الحذف',

  // Error titles
  ERROR: 'خطأ',
  WARNING: 'تحذير',
  INFO: 'معلومة',
};
