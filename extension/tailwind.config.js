/** Black & white only: no gradients, no shadows, hairline borders. */
export default {
  content: ["./sidepanel.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      white: "#ffffff",
      black: "#000000",
      gray: { 100: "#f5f5f5", 200: "#e5e5e5", 400: "#a3a3a3", 500: "#737373", 600: "#525252" },
      danger: "#000000",
    },
    fontFamily: {
      sans: ['"Geist Variable"', "system-ui", "sans-serif"],
      mono: ['"Geist Mono Variable"', "ui-monospace", "monospace"],
    },
    borderRadius: { none: "0", DEFAULT: "6px", full: "9999px" },
    boxShadow: { none: "none" },
    extend: {},
  },
  plugins: [],
};
