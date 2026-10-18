import { useEffect } from 'react';
import { setTitleOverrideActive } from './pageTitles';

/**
 * Set the tab title to the entity's real name, e.g. "باسم الشارقي" instead of "العميل #44".
 *
 * The router only sees the id in the URL, which tells a human nothing, and every tab
 * reading the same text is exactly the problem this is fixing. Cleared on unmount so
 * navigating away does not leave a stale name behind.
 */
export function useDocumentTitle(name: string | null | undefined) {
  useEffect(() => {
    const clean = name && name.trim() ? name.trim() : null;
    if (!clean) return;
    document.title = clean;
    setTitleOverrideActive(true);
    return () => {
      setTitleOverrideActive(false);
      document.title = '';
    };
  }, [name]);
}