/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius, 0.95rem)',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

