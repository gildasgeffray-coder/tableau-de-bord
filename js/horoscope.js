/* Horoscope du jour pour plusieurs signes, qui défilent toutes les 20 secondes (toucher pour passer au suivant).
   Source : flux RSS de mon-horoscope-du-jour.com, lus par le moteur. */
var Horoscope = (function () {
  var CACHE = "dash.horo";
  var SIGNES = {
    belier: { n: "Bélier", g: "♈", d: "21 mars – 19 avril" },
    taureau: { n: "Taureau", g: "♉", d: "20 avril – 20 mai" },
    gemeaux: { n: "Gémeaux", g: "♊", d: "21 mai – 20 juin" },
    cancer: { n: "Cancer", g: "♋", d: "21 juin – 22 juillet" },
    lion: { n: "Lion", g: "♌", d: "23 juillet – 22 août" },
    vierge: { n: "Vierge", g: "♍", d: "23 août – 22 sept." },
    balance: { n: "Balance", g: "♎", d: "23 sept. – 22 oct." },
    scorpion: { n: "Scorpion", g: "♏", d: "23 oct. – 21 nov." },
    sagittaire: { n: "Sagittaire", g: "♐", d: "22 nov. – 21 déc." },
    capricorne: { n: "Capricorne", g: "♑", d: "22 déc. – 19 janv." },
    verseau: { n: "Verseau", g: "♒", d: "20 janv. – 18 févr." },
    poissons: { n: "Poissons", g: "♓", d: "19 févr. – 20 mars" }
  };
  var data = U.load(CACHE, null);
  var idx = 0, timer = null;

  function signs() { return Settings.get().signes || CONFIG.signes; }

  function render() {
    var list = signs();
    if (!list.length) { U.$("hr-body").innerHTML = '<div class="empty">Choisis un signe dans les réglages</div>'; return; }
    idx = idx % list.length;
    var key = list[idx], s = SIGNES[key] || { n: key, g: "", d: "" };
    var text, src = "";
    if (!API.isLive()) text = "Texte d'exemple. L'horoscope du jour s'affichera ici une fois le moteur Google connecté.";
    else if (data && data.signs && data.signs[key]) { text = data.signs[key].text; src = data.source || ""; }
    else text = "Horoscope indisponible pour le moment.";
    U.$("hr-body").innerHTML = '<div class="fade" style="display:flex;flex-direction:column;flex:1;min-height:0">' +
      '<div class="hr-sign"><span class="hr-glyph">' + s.g + "︎</span>" +
      '<span class="hr-name">' + U.esc(s.n) + "<small>" + U.esc(s.d) + "</small></span></div>" +
      '<div class="hr-text">' + U.esc(text) + "</div>" +
      (src ? '<div class="hr-src">Source : ' + U.esc(src) + "</div>" : (API.isLive() ? "" : '<div class="hr-src"><span class="demo-tag">démo</span></div>')) +
      "</div>";
    var dots = "";
    for (var i = 0; i < list.length; i++) dots += '<i class="hr-dot' + (i === idx ? " on" : "") + '"></i>';
    U.$("hr-dots").innerHTML = dots;
  }

  function next() { idx++; render(); }
  function restartTimer() { if (timer) clearInterval(timer); timer = setInterval(next, 20000); }

  function fetchHoro() {
    if (!API.isLive()) { render(); return; }
    API.get("horoscope", { signs: signs().join(",") }).then(function (d) {
      data = d; U.save(CACHE, d);
      Status.set("horoscope", null); render();
    }).catch(function (e) { Status.set("horoscope", e); render(); });
  }

  function start() {
    U.$("w-horo").onclick = function () { next(); restartTimer(); };
    render(); restartTimer();
    U.every(CONFIG.rafraichir.horoscope, fetchHoro);
  }
  return { start: start, refresh: fetchHoro, SIGNES: SIGNES };
})();
