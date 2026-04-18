/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './pricing/index.html', './pricing/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:   '#192524',
        slate: '#3C5759',
        sage:  '#959D90',
        mint:  '#D1EBDB',
        stone: '#D0D5CE',
        bone:  '#EFECE9',
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'ui-sans-serif', 'sans-serif'],
        body:    ['"Satoshi"', 'ui-sans-serif', 'sans-serif'],
      },
      borderRadius: {
        glass: '1.75rem',
      },
      boxShadow: {
        glass:    'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(25,37,36,0.04), 0 20px 40px -15px rgba(25,37,36,0.10)',
        'glass-feature': 'inset 0 1px 0 rgba(255,255,255,0.6), 0 32px 64px -20px rgba(25,37,36,0.16)',
      },
    },
  },
  plugins: [],
};
