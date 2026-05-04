import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sherpa: '#003E51',
      },
    },
  },
  plugins: [],
}
export default config
