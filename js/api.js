/* Liaison avec le moteur Google Apps Script.
   Sans moteur configuré, l'application fonctionne en mode démo (données locales). */
var API = (function () {
  var KEY = "dash.backend";

  function cfg() { return U.load(KEY, null); }
  function setCfg(c) { U.save(KEY, c); }
  function isLive() { var c = cfg(); return !!(c && c.url && c.token); }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("Délai dépassé")); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function handle(r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json().then(function (j) {
      if (!j.ok) throw new Error(j.error || "Erreur du moteur");
      return j.data;
    });
  }
  function get(action, params, c) {
    c = c || cfg();
    var q = "?action=" + encodeURIComponent(action) + "&token=" + encodeURIComponent(c.token);
    for (var k in (params || {})) q += "&" + k + "=" + encodeURIComponent(params[k]);
    return withTimeout(fetch(c.url + q, { redirect: "follow" }), 30000).then(handle);
  }
  /* text/plain évite la requête préalable CORS, que Apps Script ne gère pas */
  function post(action, data) {
    var c = cfg();
    return withTimeout(fetch(c.url, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: action, token: c.token, data: data })
    }), 30000).then(handle);
  }

  return { cfg: cfg, setCfg: setCfg, isLive: isLive, get: get, post: post };
})();

/* Indicateur d'état en bas à droite : vert connecté, orange démo, rouge erreur */
var Status = (function () {
  var errors = {};
  function set(source, err) {
    if (err) errors[source] = String(err.message || err); else delete errors[source];
    var el = U.$("status");
    var keys = Object.keys(errors);
    el.className = "status " + (keys.length ? "err" : (API.isLive() ? "ok" : "demo"));
    el.title = keys.length ? keys.map(function (k) { return k + " : " + errors[k]; }).join("\n")
      : (API.isLive() ? "Connecté" : "Mode démo : moteur Google non configuré");
  }
  return { set: set };
})();
