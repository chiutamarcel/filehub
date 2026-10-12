/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        customBg: 'rgba(1, 1, 1, 0.6)', 
        customLoginBtn: 'rgba(45, 44, 47, 1)',
        myOrange: 'rgba(255, 163, 26, 1)',
        btnOrange: 'rgba(255, 136, 0, 1)'
      },
      fontFamily: {
        rockSalt: ['Rock Salt', 'cursive'],
      },
      backgroundImage: {
        'logo': "url('/assets/logo.png')",
      }
    },
  },
  plugins: [],
}

