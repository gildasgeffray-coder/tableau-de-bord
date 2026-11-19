/* 5 actualités du jour, récupérées par le moteur depuis les flux RSS (France Info, Ouest-France, Le Monde) */
var News = (function () {
  var CACHE = "dash.news";
  var items = U.load(CACHE, null);

  var DEMO = [
    { source: "Exemple", title: "Les vraies actualités s'afficheront ici", summary: "Une fois le moteur Google connecté, les titres de France Info, Ouest-France et Le Monde remplaceront ces exemples." },
    { source: "Exemple", title: "Cinq titres, une courte phrase de résumé", summary: "Chaque titre vient avec le nom du journal et l'heure de publication." },
    { source: "Exemple", title: "Mise à jour automatique toutes les heures", summary: "Le tableau garde la dernière liste en mémoire si Internet coupe." },
    { source: "Exemple", title: "Sources configurables", summary: "La liste des journaux se change dans le moteur, sans toucher la tablette." },
    { source: "Exemple", title: "Sans publicité", summary: "Seuls le titre et le résumé du flux RSS sont affichés." }
  ];

  function render() {
    var list = API.isLive() ? (items && items.list) : DEMO;
    var body = U.$("nw-body");
    if (!list || !list.length) { body.innerHTML = '<div class="empty">Pas d\'actualités pour le moment</div>'; return; }
    body.innerHTML = list.slice(0, 5).map(function (n) {
      var t = n.date ? U.hm(new Date(n.date)) : "";
      return '<div class="nw"><div class="src">' + U.esc(n.source) + (t ? "<span>" + t + "</span>" : "") + "</div>" +
        '<div class="ttl">' + U.esc(n.title) + "</div>" +
        (n.summary ? '<div class="sum">' + U.esc(n.summary) + "</div>" : "") + "</div>";
    }).join("");
    U.$("nw-upd").innerHTML = API.isLive() ? (items ? "maj " + U.hm(new Date(items.at)) : "") : '<span class="demo-tag">démo</span>';
  }

  function fetchNews() {
    if (!API.isLive()) { render(); return; }
    API.get("news").then(function (list) {
      items = { list: list, at: Date.now() };
      U.save(CACHE, items);
      Status.set("actualités", null); render();
    }).catch(function (e) { Status.set("actualités", e); render(); });
  }

  function start() { render(); U.every(CONFIG.rafraichir.actualites, fetchNews); }
  return { start: start, refresh: fetchNews };
})();
