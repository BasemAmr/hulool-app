/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  safelist: [
    // Shadcn / Radix compat tokens
    'bg-primary', 'bg-primary-foreground',
    'bg-secondary', 'bg-secondary-foreground',
    'bg-destructive', 'bg-destructive-foreground',
    'bg-muted', 'bg-muted-foreground',
    'bg-accent', 'bg-accent-foreground',
    'bg-popover', 'bg-popover-foreground',
    'bg-card', 'bg-card-foreground',
    'bg-background', 'bg-foreground',
    'text-primary', 'text-primary-foreground',
    'text-secondary', 'text-secondary-foreground',
    'text-destructive', 'text-destructive-foreground',
    'text-muted', 'text-muted-foreground',
    'text-accent', 'text-accent-foreground',
    'text-popover', 'text-popover-foreground',
    'text-card', 'text-card-foreground',
    'text-background', 'text-foreground',
    'border-primary', 'border-secondary', 'border-destructive',
    'border-muted', 'border-accent', 'border-input', 'border-border', 'border-ring',
    'hover:bg-primary', 'hover:bg-secondary', 'hover:bg-destructive',
    'hover:bg-muted', 'hover:bg-accent',
    'hover:text-primary', 'hover:text-secondary',
    'hover:border-primary',
    'ring-primary', 'ring-ring',
    'accent-primary',
    // Semantic token utilities
    'bg-bg-page', 'bg-bg-surface', 'bg-bg-surface-hover', 'bg-bg-surface-muted',
    'text-text-primary', 'text-text-secondary', 'text-text-muted',
    'text-text-inverse', 'text-text-brand', 'text-text-danger',
    'text-text-success', 'text-text-warning',
    'border-border-default', 'border-border-strong', 'border-border-focus', 'border-border-danger',
    'bg-action-primary', 'bg-action-secondary', 'bg-action-danger',
    'text-action-primary', 'text-action-secondary', 'text-action-danger',
    // Status token utilities
    'bg-status-success-bg', 'text-status-success-text', 'border-status-success-border',
    'bg-status-warning-bg', 'text-status-warning-text', 'border-status-warning-border',
    'bg-status-danger-bg',  'text-status-danger-text',  'border-status-danger-border',
    'bg-status-info-bg',    'text-status-info-text',    'border-status-info-border',
    'bg-status-neutral-bg', 'text-status-neutral-text', 'border-status-neutral-border',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontSize: {
        'xs': '0.6rem',      // 0.75rem * 0.8
        'sm': '0.7rem',      // 0.875rem * 0.8
        'base': '0.8rem',    // 1rem * 0.8
        'lg': '0.9rem',      // 1.125rem * 0.8
        'xl': '1rem',        // 1.25rem * 0.8
        '2xl': '1.2rem',     // 1.5rem * 0.8
        '3xl': '1.44rem',    // 1.875rem * 0.8
        '4xl': '1.8rem',     // 2.25rem * 0.8
        '5xl': '2.4rem',     // 3rem * 0.8
        '6xl': '3rem',       // 3.75rem * 0.8
        '7xl': '3.6rem',     // 4.5rem * 0.8
        '8xl': '4.8rem',     // 6rem * 0.8
        '9xl': '6.4rem',     // 8rem * 0.8
      }
    },
  },
  plugins: [],
}