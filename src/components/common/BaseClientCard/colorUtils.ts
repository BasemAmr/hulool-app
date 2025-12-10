// Color utilities for BaseClientCard - centralized color management

import type { TaskTypeColorConfig, ColorScheme } from './types';

/**
 * Convert hex color to rgba
 */
export const hexToRgba = (hex: string, opacity: number): string => {
  // Handle if hex starts with # or not
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Task type color configurations
 */
export const TASK_TYPE_COLORS: Record<string, TaskTypeColorConfig> = {
  Government: {
    primaryColor: '#007bff',
    alternatingColors: ['#e3f2fd', '#bbdefb'],
  },
  Accounting: {
    primaryColor: '#ffc107',
    alternatingColors: ['#fff8e1', '#ffecb3'],
  },
  'Real Estate': {
    primaryColor: '#28a745',
    alternatingColors: ['#e8f5e8', '#c8e6c9'],
  },
  Other: {
    primaryColor: '#6c757d',
    alternatingColors: ['#f8f9fa', '#e9ecef'],
  },
};

/**
 * Urgent task colors
 */
export const URGENT_COLORS: ColorScheme = {
  headerColor: hexToRgba('#dc3545', 0.8),
  borderColor: hexToRgba('#c82333', 0.6),
  row1Color: hexToRgba('#ffebeb', 0.5),
  row2Color: hexToRgba('#ffe6e6', 0.5),
};

/**
 * Map base alternating color to header color
 */
const getHeaderColorFromBase = (baseColor: string): string => {
  const colorMap: Record<string, string> = {
    '#e3f2fd': '#1976d2', // Blue
    '#bbdefb': '#0d47a1', // Blue darker
    '#fff8e1': '#f57f17', // Yellow
    '#ffecb3': '#ff8f00', // Yellow darker
    '#e8f5e8': '#2e7d32', // Green
    '#c8e6c9': '#1b5e20', // Green darker
    '#f8f9fa': '#495057', // Gray
    '#e9ecef': '#343a40', // Gray darker
  };
  return colorMap[baseColor] || '#343a40';
};

/**
 * Calculate color scheme based on card index, alternating colors, and urgency
 */
export const calculateColorScheme = (
  index: number,
  alternatingColors: string[],
  isUrgent: boolean
): ColorScheme => {
  if (isUrgent) {
    return URGENT_COLORS;
  }

  const colorIndex = index % 2;
  const baseColor = alternatingColors[colorIndex] || alternatingColors[0];
  const headerBase = getHeaderColorFromBase(baseColor);
  const headerColor = hexToRgba(headerBase, 0.5);

  return {
    headerColor,
    borderColor: headerColor,
    row1Color: hexToRgba(alternatingColors[1] || alternatingColors[0], 0.3),
    row2Color: hexToRgba(alternatingColors[1] || alternatingColors[0], 1),
  };
};

/**
 * Get row background color based on index and urgency
 */
export const getRowBackground = (
  taskIndex: number,
  isTaskUrgent: boolean,
  row1Color: string,
  row2Color: string
): string => {
  if (isTaskUrgent) {
    return '#ffcccc';
  }
  return taskIndex % 2 === 0 ? row1Color : row2Color;
};

/**
 * Default alternating colors if none provided
 */
export const DEFAULT_ALTERNATING_COLORS = ['#e3f2fd', '#bbdefb'];
