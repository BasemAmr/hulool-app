export const TASK_TYPE_TRANSLATIONS: Record<string, string> = {
    'Government': 'حكومية',
    'Accounting': 'محاسبية',
    'RealEstate': 'عقارية',
    'Tax': 'ضرائب',
    'Zakat': 'زكاة',
    'Legal': 'قانونية',
    'Consulting': 'استشارات',
    'Audit': 'مراجعة',
    'Other': 'أخرى',
};

export const translateTaskType = (type: string): string => {
    return TASK_TYPE_TRANSLATIONS[type] || type;
};
