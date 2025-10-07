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
        // B9 Agency brand colors - Legacy support
        'b9-pink': 'var(--b9-pink)',
        'b9-black': 'var(--b9-black)',
        'b9-white': 'var(--b9-white)',
        'b9-grey': 'var(--b9-grey)',

        // Pink Scale (12 shades) - Mapped to CSS variables for theming
        pink: {
          25: 'var(--pink-25)',
          50: 'var(--pink-50)',
          100: 'var(--pink-100)',
          200: 'var(--pink-200)',
          300: 'var(--pink-300)',
          400: 'var(--pink-400)',
          500: 'var(--pink-500)',  // B9 Pink primary
          600: 'var(--pink-600)',
          700: 'var(--pink-700)',
          800: 'var(--pink-800)',
          900: 'var(--pink-900)',
          950: 'var(--pink-950)',
        },

        // Gray Scale (13 shades) - Mapped to CSS variables
        gray: {
          25: 'var(--gray-25)',
          50: 'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',  // Default border
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
          950: 'var(--gray-950)',
        },

        // Accent Colors (for variety, on-brand)
        rose: {
          50: 'var(--rose-50)',
          500: 'var(--rose-500)',
          700: 'var(--rose-700)',
        },
        fuchsia: {
          50: 'var(--fuchsia-50)',
          500: 'var(--fuchsia-500)',
          700: 'var(--fuchsia-700)',
        },
        purple: {
          50: 'var(--purple-50)',
          500: 'var(--purple-500)',
          600: 'var(--purple-600)',
          700: 'var(--purple-700)',
        },

        // Semantic Color Tokens
        primary: {
          DEFAULT: 'var(--color-primary-base)',
          hover: 'var(--color-primary-hover)',
          pressed: 'var(--color-primary-pressed)',
          light: 'var(--color-primary-light)',
          bg: 'var(--color-primary-bg)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary-base)',
          hover: 'var(--color-secondary-hover)',
          pressed: 'var(--color-secondary-pressed)',
        },
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',

        // Border Color Tokens
        border: {
          DEFAULT: 'var(--border-default)',
          light: 'var(--border-light)',
          strong: 'var(--border-strong)',
          primary: 'var(--border-primary)',
          'primary-strong': 'var(--border-primary-strong)',
          error: 'var(--border-error)',
        },

        // Platform Theme Colors (dynamic)
        platform: {
          primary: 'var(--platform-primary)',
          secondary: 'var(--platform-secondary)',
          accent: 'var(--platform-accent)',
        },

        // Disable unused colors to enforce brand consistency
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
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        // Mac System Fonts (SF Pro) - for monitor pages and premium UI
        'mac': ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'sans-serif'],
        'mac-text': ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Helvetica Neue"', 'sans-serif'],
        'mac-display': ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Helvetica Neue"', 'sans-serif'],
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
      // Shadow & Elevation System - Mapped to CSS variables
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'pink': 'var(--shadow-pink)',       // Pink glow for brand emphasis
        'pink-lg': 'var(--shadow-pink-lg)', // Strong pink glow
        'pink-xl': 'var(--shadow-pink-xl)', // Extra strong pink glow
        'primary': 'var(--shadow-pink)',       // Semantic alias for pink
        'primary-lg': 'var(--shadow-pink-lg)', // Semantic alias for pink-lg
        'primary-xl': 'var(--shadow-pink-xl)', // Semantic alias for pink-xl
        'card': 'var(--shadow-sm)',         // Alias for cards
        'card-hover': 'var(--shadow-md)',   // Alias for card hover
        'elevated': 'var(--shadow-md)',     // Semantic: elevated elements
        'floating': 'var(--shadow-lg)',     // Semantic: floating elements
        'overlay': 'var(--shadow-xl)',      // Semantic: modals/overlays
        'inner': 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
        'none': 'none',
      },
      // Add backdrop filter utilities for glassmorphism
      backdropBlur: {
        'glass-sm': '8px',
        'glass-md': '16px',
        'glass-lg': '24px',
      },
      backdropSaturate: {
        'glass-sm': '150%',
        'glass-md': '180%',
        'glass-lg': '200%',
      },
      // Text shadow utilities
      textShadow: {
        'subtle': 'var(--text-shadow-subtle)',
      }
    },
  },
  plugins: [],
}

export default config
