import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          light: '#FFD6E0',
          DEFAULT: '#FF8FAB',
          dark: '#E8607A',
        },
        mango: {
          light: '#FFE8B2',
          DEFAULT: '#FFCA3A',
          dark: '#E5A800',
        },
        mint: {
          light: '#C8F0D8',
          DEFAULT: '#4DD98A',
          dark: '#28A85E',
        },
        sky: {
          light: '#C5E8FF',
          DEFAULT: '#47B5FF',
          dark: '#1A8FE3',
        },
        lavender: {
          light: '#E8D5FF',
          DEFAULT: '#B07FFF',
          dark: '#8A52E8',
        },
        plum: {
          DEFAULT: '#2D2A3E',
          muted: '#7C7A8E',
          surface: '#F2F0F8',
          border: '#EDE8F5',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
