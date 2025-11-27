/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode: warm off-white/papyrus
        cream: {
          50: '#FDFCFA',
          100: '#FAF8F5',
          200: '#F5F1EB',
          300: '#EDE7DC',
          400: '#E5DDD0',
          500: '#DDD3C4',
        },
        // Dark mode: pure black
        ink: {
          900: '#000000',
          800: '#0A0A0A',
          700: '#111111',
        },
        // Pastel accents for dark mode
        accent: {
          mint: '#A8E6CF',
          lavender: '#B8B5E4',
          peach: '#FFD3B6',
          rose: '#FFAAA5',
          sky: '#A8D8EA',
        },
        // Semantic colors
        positive: '#6BCB77',
        negative: '#FF6B6B',
      },
      fontFamily: {
        mono: ['"Departure Mono"', 'monospace'],
        display: ['"Space Mono"', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.4' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.2' }],
        '4xl': ['2.25rem', { lineHeight: '1.1' }],
      },
    },
  },
  plugins: [],
}
