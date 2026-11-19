/* Démarrage, plein écran, écran allumé, mode nuit, rechargement quotidien */
(function () {
  Status.set("init", null);
  Clock.start();
  Weather.start();
  Agenda.start();
  Horoscope.start();

  U.$("btn-settings").onclick = Settings.open;

  /* Plein écran à la demande (en mode application ou kiosque, il l'est déjà) */
  U.$("btn-fs").onclick = function () {
    var el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
    }
  };

  /* Empêche la mise en veille de l'écran quand le navigateur le permet */
  var lock = null;
  function wake() {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    navigator.wakeLock.request("screen").then(function (l) { lock = l; }).catch(function () { });
  }
  document.addEventListener("visibilitychange", function () {
    wake();
    if (document.visibilityState === "visible") { Weather.refresh(); Agenda.refresh(); }
  });
  wake();
  document.addEventListener("click", function () { if (!lock) wake(); });

  /* Mode nuit : écran assombri */
  function night() {
    var g = Settings.get(), h = new Date().getHours();
    var on = g.nuitDebut > g.nuitFin ? (h >= g.nuitDebut || h < g.nuitFin) : (h >= g.nuitDebut && h < g.nuitFin);
    U.$("night").className = "night" + (on ? " on" : "");
  }
  night(); setInterval(night, 60000);

  /* Rechargement complet chaque nuit à 4 h, pour un fonctionnement 24 h/24 sans fuite de mémoire */
  var booted = Date.now();
  setInterval(function () {
    var d = new Date();
    if (d.getHours() === 4 && Date.now() - booted > 3600000 && navigator.onLine !== false) location.reload();
  }, 5 * 60000);

  /* Retour de connexion : on rafraîchit tout */
  window.addEventListener("online", function () { Weather.refresh(); Agenda.refresh(); Horoscope.refresh(); });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () { });
  }
})();
