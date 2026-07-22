/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0f14",
          900: "#0f151c",
          800: "#161f29",
          700: "#202c39",
        },
        ember: {
          400: "#ff9a4d",
          500: "#ff7a1a",
          600: "#f2620a",
          700: "#c94f08",
        },
        teal: {
          400: "#2dd4c8",
          500: "#14b8ac",
        },
      },
      fontFamily: {
        display: ["'Poppins'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
