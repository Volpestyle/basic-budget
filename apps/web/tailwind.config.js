/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#050816',
          surface: '#0B1020',
        },
        primary: {
          DEFAULT: '#00F5D4',
          50: '#E6FFFA',
          100: '#B3FFF0',
          200: '#80FFE6',
          300: '#4DFFDB',
          400: '#1AFFD1',
          500: '#00F5D4',
          600: '#00C4AA',
          700: '#009380',
          800: '#006255',
          900: '#00312B',
        },
        secondary: {
          DEFAULT: '#9B5DE5',
          50: '#F5EDFB',
          100: '#E6D4F5',
          200: '#D1B3ED',
          300: '#BC92E5',
          400: '#A771DD',
          500: '#9B5DE5',
          600: '#7C3FC7',
          700: '#5D2F95',
          800: '#3E1F64',
          900: '#1F1032',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
