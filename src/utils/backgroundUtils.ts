
// Background utility for applying page-specific backgrounds
let lastAppliedPageType: string | null = null;

export const applyPageBackground = (pageType: string) => {
  if (lastAppliedPageType === pageType) return;
  lastAppliedPageType = pageType;
  const backgroundUrl = localStorage.getItem(`bg-${pageType}`);
  const mainElement = document.querySelector('main');
  if (backgroundUrl && mainElement) {
    // Apply to main element for better coverage
    mainElement.style.setProperty('background-image', `url(${backgroundUrl})`);
    mainElement.style.setProperty('background-size', 'cover');
    mainElement.style.setProperty('background-position', 'center');
    mainElement.style.setProperty('background-attachment', 'fixed');
    mainElement.style.setProperty('background-repeat', 'no-repeat');
    // Also set CSS custom property for potential component use
    document.documentElement.style.setProperty(`--bg-${pageType}`, `url(${backgroundUrl})`);
  } else if (mainElement) {
    // Remove background styles from main
    mainElement.style.removeProperty('background-image');
    mainElement.style.removeProperty('background-size');
    mainElement.style.removeProperty('background-position');
    mainElement.style.removeProperty('background-attachment');
    mainElement.style.removeProperty('background-repeat');
    // Remove CSS custom property
    document.documentElement.style.removeProperty(`--bg-${pageType}`);
  }
};

export const clearAllBackgrounds = () => {
  const mainElement = document.querySelector('main');
  
  if (mainElement) {
    // Remove background styles from main
    mainElement.style.removeProperty('background-image');
    mainElement.style.removeProperty('background-size');
    mainElement.style.removeProperty('background-position');
    mainElement.style.removeProperty('background-attachment');
    mainElement.style.removeProperty('background-repeat');
  }
  
  // Remove all CSS custom properties
  const pageTypes = ['dashboard', 'tasks', 'clients', 'receivables', 'clientProfile'];
  pageTypes.forEach(pageType => {
    document.documentElement.style.removeProperty(`--bg-${pageType}`);
  });
};

export const initializeBackgrounds = () => {
  // Clear all backgrounds first
  clearAllBackgrounds();
  
  // This function can be called when the app loads to ensure clean state
  // Individual pages should call applyPageBackground with their specific page type
};

export const getPageBackground = (pageType: string): string => {
  return localStorage.getItem(`bg-${pageType}`) || '';
};

export const setPageBackground = (pageType: string, imageUrl: string) => {
  localStorage.setItem(`bg-${pageType}`, imageUrl);
  applyPageBackground(pageType);
};

export const removePageBackground = (pageType: string) => {
  localStorage.removeItem(`bg-${pageType}`);
  const mainElement = document.querySelector('main');
  
  if (mainElement) {
    // Remove background styles from main (this will affect the currently applied background)
    mainElement.style.removeProperty('background-image');
    mainElement.style.removeProperty('background-size');
    mainElement.style.removeProperty('background-position');
    mainElement.style.removeProperty('background-attachment');
    mainElement.style.removeProperty('background-repeat');
  }
  
  // Remove CSS custom property
  document.documentElement.style.removeProperty(`--bg-${pageType}`);
};

export const getCurrentPageType = (): string => {
  // Try to detect current page from URL or other means
  const path = window.location.pathname;
  const hash = window.location.hash;
  
  if (path.includes('dashboard') || hash.includes('dashboard')) return 'dashboard';
  if (path.includes('tasks') || hash.includes('tasks')) return 'tasks';
  if (path.includes('clients') || hash.includes('clients')) return 'clients';
  if (path.includes('receivables') || hash.includes('receivables')) return 'receivables';
  if (path.includes('client-profile') || hash.includes('client-profile')) return 'clientProfile';
  
  // Try to get from data attribute
  const appLayout = document.querySelector('[data-page]');
  if (appLayout) {
    return appLayout.getAttribute('data-page') || 'dashboard';
  }
  
  return 'dashboard'; // default
};
