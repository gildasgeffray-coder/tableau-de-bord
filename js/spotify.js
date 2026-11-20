/* Spotify : lecture en cours et télécommande (via le moteur Google).
   La musique sort de l'appareil où Spotify joue (tablette, téléphone, enceinte...). */
var Spotify = (function () {
  var st = null;          /* dernier état reçu */
  var timer = null, tick = null;
  var busy = false;

  var ICON = {
    prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/></svg>',
    minus: '<svg viewBox="0 0 24 24"><path d="M5 11h14v2H5z" fill="currentColor"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M9 17.5a2.5 2.5 0 1 1-2-2.45V5l11-2v11.5a2.5 2.5 0 1 1-2-2.45V6.4l-7 1.3z" fill="currentColor"/></svg>'
  };

  function mmss(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ":" + U.pad(s % 60); }
  function pos() {
    if (!st || !st.active) return 0;
    var p = st.progress + (st.playing ? Date.now() - st.at : 0);
    return Math.min(p, st.duration);
  }

  function render() {
    var el = U.$("sp-body");
    if (!API.isLive()) {
      el.innerHTML = '<div class="sp-idle">' + ICON.note + '<div>La musique en cours s\'affichera ici une fois Spotify relié.<span class="demo-tag">démo</span></div></div>';
      return;
    }
    if (!st) { el.innerHTML = '<div class="loading">Chargement…</div>'; return; }
    if (!st.linked) {
      el.innerHTML = '<div class="sp-idle">' + ICON.note + '<div>Spotify n\'est pas encore relié.<br><small>Voir le guide d\'installation, partie Spotify.</small></div></div>';
      return;
    }
    if (!st.active) {
      var devs = (st.devices || []).map(function (d) {
        return '<button class="sp-dev" data-dev="' + U.esc(d.id) + '">' + ICON.play + U.esc(d.name) + "</button>";
      }).join("");
      el.innerHTML = '<div class="sp-idle">' + ICON.note + "<div>Rien en lecture." +
        (devs ? "<br><small>Lancer sur :</small>" : "<br><small>Ouvre Spotify sur un appareil pour le piloter d'ici.</small>") + "</div></div>" +
        (devs ? '<div class="sp-devs">' + devs + "</div>" : "");
      return;
    }
    var vol = st.device && st.device.volume != null ? st.device.volume : null;
    el.innerHTML =
      '<div class="sp-now">' +
        (st.image ? '<img class="sp-cover" src="' + U.esc(st.image) + '" alt="">' : '<div class="sp-cover sp-nocover">' + ICON.note + "</div>") +
        '<div class="sp-info"><div class="sp-title">' + U.esc(st.title) + "</div>" +
        '<div class="sp-artist">' + U.esc(st.artist) + "</div>" +
        '<div class="sp-device">' + (st.device ? "sur " + U.esc(st.device.name) : "") + (vol != null ? " · volume " + vol + " %" : "") + "</div></div>" +
      "</div>" +
      '<div class="sp-bar"><span id="sp-pos">' + mmss(pos()) + '</span><div class="sp-track"><i id="sp-fill" style="width:' + (st.duration ? pos() / st.duration * 100 : 0) + '%"></i></div><span>' + mmss(st.duration) + "</span></div>" +
      '<div class="sp-ctrl">' +
        '<button data-cmd="volDown" aria-label="Volume moins">' + ICON.minus + "</button>" +
        '<button data-cmd="previous" aria-label="Précédent">' + ICON.prev + "</button>" +
        '<button class="sp-main" data-cmd="' + (st.playing ? "pause" : "play") + '" aria-label="Lecture ou pause">' + (st.playing ? ICON.pause : ICON.play) + "</button>" +
        '<button data-cmd="next" aria-label="Suivant">' + ICON.next + "</button>" +
        '<button data-cmd="volUp" aria-label="Volume plus">' + ICON.plus + "</button>" +
      "</div>";
  }

  /* Met à jour la barre de progression chaque seconde sans redessiner tout le bloc */
  function progress() {
    if (!st || !st.active) return;
    var p = U.$("sp-pos"), f = U.$("sp-fill");
    if (!p || !f) return;
    p.textContent = mmss(pos());
    f.style.width = (st.duration ? pos() / st.duration * 100 : 0) + "%";
    if (st.playing && st.duration && pos() >= st.duration) schedule(1500); /* fin du morceau : on recharge l'état */
  }

  function fetchState() {
    if (!API.isLive()) { render(); return; }
    API.get("spotifyState").then(function (d) {
      st = d; Status.set("spotify", null); render();
      schedule(d && d.active && d.playing ? 15000 : 60000);
    }).catch(function (e) {
      Status.set("spotify", e); render(); schedule(60000);
    });
  }
  function schedule(ms) { if (timer) clearTimeout(timer); timer = setTimeout(fetchState, ms); }

  function send(cmd, extra) {
    if (busy) return;
    busy = true;
    var data = { cmd: cmd };
    for (var k in (extra || {})) data[k] = extra[k];
    API.post("spotifyControl", data).then(function () {
      Status.set("spotify", null);
    }).catch(function (e) {
      Status.set("spotify", e);
      alert("Spotify : " + (e.message || e));
    }).then(function () {
      busy = false;
      schedule(900);
    });
  }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest("button") : null;
    if (!b || !st) return;
    var dev = b.getAttribute("data-dev");
    if (dev) { send("transfer", { deviceId: dev }); return; }
    var cmd = b.getAttribute("data-cmd");
    if (!cmd) return;
    if (cmd === "pause" || cmd === "play") {
      /* réaction immédiate à l'écran, confirmée ensuite par Spotify */
      st.progress = pos(); st.at = Date.now(); st.playing = cmd === "play"; render();
      send(cmd);
    } else if (cmd === "volUp" || cmd === "volDown") {
      var v = st.device && st.device.volume != null ? st.device.volume : 50;
      v = Math.max(0, Math.min(100, v + (cmd === "volUp" ? 10 : -10)));
      if (st.device) st.device.volume = v;
      render();
      send("volume", { value: v });
    } else send(cmd);
  }

  function start() {
    U.$("sp-body").addEventListener("click", onClick);
    render();
    fetchState();
    tick = setInterval(progress, 1000);
  }
  return { start: start, refresh: fetchState };
})();
