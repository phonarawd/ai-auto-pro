/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--clime-font-sans)", "sans-serif"],
        mono: ["var(--clime-font-mono)", "monospace"],
      },
      colors: {
        clime: {
          bg: "var(--clime-bg)",
          "bg-elevated": "var(--clime-bg-elevated)",
          fg: "var(--clime-fg)",
          "fg-muted": "var(--clime-fg-muted)",
          border: "var(--clime-border)",
          accent: "var(--clime-accent)",
          "accent-fg": "var(--clime-accent-fg)",
          success: "var(--clime-success)",
          warning: "var(--clime-warning)",
          danger: "var(--clime-danger)",
          info: "var(--clime-info)",
        },
      },
    },
  },
  plugins: [],
};
