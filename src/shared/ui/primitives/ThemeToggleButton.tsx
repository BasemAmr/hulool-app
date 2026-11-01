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
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 bg-white/20 text-white hover:bg-white/30 transition-all shadow-2xs focus-visible:outline-none cursor-pointer',
        className
      )}
    >
      {isDark ? <SunMedium size={15} /> : <MoonStar size={15} />}
      <span className="sr-only">{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
    </button>
  );
};

export default ThemeToggleButton;