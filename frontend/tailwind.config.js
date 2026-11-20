const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { bg: c('bg'), surface: c('surface'), surface2: c('surface2'), primary: c('primary'), secondary: c('secondary'), accent: c('accent'), ink: c('ink'), muted: c('muted'), line: c('line') },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: { soft: '0 1px 2px rgb(23 24 39 / .04), 0 8px 24px -12px rgb(23 24 39 / .12)' },
    },
  },
  plugins: [],
};
