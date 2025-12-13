/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "autoprefixer": {}, // C'était la ligne manquante qui causait l'erreur
  },
};

export default config;