/**
 * Browser tab titles.
 *
 * Without this every tab read "مكتب حلول", which made it impossible to tell tabs apart when
 * an employee has several open. The title is derived from the path so it stays correct
 * without every page remembering to set it.
 *
 * Patterns are checked in order, so the specific ones must come before the generic
 * `:id` catch-alls.
 */
export const APP_NAME = 'مكتب حلول';

type TitleRule = { pattern: RegExp; title: string | ((m: RegExpMatchArray) => string) };

const RULES: TitleRule[] = [
  // ---- auth ----
  { pattern: /^\/login$/, title: 'تسجيل الدخول' },

  // ---- employee ----
  { pattern: /^\/employee\/onboarding$/, title: 'تهيئة الحساب' },
  { pattern: /^\/employee\/dashboard$/, title: 'لوحة التحكم' },
  { pattern: /^\/employee\/tasks$/, title: 'المهام' },
  { pattern: /^\/employee\/clients\/(\d+)/, title: 'العميل' },
  { pattern: /^\/employee\/clients$/, title: 'العملاء' },
  {
    pattern: /^\/employee\/treasury-accounts\/(\d+)/,
    title: 'كشف الحساب',
  },
  { pattern: /^\/employee\/accounts$/, title: 'إدارة الحسابات' },
  { pattern: /^\/employee\/financials$/, title: 'الحسابات المالية' },
  { pattern: /^\/employee\/receivables$/, title: 'المستحقات' },
  { pattern: /^\/employee\/settings$/, title: 'الإعدادات' },
  { pattern: /^\/employee\/notifications$/, title: 'الإشعارات' },

  // ---- admin: financial centre ----
  { pattern: /^\/financial-center\/treasury-accounts\/(\d+)/, title: 'كشف الحساب' },
  { pattern: /^\/financial-center\/treasury-accounts$/, title: 'الحسابات المالية' },
  { pattern: /^\/financial-center\/pending$/, title: 'العمولات المعلّقة' },
  { pattern: /^\/financial-center\/invoices$/, title: 'الفواتير' },
  { pattern: /^\/financial-center\/treasury\/(.+)$/, title: (m) => `حسابات ${decodeURIComponent(m[1])}` },

  // ---- admin: clients ----
  { pattern: /^\/clients\/(\d+)/, title: 'العميل' },
  { pattern: /^\/clients$/, title: 'العملاء' },

  // ---- admin: employees ----
  { pattern: /^\/employees\/all$/, title: 'كل الموظفين' },
  { pattern: /^\/employees\/(\d+)/, title: 'الموظف' },
  { pattern: /^\/employees$/, title: 'الموظفون' },

  // ---- admin: company ----
  { pattern: /^\/company\/(\d+)/, title: 'الشركة' },
  { pattern: /^\/company$/, title: 'الشركة' },

  // ---- admin: receivables ----
  { pattern: /^\/receivables\/paid$/, title: 'المستحقات المسددة' },
  { pattern: /^\/receivables\/overdue$/, title: 'المستحقات المتأخرة' },
  { pattern: /^\/receivables$/, title: 'المستحقات' },

  // ---- admin: misc ----
  { pattern: /^\/dashboard$/, title: 'لوحة التحكم' },
  { pattern: /^\/tasks$/, title: 'المهام' },
  { pattern: /^\/tags$/, title: 'الوسوم' },
  { pattern: /^\/settings$/, title: 'الإعدادات' },
];

/** Resolve a tab title from a pathname. Falls back to the bare app name. */
export function resolvePageTitle(pathname: string): string {
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  for (const rule of RULES) {
    const m = path.match(rule.pattern);
    if (m) {
      return typeof rule.title === 'function' ? rule.title(m) : rule.title;
    }
  }
  return APP_NAME;
}

/**
 * Tab title. Deliberately SHORT - no app-name suffix. Browsers truncate tabs, and
 * "كشف حساب صندوق · مكتب حلول" burned the whole visible width on boilerplate. The favicon
 * already says which site this is.
 *
 * Entity pages (client / employee / treasury) do NOT match these rules: the id in the path
 * is useless to a human, so those pages call useDocumentTitle() with the loaded name and
 * it wins. Hence the (id) patterns below are only a fallback.
 */
export function buildDocumentTitle(pathname: string): string {
  return resolvePageTitle(pathname);
}

/**
 * Let a page override the path-derived title with something meaningful, e.g. the client's
 * real name instead of their numeric id. Call it once the data has loaded.
 */
let overrideActive = false;
export function setTitleOverrideActive(v: boolean) {
  overrideActive = v;
}
export function hasTitleOverride(): boolean {
  return overrideActive;
}
