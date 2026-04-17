/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        hackfix: '#3b82f6',      // Electric Blue
        craftsman: '#10b981',     // Deep Green
        'ux-king': '#f97316',     // Warm Orange
        defender: '#64748b',      // Steel Gray
        innovator: '#a855f7',     // Vibrant Purple
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
