import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildDocumentTitle, hasTitleOverride } from './pageTitles';

/**
 * Keeps the browser tab title in step with the route.
 *
 * Rendered by every layout (admin, employee) and by the login page, so any route the user
 * can reach gets a title. Renders nothing.
 */
export default function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    // A page holding a loaded entity owns the title until it unmounts; don't stamp over it.
    if (hasTitleOverride()) return;
    document.title = buildDocumentTitle(pathname);
  }, [pathname]);

  return null;
}
