/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Luxury light" palette — warm off-white canvas, pure-white cards,
        // near-black ink for primary CTAs/text (no blue buttons anywhere).
        base: {
          bg: '#FAF9F6',
          card: '#FFFFFF',
          card2: '#F5F3EF',
          border: '#EAE7E1',
        },
        accent: {
          green: '#16A34A',
          blue: '#0D9488', // repointed to teal — intentionally never a literal "blue" so no accent in the app reads as a blue button
          amber: '#D97706',
          red: '#DC2626',
          purple: '#7C3AED',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,20,18,0.04), 0 8px 24px -8px rgba(23,20,18,0.08)',
        floating: '0 12px 40px -12px rgba(23,20,18,0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
