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