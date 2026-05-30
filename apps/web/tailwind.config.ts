import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        heading: ['Syne', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0D0D0F',
          surface: '#16161A',
          elevated: '#1C1C22',
        },
        brand: {
          purple: '#7B2FBE',
          magenta: '#C43E8A',
          coral: '#E8622A',
        },
        border: {
          DEFAULT: '#2A2A2F',
          subtle: '#1E1E24',
        },
        text: {
          primary: '#F5F5F7',
          secondary: '#8A8A99',
          muted: '#5A5A69',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7B2FBE 0%, #C43E8A 50%, #E8622A 100%)',
        'brand-gradient-h': 'linear-gradient(90deg, #7B2FBE 0%, #C43E8A 50%, #E8622A 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(123,47,190,0.15) 0%, rgba(196,62,138,0.08) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(20px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
      borderRadius: { lg: '0.625rem', md: '0.5rem', sm: '0.375rem' },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(42,42,47,0.6)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(123,47,190,0.3)',
        'glow-purple': '0 0 20px rgba(123,47,190,0.4)',
        'glow-coral': '0 0 20px rgba(232,98,42,0.4)',
      },
    },
  },
  plugins: [animate],
} satisfies Config
