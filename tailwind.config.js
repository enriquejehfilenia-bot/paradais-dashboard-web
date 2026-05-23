/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#FDFCFA',
        card:     '#FFFFFF',
        'text-main':  '#1C1917',
        'text-soft':  '#78716C',
        accent:   '#EAB308',
        border:   '#E7E5E4',
        dark:     '#1C1917',
        green:    '#10B981',
        amber:    '#F59E0B',
        red:      '#DC2626',
        'gray-line': '#475569',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card: '0 4px 12px rgba(0,0,0,0.03)',
      },
    },
  },
  plugins: [],
}
