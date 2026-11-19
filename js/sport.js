/* Objectifs sportifs du jour : cases à cocher, suivi sur 7 jours, série en cours, citation du jour.
   Sauvegarde dans le moteur Google (si connecté) et toujours en copie locale. */
var Sport = (function () {
  var KEY = "dash.sport";
  var state = U.load(KEY, null) || { goals: CONFIG.objectifsSport.slice(), log: {} };

  var QUOTES = [
    ["Tomber sept fois, se relever huit.", "Proverbe japonais"],
    ["Petit à petit, l'oiseau fait son nid.", "Proverbe"],
    
    ["Le meilleur moment pour commencer, c'était hier. Le deuxième meilleur, c'est maintenant.", ""],
    ["Chaque pas compte, même les petits.", ""],
    ["La discipline, c'est choisir entre ce que tu veux maintenant et ce que tu veux le plus.", ""],
    ["Ton corps entend tout ce que ton esprit lui dit.", ""],
    ["Fais aujourd'hui ce que les autres ne feront pas, et demain tu feras ce qu'ils ne pourront pas.", ""],
    ["La régularité bat l'intensité.", ""],
    ["Une séance ratée n'efface pas une semaine réussie.", ""],
    ["On ne regrette jamais une séance terminée.", ""],
    ["Le plus dur, c'est de mettre ses chaussures.", ""],
    ["Avance lentement, mais n'arrête jamais.", ""],
    ["Bouger un peu chaque jour vaut mieux que beaucoup une fois par mois.", ""],
    ["L'énergie se crée en la dépensant.", ""],
    ["Pas d'excuse aujourd'hui, juste un petit effort.", ""],
    ["Le progrès, pas la perfection.", ""],
    ["Respire, bouge, recommence.", ""],
    ["Ce qui ne te challenge pas ne te change pas.", ""],
    ["Une heure d'effort, c'est 4 % de ta journée.", ""],
    ["Les résultats viennent à ceux qui reviennent.", ""]
  ];

  function today() { return U.ymd(new Date()); }
  function doneToday() { return state.log[today()] || []; }

  function persist() {
    var cutoff = U.ymd(U.addDays(new Date(), -120));
    Object.keys(state.log).forEach(function (k) { if (k < cutoff) delete state.log[k]; });
    U.save(KEY, state);
    if (API.isLive()) API.post("saveSport", state).then(function () { Status.set("sport", null); }, function (e) { Status.set("sport", e); });
  }

  function ratio(day) {
    var d = state.log[day] || [];
    var n = state.goals.filter(function (g) { return d.indexOf(g) >= 0; }).length;
    return state.goals.length ? n / state.goals.length : 0;
  }
  function streak() {
    var n = 0, d = new Date();
    if (ratio(U.ymd(d)) < 1) d = U.addDays(d, -1); /* la journée en cours ne casse pas la série */
    while (ratio(U.ymd(d)) >= 1 && n < 366) { n++; d = U.addDays(d, -1); }
    return n;
  }

  function render() {
    var done = doneToday();
    var html = '<div class="sp-goals">' + state.goals.map(function (g, i) {
      var ok = done.indexOf(g) >= 0;
      return '<button class="goal' + (ok ? " done" : "") + '" data-i="' + i + '"><span class="box">' + (ok ? "&#10003;" : "") +
        '</span><span class="lbl">' + U.esc(g) + "</span></button>";
    }).join("") + "</div>";

    var bars = "";
    for (var k = 6; k >= 0; k--) {
      var day = U.ymd(U.addDays(new Date(), -k));
      bars += '<span class="sp-bar' + (k === 0 ? " today" : "") + '" title="' + day + '"><i style="height:' + Math.round(ratio(day) * 100) + '%"></i></span>';
    }
    var start = new Date(new Date().getFullYear(), 0, 0);
    var q = QUOTES[Math.floor((new Date() - start) / 86400000) % QUOTES.length];
    html += '<div class="sp-foot"><div class="sp-week">' + bars + "</div>" +
      '<div class="sp-quote">« ' + U.esc(q[0]) + " »" + (q[1] ? " <small>" + U.esc(q[1]) + "</small>" : "") + "</div></div>";
    U.$("sp-body").innerHTML = html;

    var n = state.goals.filter(function (g) { return done.indexOf(g) >= 0; }).length;
    var s = streak();
    U.$("sp-score").textContent = n + "/" + state.goals.length + (s > 1 ? " · série " + s + " j" : "");
  }

  function toggle(i) {
    var g = state.goals[i], t = today();
    var d = (state.log[t] || []).slice();
    var at = d.indexOf(g);
    if (at >= 0) d.splice(at, 1); else d.push(g);
    state.log[t] = d;
    render(); persist();
  }

  function setGoals(goals) { state.goals = goals; render(); persist(); }
  function getGoals() { return state.goals.slice(); }

  function fetchRemote() {
    if (!API.isLive()) return;
    API.get("sport").then(function (remote) {
      if (remote && remote.goals) { state = remote; U.save(KEY, state); render(); }
      else persist(); /* première connexion : envoie les données locales */
    }).catch(function (e) { Status.set("sport", e); });
  }

  function start() {
    U.$("sp-body").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".goal") : null;
      if (b) toggle(+b.getAttribute("data-i"));
    });
    render();
    fetchRemote();
    var lastDay = today();
    setInterval(function () { if (today() !== lastDay) { lastDay = today(); render(); } }, 60000);
  }
  return { start: start, refresh: fetchRemote, setGoals: setGoals, getGoals: getGoals };
})();
