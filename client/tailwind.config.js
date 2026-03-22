export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Base backgrounds (original site)
        dark: '#0d0d0d',
        felt: {
          DEFAULT: '#0d0d0d',
          light: '#1e1e1e',
          lighter: '#2e2e2e',
        },
        'light-gray': '#2e2e2e',
        // Theme greens
        green: {
          DEFAULT: '#1a6b3a',
          400: '#22874a',
        },
        'dark-green': '#0f4225',
        // Theme golds
        gold: '#c9a84c',
        'light-gold': '#f0d070',
        // Medal colors
        silver: '#c0c0c0',
        bronze: '#cd7f32',
        // Text
        text: '#f0f0f0',
        muted: '#aaa',
      },
      fontFamily: {
        sans: ["'Segoe UI'", 'sans-serif'],
      },
    }
  },
  plugins: [],
};
