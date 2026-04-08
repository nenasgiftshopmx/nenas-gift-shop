import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nenas: {
          50: '#FFF0F5',
          100: '#FFE4F0',
          200: '#FFB6D9',
          300: '#FF8EC4',
          400: '#FF69B4',
          500: '#FF1493',
          600: '#E91E8C',
          700: '#C4177A',
          800: '#9F1264',
          900: '#7A0E4E',
        },
        navy: {
          DEFAULT: '#1a2744',
          light: '#2a3a5c',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
