var Clock = (function () {
  var lastDay = -1;
  function tick() {
    var d = new Date();
    U.$("clk-h").textContent = U.pad(d.getHours());
    U.$("clk-m").textContent = U.pad(d.getMinutes());
    U.$("clk-s").textContent = U.pad(d.getSeconds());
    if (d.getDate() !== lastDay) {
      lastDay = d.getDate();
      U.$("clk-day").textContent = U.JOURS[d.getDay()];
      U.$("clk-date").innerHTML = d.getDate() + " " + U.MOIS[d.getMonth()] + " " + d.getFullYear() +
        "<small>semaine " + U.isoWeek(d) + "</small>";
    }
  }
  function start() { tick(); setInterval(tick, 1000); }
  return { start: start };
})();
