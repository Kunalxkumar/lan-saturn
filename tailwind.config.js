/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saturn: {
          dark: '#0f172a',
          base: '#1e293b',
          light: '#334155',
          accent: '#6366f1',
          accentHover: '#4f46e5',
        }
      }
    },
  },
  plugins: [],
}
