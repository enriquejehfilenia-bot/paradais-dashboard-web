/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:          '#0F0E0D',   // body — near-black
        card:        '#1C1917',   // card surface
        surface:     '#242120',   // inputs, filter bar, elevated
        'text-main': '#F2F0EE',   // near-white
        'text-soft': '#A8A29E',   // warm medium gray
        accent:      '#EAB308',   // yellow — brand anchor
        border:      '#2C2926',   // dark border
        dark:        '#0A0908',   // login bg — deepest
        green:       '#10B981',
        amber:       '#F59E0B',
        red:         '#DC2626',
        'gray-line': '#64748B',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
