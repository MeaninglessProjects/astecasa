/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce6fd',
          200: '#c0d4fc',
          300: '#94b8fa',
          400: '#6192f6',
          500: '#3d6ef0',
          600: '#2754e3',
          700: '#2043d1',
          800: '#2137a9',
          900: '#1f3385',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06), 0 4px 16px rgba(16,24,40,.08)',
      },
    },
  },
  plugins: [],
};
