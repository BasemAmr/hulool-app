import { useEffect, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';

import { cn } from '@/shared/utils/cn';
import { getStoredTheme, getSystemTheme, setTheme, type ThemeMode } from '@/shared/utils/theme';

interface ThemeToggleButtonProps {
  className?: string;
}

const getInitialTheme = (): ThemeMode => getStoredTheme() ?? getSystemTheme();

const ThemeToggleButton = ({ className }: ThemeToggleButtonProps) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme());

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setThemeState(isDark ? 'light' : 'dark')}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      aria-label={isDark ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
        className
      )}
    >
      {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
      <span className="sr-only">{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
    </button>
  );
};

export default ThemeToggleButton;