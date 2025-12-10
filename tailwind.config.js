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
    // Background colors
    'bg-primary', 'bg-primary-foreground',
    'bg-secondary', 'bg-secondary-foreground',
    'bg-destructive', 'bg-destructive-foreground',
    'bg-muted', 'bg-muted-foreground',
    'bg-accent', 'bg-accent-foreground',
    'bg-popover', 'bg-popover-foreground',
    'bg-card', 'bg-card-foreground',
    'bg-background', 'bg-foreground',
    // Text colors
    'text-primary', 'text-primary-foreground',
    'text-secondary', 'text-secondary-foreground',
    'text-destructive', 'text-destructive-foreground',
    'text-muted', 'text-muted-foreground',
    'text-accent', 'text-accent-foreground',
    'text-popover', 'text-popover-foreground',
    'text-card', 'text-card-foreground',
    'text-background', 'text-foreground',
    // Border colors
    'border-primary', 'border-primary-foreground',
    'border-secondary', 'border-secondary-foreground',
    'border-destructive', 'border-destructive-foreground',
    'border-muted', 'border-muted-foreground',
    'border-accent', 'border-accent-foreground',
    'border-popover', 'border-popover-foreground',
    'border-card', 'border-card-foreground',
    'border-background', 'border-foreground',
    'border-input', 'border-border', 'border-ring',
    // Hover states
    'hover:bg-primary', 'hover:bg-secondary', 'hover:bg-destructive',
    'hover:bg-muted', 'hover:bg-accent', 'hover:bg-card',
    'hover:text-primary', 'hover:text-secondary',
    'hover:border-primary', 'hover:border-secondary',
    // Ring colors
    'ring-primary', 'ring-ring',
    // Accent color for checkboxes/inputs
    'accent-primary',
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
    },
  },
  plugins: [],
}