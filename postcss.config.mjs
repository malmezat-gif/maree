// Aucun plugin PostCSS n'est nécessaire.
//
// Le projet importait Tailwind, dont le préambule (@layer properties/theme/base)
// pesait environ 2,1 Ko gzip, pour ZÉRO classe utilitaire employée — vérifié par
// grep sur tout app/. Tout le style est écrit à la main dans globals.css, ce qui
// est le parti pris du projet : un seul langage de rendu.
//
// Le reset de Tailwind (preflight) partait avec, d'où la vérification au pixel
// qui accompagne ce changement plutôt qu'une suppression à l'aveugle.
const config = {
  plugins: {},
};

export default config;
