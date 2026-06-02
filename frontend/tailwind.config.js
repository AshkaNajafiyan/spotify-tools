/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        spotify: "#1DB954",
        dark: "#121212",
      },
    },
  },
  plugins: [],
  screens: {
    'xs': '475px',
  }
}