import { create } from 'zustand';

const STORAGE_KEY = 'tm_font_scale_percent';

const clampScale = (val: number): number => {
  if (isNaN(val)) return 100;
  return Math.min(200, Math.max(100, Math.round(val)));
};

const applyScaleToDOM = (scalePercent: number) => {
  if (typeof document !== 'undefined') {
    const scaleFactor = scalePercent / 100;
    document.documentElement.style.setProperty('--font-scale', scaleFactor.toString());
  }
};

const getInitialScale = (): number => {
  if (typeof window === 'undefined') return 100;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return clampScale(parsed);
    }
  } catch (err) {
    console.warn('Failed to read font scale:', err);
  }
  return 100;
};

const initialScale = getInitialScale();
applyScaleToDOM(initialScale);

interface FontSizeState {
  scalePercent: number;
  setScalePercent: (percent: number) => void;
  resetToDefault: () => void;
}

export const useFontSizeStore = create<FontSizeState>((set, get) => ({
  scalePercent: initialScale,

  setScalePercent: (percent: number) => {
    const target = clampScale(percent);
    applyScaleToDOM(target);
    try {
      localStorage.setItem(STORAGE_KEY, target.toString());
    } catch (err) {
      console.warn('Failed to save font scale:', err);
    }
    set({ scalePercent: target });
  },

  resetToDefault: () => {
    get().setScalePercent(100);
  },
}));
