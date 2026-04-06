export const TASK_TYPE_TRANSLATIONS: Record<string, string> = {
    'Government': 'حكومية',
    'Accounting': 'محاسبة',
    'Tax': 'ضرائب',
    'Zakat': 'زكاة',
    'Legal': 'قانونية',
    'Consulting': 'استشارات',
    'Audit': 'مراجعة',
    'Other': 'أخرى',
    // Add all task types used in the system
};

export const translateTaskType = (type: string): string => {
    return TASK_TYPE_TRANSLATIONS[type] || type;
};
