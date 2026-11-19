/* Météo Open-Meteo (gratuit, sans clé) + température intérieure (Cozytouch via le moteur) */
var Weather = (function () {
  var CACHE = "dash.weather";
  var CACHE_IN = "dash.indoor";

  var LABELS = {
    0: "Ciel dégagé", 1: "Peu nuageux", 2: "Partiellement nuageux", 3: "Couvert",
    45: "Brouillard", 48: "Brouillard givrant",
    51: "Bruine légère", 53: "Bruine", 55: "Bruine forte", 56: "Bruine verglaçante", 57: "Bruine verglaçante",
    61: "Pluie faible", 63: "Pluie modérée", 65: "Pluie forte", 66: "Pluie verglaçante", 67: "Pluie verglaçante",
    71: "Neige faible", 73: "Neige modérée", 75: "Neige forte", 77: "Grains de neige",
    80: "Averses faibles", 81: "Averses", 82: "Fortes averses", 85: "Averses de neige", 86: "Fortes averses de neige",
    95: "Orage", 96: "Orage avec grêle", 99: "Orage avec grêle"
  };

  function kind(code) {
    if (code <= 1) return "clear";
    if (code === 2) return "partly";
    if (code === 3) return "cloud";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 57) return "drizzle";
    if (code >= 71 && code <= 77 || code === 85 || code === 86) return "snow";
    if (code >= 95) return "storm";
    return "rain";
  }

  var CLOUD = '<path d="M19 50h27a10 10 0 0 0 1.5-19.9A14 14 0 0 0 20.3 27 11.5 11.5 0 0 0 19 50z" fill="#a9bde6"/>';
  var CLOUD_DARK = '<path d="M19 50h27a10 10 0 0 0 1.5-19.9A14 14 0 0 0 20.3 27 11.5 11.5 0 0 0 19 50z" fill="#7186b4"/>';
  function sun(cx, cy, r) {
    var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#ffd166"/>';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, r1 = r + 4, r2 = r + 9;
      s += '<line x1="' + (cx + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (cy + r1 * Math.sin(a)).toFixed(1) +
        '" x2="' + (cx + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (cy + r2 * Math.sin(a)).toFixed(1) +
        '" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>';
    }
    return s;
  }
  function moon(dx, dy, sc) {
    return '<path transform="translate(' + dx + ' ' + dy + ') scale(' + sc + ')" d="M40 12a20 20 0 1 0 12 34A17 17 0 1 1 40 12z" fill="#cfe0ff"/>';
  }
  function icon(code, isDay) {
    var k = kind(code), s = "";
    if (k === "clear") s = isDay ? sun(32, 32, 12) : moon(-4, 0, 1);
    else if (k === "partly") s = (isDay ? sun(24, 22, 9) : moon(-6, -6, 0.75)) + CLOUD;
    else if (k === "cloud") s = '<g transform="translate(8 -8) scale(.8)">' + CLOUD_DARK + "</g>" + CLOUD;
    else if (k === "fog") s = CLOUD.replace("#a9bde6", "#7186b4") + '<g stroke="#a9bde6" stroke-width="3" stroke-linecap="round"><line x1="14" y1="55" x2="50" y2="55"/><line x1="20" y1="61" x2="44" y2="61"/></g>';
    else if (k === "drizzle") s = CLOUD + '<g fill="#4aa8ff"><circle cx="24" cy="57" r="2"/><circle cx="34" cy="60" r="2"/><circle cx="44" cy="57" r="2"/></g>';
    else if (k === "rain") s = CLOUD + '<g stroke="#4aa8ff" stroke-width="3" stroke-linecap="round"><line x1="24" y1="54" x2="21" y2="62"/><line x1="34" y1="54" x2="31" y2="62"/><line x1="44" y1="54" x2="41" y2="62"/></g>';
    else if (k === "snow") s = CLOUD + '<g fill="#ffffff"><circle cx="24" cy="57" r="2.6"/><circle cx="34" cy="61" r="2.6"/><circle cx="44" cy="57" r="2.6"/></g>';
    else if (k === "storm") s = CLOUD_DARK + '<path d="M34 46l-7 10h6l-4 9 11-13h-6l4-6z" fill="#ffc04d"/>';
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' + s + "</svg>";
  }
  var HOUSE = '<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M10 30L32 12l22 18"/><path d="M16 26v26h32V26"/><path d="M32 33v10"/><circle cx="32" cy="46" r="3.5" fill="currentColor"/></svg>';

  function windDir(deg) {
    var d = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    return d[Math.round(((deg % 360) / 45)) % 8];
  }
  function r(v) { return Math.round(v); }
  function mm(v) { return v >= 1 ? Math.round(v) + " mm" : (v > 0 ? r1(v) + " mm" : "0 mm"); }
  function r1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); }

  var data = U.load(CACHE, null);
  var indoor = U.load(CACHE_IN, null);

  function render() {
    var body = U.$("wx-body");
    U.$("wx-place").textContent = (Settings.get().ville || CONFIG.ville);
    if (!data) { body.innerHTML = '<div class="loading">Chargement…</div>'; return; }
    var c = data.current, dl = data.daily;

    var html = '<div class="wx-now">' +
      '<div class="wx-temp">' + icon(c.weather_code, c.is_day) +
        '<div><div class="wx-label">Extérieur</div>' +
        '<div class="wx-deg">' + r(c.temperature_2m) + "<sup>°C</sup></div>" +
        '<div class="wx-sub">' + U.esc(LABELS[c.weather_code] || "") + " · ressenti <b>" + r(c.apparent_temperature) + "°</b></div></div></div>" +
      '<div class="wx-temp">' + indoorHtml() + "</div>" +
      "</div>";

    html += '<div class="wx-facts">' +
      "<span>Min / max <b>" + r(dl.temperature_2m_min[0]) + "° / " + r(dl.temperature_2m_max[0]) + "°</b></span>" +
      "<span>Vent <b>" + r(c.wind_speed_10m) + " km/h " + windDir(c.wind_direction_10m) + "</b></span>" +
      "<span>Rafales <b>" + r(c.wind_gusts_10m) + " km/h</b></span>" +
      "<span>Pluie <b>" + (dl.precipitation_probability_max[0] == null ? "–" : dl.precipitation_probability_max[0] + " %") + " · " + mm(dl.precipitation_sum[0]) + "</b></span>" +
      "<span>Humidité <b>" + r(c.relative_humidity_2m) + " %</b></span>" +
      "</div>";

    html += '<div class="wx-days">';
    for (var i = 1; i < Math.min(6, dl.time.length); i++) {
      var d = U.parseYmd(dl.time[i]);
      var p = dl.precipitation_probability_max[i];
      html += '<div class="wx-day"><div class="d">' + (i === 1 ? "demain" : U.JOURS_C[d.getDay()] + " " + d.getDate()) + "</div>" +
        icon(dl.weather_code[i], 1) +
        '<div class="t">' + r(dl.temperature_2m_max[i]) + '°<span class="min">' + r(dl.temperature_2m_min[i]) + "°</span></div>" +
        '<div class="r rain">' + (p == null ? "" : p + " % · ") + mm(dl.precipitation_sum[i]) + "</div>" +
        '<div class="r">' + r(dl.wind_speed_10m_max[i]) + " km/h</div></div>";
    }
    html += "</div>";
    body.innerHTML = html;
    U.$("wx-upd").textContent = "maj " + U.hm(new Date(data.fetchedAt));
  }

  function indoorHtml() {
    var head = '<span class="wx-in-icon">' + HOUSE + '</span><div><div class="wx-label">Intérieur</div>';
    if (!indoor || indoor.temp == null) {
      var msg = !API.isLive() ? "Démo" : (indoor && indoor.error ? indoor.error : "Cozytouch non relié");
      return head + '<div class="wx-deg">–</div><div class="wx-sub" title="' + U.esc(msg) + '">' + U.esc(msg) + "</div></div>";
    }
    var sub;
    if (indoor.demo) sub = "exemple";
    else if (indoor.count > 1) sub = "moyenne maison</div><div class=\"wx-sub\"><b>" + r1(indoor.min) + "°</b> à <b>" + r1(indoor.max) + "°</b>";
    else sub = U.esc(indoor.rooms && indoor.rooms[0] ? indoor.rooms[0].name : "Cozytouch");
    var stale = indoor.at && (Date.now() - indoor.at > 3 * 3600000);
    return head + '<div class="wx-deg">' + r1(indoor.temp) + "<sup>°C</sup></div>" +
      '<div class="wx-sub">' + (stale ? "<b>ancienne mesure</b>" : sub) + "</div></div>";
  }

  function fetchWeather() {
    var s = Settings.get();
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + s.latitude + "&longitude=" + s.longitude +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max" +
      "&timezone=Europe%2FParis&forecast_days=6";
    return fetch(url).then(function (res) { return res.json(); }).then(function (j) {
      if (!j.current || !j.daily) throw new Error(j.reason || "Réponse météo invalide");
      j.fetchedAt = Date.now();
      data = j; U.save(CACHE, j);
      Status.set("météo", null);
      render();
    }).catch(function (e) { Status.set("météo", e); render(); });
  }

  function fetchIndoor() {
    if (!API.isLive()) {
      indoor = { temp: 20.5, target: 20, demo: true };
      render(); return;
    }
    API.get("indoor").then(function (d) {
      if (d && d.temp != null) { indoor = d; U.save(CACHE_IN, indoor); }
      else if (!indoor || indoor.temp == null) indoor = d; /* sinon on garde la dernière mesure, marquée ancienne */
      Status.set("intérieur", null);
      render();
    }).catch(function (e) { Status.set("intérieur", e); render(); });
  }

  function start() {
    render();
    U.every(CONFIG.rafraichir.meteo, fetchWeather);
    U.every(CONFIG.rafraichir.interieur, fetchIndoor);
  }
  return { start: start, refresh: function () { fetchWeather(); fetchIndoor(); } };
})();
