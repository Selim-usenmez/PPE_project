import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Important pour ton dossier components
    "./app/**/*.{js,ts,jsx,tsx,mdx}",       // Important pour ton dossier app
  ],
  theme: {
    extend: {
      // Tu peux laisser vide ou garder tes extensions existantes
    },
  },
  plugins: [],
};
export default config;