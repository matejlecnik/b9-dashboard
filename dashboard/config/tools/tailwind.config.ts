import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // B9 Agency brand colors - Monochromatic Pink & Grayscale System
        'b9-pink': '#FF8395',
        'b9-black': '#000000',
        'b9-white': '#FFFFFF',
        'b9-grey': '#6B7280',
        
        // Complete Pink Scale for Brand Consistency
        pink: {
          50: '#FFF5F7',   // Lightest tint - backgrounds
          100: '#FFE4E9',  // Very light - hover states
          200: '#FFCCD5',  // Light - borders
          300: '#FFB3C1',  // Medium light - badges
          400: '#FF99A9',  // Medium - active states
          500: '#FF8395',  // B9 Pink - primary actions
          600: '#FF6B80',  // Medium dark - hover on primary
          700: '#FF4D68',  // Dark - pressed states
          800: '#E63950',  // Very dark - critical actions
          900: '#CC2038',  // Darkest - high contrast
        },
        
        // Disable other colors to enforce brand consistency
        // Only allow gray scale and our pink
        red: {},
        orange: {},
        amber: {},
        yellow: {},
        lime: {},
        green: {},
        emerald: {},
        teal: {},
        cyan: {},
        sky: {},
        blue: {},
        indigo: {},
        violet: {},
        purple: {},
        fuchsia: {},
        rose: {},
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        // Keep only essential fade animation
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        // Shimmer animation for skeleton loading
        'shimmer': {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: '200% 0',
          },
        },
      },
      animation: {
        // Only keep basic fade animation
        'fade-in': 'fade-in 0.15s ease-out',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Standard box shadows for consistency
      boxShadow: {
        'xs': '0 1px 3px rgba(0,0,0,0.04)',
        'sm': '0 2px 8px rgba(0,0,0,0.06)',
        'md': '0 4px 12px rgba(0,0,0,0.08)',
        'lg': '0 8px 24px rgba(0,0,0,0.10)',
        'xl': '0 12px 32px rgba(0,0,0,0.12)',
        '2xl': '0 24px 48px rgba(0,0,0,0.16)',
        'card': '0 2px 8px rgba(255,131,149,0.08)',
        'card-hover': '0 8px 24px rgba(255,131,149,0.15)',
        'pink': '0 4px 12px rgba(255,131,149,0.20)',
        'pink-lg': '0 8px 24px rgba(255,131,149,0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
        'none': 'none',
      }
    },
  },
  plugins: [],
}

export default config
