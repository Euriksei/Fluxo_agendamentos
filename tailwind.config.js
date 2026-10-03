/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          black: '#0F0F14',
          blue: '#2563EB',
          purple: '#7C3AED',
          white: '#FFFFFF',
          dark: '#181820',
          gray: '#9CA3AF',
        }
      }
    }
  },
  plugins: [],
}