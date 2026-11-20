/* Écran de réglages : connexion au moteur Google, signes, lieu, mode nuit */
var Settings = (function () {
  var KEY = "dash.settings";
  var s = U.load(KEY, {});

  function get() {
    return {
      ville: s.ville || CONFIG.ville,
      latitude: s.latitude || CONFIG.latitude,
      longitude: s.longitude || CONFIG.longitude,
      signes: s.signes || CONFIG.signes,
      nuitDebut: s.nuitDebut != null ? s.nuitDebut : CONFIG.nuitDebut,
      nuitFin: s.nuitFin != null ? s.nuitFin : CONFIG.nuitFin
    };
  }

  function open() {
    var g = get(), be = API.cfg() || {};
    var signs = Object.keys(Horoscope.SIGNES).map(function (k) {
      return '<label><input type="checkbox" value="' + k + '"' + (g.signes.indexOf(k) >= 0 ? " checked" : "") + "> " + Horoscope.SIGNES[k].n + "</label>";
    }).join("");
    var html = "<h2>Réglages</h2>" +
      "<h3>Moteur Google (agenda, horoscope, citation, Cozytouch)</h3>" +
      '<div class="field"><label>Adresse du moteur (URL Apps Script se terminant par /exec)</label><input type="url" id="s-url" value="' + U.esc(be.url || "") + '"></div>' +
      '<div class="field"><label>Code secret</label><input type="text" id="s-token" value="' + U.esc(be.token || "") + '" autocomplete="off"></div>' +
      '<p class="note" id="s-test"></p>' +
      "<h3>Horoscope</h3><div class=\"signs\" id=\"s-signs\">" + signs + "</div>" +
      "<h3>Lieu de la météo</h3>" +
      '<div class="row"><div class="field"><label>Ville</label><input type="text" id="s-ville" value="' + U.esc(g.ville) + '"></div>' +
      '<div class="field"><label>Latitude</label><input type="number" step="0.0001" id="s-lat" value="' + g.latitude + '"></div>' +
      '<div class="field"><label>Longitude</label><input type="number" step="0.0001" id="s-lon" value="' + g.longitude + '"></div></div>' +
      "<h3>Mode nuit (écran assombri)</h3>" +
      '<div class="row"><div class="field"><label>De (heure)</label><input type="number" min="0" max="23" id="s-n1" value="' + g.nuitDebut + '"></div>' +
      '<div class="field"><label>À (heure)</label><input type="number" min="0" max="23" id="s-n2" value="' + g.nuitFin + '"></div></div>' +
      '<div class="actions"><button class="btn-second" id="s-reload">Recharger</button><button class="btn-second" data-close>Annuler</button><button class="btn-primary" id="s-save">Enregistrer</button></div>';
    Modal.open(html);

    U.$("s-reload").onclick = function () {
      var bt = U.$("s-reload"); bt.textContent = "Rechargement…"; bt.disabled = true;
      setTimeout(function () { location.replace(location.pathname + "?r=" + Date.now()); }, 150);
    };
    U.$("s-save").onclick = function () {
      /* Nettoie les copier-coller : espaces, retours à la ligne, caractères invisibles */
      var clean = function (v) { return v.replace(/[\s​-‍﻿ ]+/g, ""); };
      var url = clean(U.$("s-url").value), token = clean(U.$("s-token").value);
      /* ID de déploiement collé seul (AKfy…) : on reconstruit l'adresse complète */
      if (/^AKfy[\w-]{20,}$/.test(url)) url = "https://script.google.com/macros/s/" + url + "/exec";
      U.$("s-url").value = url; U.$("s-token").value = token;
      var note0 = U.$("s-test");
      if (url && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
        note0.className = "note err";
        note0.textContent = "Adresse du moteur incorrecte : elle doit commencer par https://script.google.com/macros/s/ et finir par /exec" +
          (/\/exec./.test(url) ? " (il y a des caractères en trop après /exec)" : (url.indexOf("/exec") < 0 ? " (la fin /exec manque : copie incomplète ?)" : "")) + ".";
        return;
      }
      if (token && !/^[0-9a-f]{32}$/i.test(token)) {
        note0.className = "note err";
        note0.textContent = "Code secret incorrect : il doit faire 32 caractères (lettres a à f et chiffres). Le tien en fait " + token.length + ".";
        return;
      }
      var signes = [].slice.call(document.querySelectorAll("#s-signs input:checked")).map(function (i) { return i.value; });
      s = {
        ville: U.$("s-ville").value.trim(), latitude: +U.$("s-lat").value, longitude: +U.$("s-lon").value,
        signes: signes, nuitDebut: +U.$("s-n1").value, nuitFin: +U.$("s-n2").value
      };
      U.save(KEY, s);
      var note = U.$("s-test");
      if (url && token) {
        note.className = "note"; note.textContent = "Test de connexion…";
        API.get("ping", {}, { url: url, token: token }).then(function () {
          API.setCfg({ url: url, token: token });
          location.reload();
        }).catch(function (e) {
          var m = String(e.message || e), hint;
          if (/secret/i.test(m)) hint = "Le code ne correspond pas à celui du moteur (ligne TOKEN dans Apps Script).";
          else if (/fetch|network|réseau|Délai/i.test(m)) hint = "La tablette n'obtient pas de réponse du moteur. Si cela marche dans Chrome mais pas ici, c'est un réglage de l'application.";
          else hint = "Vérifie l'adresse et le code.";
          note.className = "note err";
          note.textContent = "Connexion impossible (" + m + "). " + hint + " Adresse testée : …" + url.slice(-18) + " · code : " + token.length + " caractères.";
        });
      } else {
        API.setCfg(null);
        location.reload();
      }
    };
  }

  return { get: get, open: open };
})();
