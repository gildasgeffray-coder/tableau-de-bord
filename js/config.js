/* Réglages par défaut. Ceux modifiés dans l'écran ⚙ sont gardés sur la tablette. */
var CONFIG = {
  ville: "Guenrouët",
  latitude: 47.5194,
  longitude: -1.9568,
  signes: ["lion", "sagittaire", "vierge"],
  objectifsSport: ["10 000 pas", "30 min de vélo ou de marche", "15 min d'étirements"],
  nuitDebut: 23,   /* heure à laquelle l'écran s'assombrit */
  nuitFin: 6,      /* heure à laquelle il redevient normal */
  rafraichir: {    /* en minutes */
    meteo: 15,
    agenda: 5,
    actualites: 60,
    horoscope: 180,
    interieur: 5
  }
};
