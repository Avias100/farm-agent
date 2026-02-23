/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nebula brand palette
        nebula: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',   // primary
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        harvest: {
          400: '#fbbf24',
          500: '#f59e0b',   // accent
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      // Ensure all tap targets meet 44px minimum on mobile
      minHeight: {
        tap: '44px',
      },
    },
  },
  plugins: [],
}
