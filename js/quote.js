/* Citation du jour, source citationdujour.fr, lue par le moteur */
var Quote = (function () {
  var CACHE = "dash.quote";
  var q = U.load(CACHE, null);

  function render() {
    var data = API.isLive() ? q : { text: "La citation du jour s'affichera ici une fois le moteur Google connecté.", author: "", demo: true };
    var el = U.$("qt-body");
    if (!data || !data.text) { el.innerHTML = '<div class="empty">Citation indisponible</div>'; return; }
    el.innerHTML = '<div class="qt-text">« ' + U.esc(data.text) + " »</div>" +
      '<div class="qt-author">' + (data.demo ? '<span class="demo-tag">démo</span>' : U.esc(data.author)) + "</div>";
  }

  function fetchQuote() {
    if (!API.isLive()) { render(); return; }
    API.get("quote").then(function (d) {
      if (d && d.text) { q = d; U.save(CACHE, d); }
      Status.set("citation", null); render();
    }).catch(function (e) { Status.set("citation", e); render(); });
  }

  function start() { render(); U.every(CONFIG.rafraichir.citation, fetchQuote); }
  return { start: start, refresh: fetchQuote };
})();
