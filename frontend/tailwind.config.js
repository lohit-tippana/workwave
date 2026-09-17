/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff', 100: '#d9ebff', 200: '#bcddff', 300: '#8ec7ff',
          400: '#59a8ff', 500: '#3385ff', 600: '#1b64f5', 700: '#144ee1',
          800: '#1740b6', 900: '#193a8f', 950: '#142557',
        },
      },
    },
  },
  plugins: [],
};
