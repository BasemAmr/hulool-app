export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'hulool-theme';

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark';

const canUseDOM = typeof window !== 'undefined';

export function getSystemTheme(): ThemeMode {
  if (!canUseDOM) return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): ThemeMode | null {
  if (!canUseDOM) return null;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(storedTheme) ? storedTheme : null;
}

export function resolveTheme(): ThemeMode {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: ThemeMode): void {
  if (!canUseDOM) return;

  const root = window.document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function initializeTheme(): ThemeMode {
  const theme = resolveTheme();
  applyTheme(theme);
  return theme;
}

export function persistTheme(theme: ThemeMode): void {
  if (!canUseDOM) return;

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function setTheme(theme: ThemeMode): void {
  persistTheme(theme);
  applyTheme(theme);
}

export function toggleTheme(theme: ThemeMode): ThemeMode {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  return nextTheme;
}