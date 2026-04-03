/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#378ADD', dark: '#185FA5' },
        done: { DEFAULT: '#1D9E75', bg: '#E1F5EE', text: '#0F6E56' },
        ing:  { DEFAULT: '#EF9F27', bg: '#FAEEDA', text: '#BA7517' },
      }
    }
  },
  plugins: []
}
