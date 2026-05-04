import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Qumulo brand: deep navy primary, orange accent.
        qumulo: {
          navy:    '#0E2A47',
          'navy-2': '#13355A',
          orange:  '#FF6B35',
          'orange-hover': '#E55A26',
          ink:     '#0A1628',
        },
        // Legacy alias retained so any unmigrated `sherpa` class still resolves.
        sherpa: '#0E2A47',
      },
    },
  },
  plugins: [],
}
export default config
