/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#8b5cf6',
          gold: '#eab308',
          success: '#22c55e',
          danger: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
