/* Agenda du jour, prochains rendez-vous, calendrier mensuel, ajout / modification / suppression.
   Source : Google Agenda via le moteur, ou agenda de démo local. */
var Agenda = (function () {
  var DEMO_KEY = "dash.demoEvents";
  var CACHE = "dash.events";
  var events = [];          /* événements normalisés */
  var month = new Date();   /* mois affiché */
  month = new Date(month.getFullYear(), month.getMonth(), 1);
  var lastFetch = 0;

  /* ---------- Normalisation ---------- */
  function norm(e) {
    var o = {
      id: e.id, title: e.title || "(sans titre)", location: e.location || "", allDay: !!e.allDay,
      birthday: !!e.birthday, editable: e.editable !== false, recurring: !!e.recurring, calendar: e.calendar || ""
    };
    if (o.allDay) { o.start = U.parseYmd(e.start); o.end = U.parseYmd(e.end || e.start); if (o.end <= o.start) o.end = U.addDays(o.start, 1); }
    else { o.start = new Date(e.start); o.end = new Date(e.end || e.start); }
    return o;
  }
  function onDay(d) {
    var a = U.startOfDay(d), b = U.addDays(a, 1);
    return events.filter(function (e) {
      return e.start < b && (e.end > a || (e.end.getTime() === e.start.getTime() && e.start >= a));
    }).sort(sorter);
  }
  function sorter(x, y) {
    if (x.allDay !== y.allDay) return x.allDay ? -1 : 1;
    return x.start - y.start;
  }

  /* ---------- Démo locale ---------- */
  function demoSeed() {
    var t = U.startOfDay(new Date()), list = [];
    function at(dayOff, h, m, dur, title, loc) {
      var s = U.addDays(t, dayOff); s.setHours(h, m);
      list.push({ id: "d" + list.length, title: title, location: loc, start: s.getTime(), end: s.getTime() + dur * 60000 });
    }
    at(0, 9, 0, 60, "Exemple : rendez-vous client", "Nantes");
    at(0, new Date().getHours() + 1, 0, 30, "Exemple : appel artisan", "");
    at(0, 18, 30, 60, "Exemple : sport", "Salle");
    at(1, 14, 0, 90, "Exemple : réunion", "Saint-Nazaire");
    at(3, 10, 0, 60, "Exemple : dentiste", "Blain");
    list.push({ id: "d9", title: "Anniversaire de Exemple", allDay: true, birthday: true,
      start: U.ymd(U.addDays(t, 2)), end: U.ymd(U.addDays(t, 3)) });
    U.save(DEMO_KEY, list);
    return list;
  }
  function demoList() { return U.load(DEMO_KEY, null) || demoSeed(); }

  /* ---------- Chargement ---------- */
  function range() {
    var today = U.startOfDay(new Date());
    var a = U.addDays(month < today ? month : today, -7);
    var endMonth = new Date(month.getFullYear(), month.getMonth() + 1, 7);
    var b = U.addDays(today, 60);
    if (endMonth > b) b = endMonth;
    return { start: U.ymd(a), end: U.ymd(b) };
  }
  function fetchEvents() {
    if (!API.isLive()) {
      events = demoList().map(norm);
      Status.set("agenda", null); render(); return Promise.resolve();
    }
    return API.get("events", range()).then(function (list) {
      events = list.map(norm);
      lastFetch = Date.now();
      U.save(CACHE, list);
      Status.set("agenda", null);
      render();
    }).catch(function (e) {
      if (!events.length) events = (U.load(CACHE, []) || []).map(norm);
      Status.set("agenda", e); render();
    });
  }

  /* ---------- Rendu ---------- */
  function evHtml(e, withDay) {
    var now = new Date(), cls = "ev";
    var when;
    if (e.allDay) when = "Journée";
    else when = U.hm(e.start) + "<small>" + U.hm(e.end) + "</small>";
    if (withDay) when = '<span style="font-size:.85rem">' + U.esc(U.dayLabel(e.start)) + "</span>" + (e.allDay ? "" : "<small>" + U.hm(e.start) + "</small>");
    if (e.birthday) cls += " bday";
    else if (!e.allDay && e.end <= now) cls += " past";
    else if (!e.allDay && e.start <= now && e.end > now) cls += " now";
    else if (!e.allDay && e.start > now && e.start - now <= 3600000) cls += " soon";
    return '<button class="' + cls + '" data-id="' + U.esc(e.id) + '">' +
      '<div class="when">' + when + "</div>" +
      '<div class="what"><div class="ttl">' + U.esc(e.title) + (e.birthday ? '<span class="badge">anniversaire</span>' : "") + "</div>" +
      (e.location ? '<div class="loc">' + U.esc(e.location) + "</div>" : "") + "</div></button>";
  }

  function renderAlert() {
    var now = new Date(), html = "";
    var next = events.filter(function (e) { return !e.allDay && e.end > now && e.start - now <= 3600000; }).sort(sorter)[0];
    if (next) {
      var mins = Math.round((next.start - now) / 60000);
      if (mins <= 0) html = '<div class="alert now">En cours<b>' + U.esc(next.title) + "</b></div>";
      else html = '<div class="alert">Dans ' + mins + " min<b>" + U.esc(next.title) + "</b></div>";
    }
    U.$("ag-alert").innerHTML = html;
  }

  function render() {
    var today = new Date();
    var html = '<div class="ag-section">Aujourd\'hui' + (API.isLive() ? "" : '<span class="demo-tag">démo</span>') + "</div>";
    var td = onDay(today);
    html += td.length ? td.map(function (e) { return evHtml(e, false); }).join("") : '<div class="empty">Rien de prévu aujourd\'hui</div>';

    var tomorrow = U.addDays(U.startOfDay(today), 1);
    var up = events.filter(function (e) { return e.start >= tomorrow; }).sort(function (a, b) { return a.start - b.start; }).slice(0, 8);
    html += '<div class="ag-section">À venir</div>';
    html += up.length ? up.map(function (e) { return evHtml(e, true); }).join("") : '<div class="empty">Aucun rendez-vous à venir</div>';
    U.$("ag-body").innerHTML = html;
    U.$("ag-upd").textContent = lastFetch ? "maj " + U.hm(new Date(lastFetch)) : "";
    renderAlert();
    renderCal();
  }

  function renderCal() {
    U.$("cal-title").textContent = U.MOIS[month.getMonth()] + " " + month.getFullYear();
    var html = "";
    ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].forEach(function (d) { html += '<div class="cal-dow">' + d + "</div>"; });
    var first = (month.getDay() + 6) % 7; /* lundi = 0 */
    var start = U.addDays(month, -first);
    var today = new Date();
    for (var i = 0; i < 42; i++) {
      var d = U.addDays(start, i);
      if (i === 35 && d.getMonth() !== month.getMonth()) break; /* évite une 6e ligne vide */
      var cls = "cal-day";
      if (d.getMonth() !== month.getMonth()) cls += " out";
      if (d.getDay() === 0 || d.getDay() === 6) cls += " we";
      if (U.sameDay(d, today)) cls += " today";
      var evs = onDay(d), dots = "";
      for (var k = 0; k < Math.min(3, evs.length); k++) dots += '<i class="dot' + (evs[k].birthday ? " bd" : "") + '"></i>';
      html += '<button class="' + cls + '" data-day="' + U.ymd(d) + '">' + d.getDate() + (dots ? '<span class="dots">' + dots + "</span>" : "") + "</button>";
    }
    U.$("cal-grid").innerHTML = html;
  }

  /* ---------- Fenêtres ---------- */
  function find(id) { for (var i = 0; i < events.length; i++) if (String(events[i].id) === String(id)) return events[i]; return null; }

  function openDay(ymd) {
    var d = U.parseYmd(ymd), evs = onDay(d);
    var html = "<h2>" + U.esc(U.JOURS[d.getDay()] + " " + d.getDate() + " " + U.MOIS[d.getMonth()]) + "</h2>" +
      '<div class="daylist">' + (evs.length ? evs.map(function (e) { return evHtml(e, false); }).join("") : '<div class="empty">Aucun événement</div>') + "</div>" +
      '<div class="actions"><button class="btn-second" data-close>Fermer</button><button class="btn-primary" id="day-add">Ajouter</button></div>';
    Modal.open(html);
    U.$("day-add").onclick = function () { openForm(null, ymd); };
    bindEvClicks(U.$("modal-box"));
  }

  function openForm(e, ymd) {
    var isNew = !e;
    if (e && !e.editable) {
      Modal.open("<h2>" + U.esc(e.title) + '</h2><p class="note">' +
        (e.birthday ? "Les anniversaires viennent de tes contacts Google : modifie-les dans Google Contacts."
          : e.recurring ? "Événement récurrent : modifie-le dans Google Agenda pour ne pas casser la série."
          : "Cet agenda est en lecture seule.") +
        '</p><div class="actions"><button class="btn-second" data-close>Fermer</button></div>');
      return;
    }
    var now = new Date();
    var date = e ? U.ymd(e.start) : (ymd || U.ymd(now));
    var sH = e && !e.allDay ? U.hm(e.start) : U.pad(Math.min(now.getHours() + 1, 23)) + ":00";
    var eH = e && !e.allDay ? U.hm(e.end) : U.pad(Math.min(now.getHours() + 2, 23)) + ":00";
    var html = "<h2>" + (isNew ? "Nouvel événement" : "Modifier l'événement") + "</h2>" +
      '<div class="field"><label>Titre</label><input type="text" id="f-title" value="' + U.esc(e ? e.title : "") + '"></div>' +
      '<div class="field"><label>Date</label><input type="date" id="f-date" value="' + date + '"></div>' +
      '<label class="check"><input type="checkbox" id="f-allday"' + (e && e.allDay ? " checked" : "") + "> Journée entière</label>" +
      '<div class="row" id="f-times"><div class="field"><label>Début</label><input type="time" id="f-start" value="' + sH + '"></div>' +
      '<div class="field"><label>Fin</label><input type="time" id="f-end" value="' + eH + '"></div></div>' +
      '<div class="field"><label>Lieu</label><input type="text" id="f-loc" value="' + U.esc(e ? e.location : "") + '"></div>' +
      '<p class="note" id="f-msg"></p>' +
      '<div class="actions">' + (isNew ? "" : '<button class="btn-danger" id="f-del">Supprimer</button>') +
      '<button class="btn-second" data-close>Annuler</button><button class="btn-primary" id="f-save">Enregistrer</button></div>';
    Modal.open(html);
    var allDay = U.$("f-allday"), times = U.$("f-times");
    function sync() { times.style.display = allDay.checked ? "none" : ""; }
    allDay.onchange = sync; sync();
    if (isNew) U.$("f-title").focus();

    U.$("f-save").onclick = function () {
      var d = {
        id: e ? e.id : null, title: U.$("f-title").value.trim(), date: U.$("f-date").value,
        allDay: allDay.checked, start: U.$("f-start").value, end: U.$("f-end").value, location: U.$("f-loc").value.trim()
      };
      if (!d.title || !d.date) return msg("Titre et date obligatoires.");
      if (!d.allDay && d.end <= d.start) return msg("L'heure de fin doit être après le début.");
      busy(true);
      save(isNew ? "createEvent" : "updateEvent", d).then(done, fail);
    };
    if (!isNew) U.$("f-del").onclick = function () {
      if (!confirm("Supprimer « " + e.title + " » ?")) return;
      busy(true);
      save("deleteEvent", { id: e.id }).then(done, fail);
    };
    function msg(t, cls) { var m = U.$("f-msg"); m.textContent = t; m.className = "note " + (cls || "err"); }
    function busy(b) { U.$("f-save").disabled = b; msg(b ? "Enregistrement…" : "", "ok"); }
    function done() { Modal.close(); fetchEvents(); }
    function fail(err) { busy(false); msg("Échec : " + (err.message || err)); }
  }

  /* Enregistre côté Google, ou dans la démo locale */
  function save(action, d) {
    if (API.isLive()) return API.post(action, d);
    var list = demoList();
    if (action === "deleteEvent") list = list.filter(function (x) { return x.id !== d.id; });
    else {
      var item = { id: d.id || "d" + Date.now(), title: d.title, location: d.location, allDay: d.allDay };
      if (d.allDay) { item.start = d.date; item.end = U.ymd(U.addDays(U.parseYmd(d.date), 1)); }
      else {
        var p = d.date.split("-"), s = d.start.split(":"), en = d.end.split(":");
        item.start = new Date(+p[0], +p[1] - 1, +p[2], +s[0], +s[1]).getTime();
        item.end = new Date(+p[0], +p[1] - 1, +p[2], +en[0], +en[1]).getTime();
      }
      list = list.filter(function (x) { return x.id !== item.id; }); list.push(item);
    }
    U.save(DEMO_KEY, list);
    return Promise.resolve();
  }

  function bindEvClicks(root) {
    root.addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest(".ev") : null;
      if (b) openForm(find(b.getAttribute("data-id")));
    });
  }

  function start() {
    bindEvClicks(U.$("ag-body"));
    U.$("ag-alert").onclick = function () { };
    U.$("ag-add").onclick = function () { openForm(null); };
    U.$("cal-grid").addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest(".cal-day") : null;
      if (b) openDay(b.getAttribute("data-day"));
    });
    U.$("cal-prev").onclick = function () { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); renderCal(); fetchEvents(); };
    U.$("cal-next").onclick = function () { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); renderCal(); fetchEvents(); };
    var cached = U.load(CACHE, null);
    if (cached && API.isLive()) { events = cached.map(norm); render(); }
    U.every(CONFIG.rafraichir.agenda, fetchEvents);
    setInterval(render, 60000); /* met à jour « dans X min », en cours, passé */
  }
  return { start: start, refresh: fetchEvents };
})();

/* Fenêtre modale partagée */
var Modal = (function () {
  function open(html) {
    U.$("modal-box").innerHTML = html;
    U.$("modal").hidden = false;
  }
  function close() { U.$("modal").hidden = true; U.$("modal-box").innerHTML = ""; }
  document.addEventListener("click", function (e) {
    if (e.target.id === "modal" || (e.target.hasAttribute && e.target.hasAttribute("data-close"))) close();
  });
  return { open: open, close: close };
})();
