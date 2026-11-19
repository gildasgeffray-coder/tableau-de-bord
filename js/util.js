/* Petites fonctions utilitaires partagées */
var U = (function () {
  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var JOURS_C = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var MOIS_C = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hm(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()); }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  function dayLabel(d) {
    var today = startOfDay(new Date());
    var diff = Math.round((startOfDay(d) - today) / 86400000);
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return "demain";
    if (diff === 2) return "après-demain";
    return JOURS_C[d.getDay()] + " " + d.getDate() + " " + MOIS_C[d.getMonth()];
  }
  function load(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* stockage indisponible */ }
  }
  function every(minutes, fn) { fn(); return setInterval(fn, minutes * 60000); }
  function stripHtml(s) {
    var d = document.createElement("div"); d.innerHTML = s || ""; return (d.textContent || "").replace(/\s+/g, " ").trim();
  }

  return {
    JOURS: JOURS, JOURS_C: JOURS_C, MOIS: MOIS, MOIS_C: MOIS_C,
    pad: pad, esc: esc, $: $, ymd: ymd, parseYmd: parseYmd, hm: hm, startOfDay: startOfDay,
    addDays: addDays, sameDay: sameDay, isoWeek: isoWeek, dayLabel: dayLabel,
    load: load, save: save, every: every, stripHtml: stripHtml
  };
})();
