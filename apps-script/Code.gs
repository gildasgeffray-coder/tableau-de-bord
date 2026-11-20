/**
 * MOTEUR DU TABLEAU DE BORD (Google Apps Script)
 * Agenda Google, horoscope du jour, température intérieure Cozytouch.
 *
 * Installation : voir apps-script/INSTALLATION.md
 * Réglages (Paramètres du projet > Propriétés du script) :
 *   TOKEN               créé automatiquement par la fonction setup()
 *   COZYTOUCH_USER      e-mail du compte Cozytouch
 *   COZYTOUCH_PASSWORD  mot de passe Cozytouch
 *   CALENDARS           (facultatif) identifiants d'agendas séparés par des virgules
 *   SPOTIFY_CLIENT_ID   identifiant de l'application Spotify (developer.spotify.com)
 *   SPOTIFY_CLIENT_SECRET  secret de l'application Spotify
 */

var TZ = 'Europe/Paris';

/* ======================= Point d'entrée ======================= */

function doGet(e) {
  var p = e && e.parameter ? e.parameter : {};
  /* Pages HTML pour relier Spotify (ouvertes dans un navigateur, pas par la tablette) */
  if (p.action === 'spotifyLogin' || (p.code && p.state) || (p.error && p.state)) return spotifyPages_(p);
  return handle_(p);
}

function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { /* corps illisible */ }
  return handle_(p);
}

function handle_(p) {
  try {
    checkToken_(p.token);
    var out;
    switch (p.action) {
      case 'ping': out = { ok: true }; break;
      case 'events': out = getEvents_(p.start, p.end); break;
      case 'createEvent': out = createEvent_(p.data); break;
      case 'updateEvent': out = updateEvent_(p.data); break;
      case 'deleteEvent': out = deleteEvent_(p.data); break;
      case 'horoscope': out = getHoroscope_(String(p.signs || '').split(',')); break;
      case 'indoor': out = getIndoor_(); break;
      case 'quote': out = getQuote_(); break;
      case 'spotifyState': out = spotifyState_(); break;
      case 'spotifyControl': out = spotifyControl_(p.data || {}); break;
      default: throw new Error('Action inconnue : ' + p.action);
    }
    return json_({ ok: true, data: out });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function checkToken_(t) {
  var tok = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!tok) throw new Error('Moteur non initialisé : lance la fonction setup()');
  if (t !== tok) throw new Error('Code secret incorrect');
}

/* ======================= Installation ======================= */

/** À lancer une fois depuis l'éditeur : crée le code secret et demande les autorisations. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var tok = props.getProperty('TOKEN');
  if (!tok) {
    tok = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('TOKEN', tok);
  }
  Logger.log('CODE SECRET à copier dans la tablette : ' + tok);
  Logger.log('(Il est aussi visible dans Paramètres du projet > Propriétés du script > TOKEN)');
  var cals = CalendarApp.getAllCalendars().map(function (c) { return '  ' + c.getName() + '  →  ' + c.getId(); });
  Logger.log('Agendas trouvés :\n' + cals.join('\n'));
}

/** À lancer depuis l'éditeur pour vérifier la connexion Cozytouch. */
function testCozytouch() {
  CacheService.getScriptCache().remove('cozy_session');
  CacheService.getScriptCache().remove('cozy_indoor');
  var r = getIndoor_();
  Logger.log(JSON.stringify(r, null, 2));
}

/** À lancer depuis l'éditeur pour vérifier la citation du jour. */
function testCitation() {
  CacheService.getScriptCache().remove('quote_' + ymd_(new Date()));
  Logger.log(JSON.stringify(getQuote_(), null, 2));
}

/** À lancer depuis l'éditeur pour vérifier l'horoscope. */
function testHoroscope() {
  CacheService.getScriptCache().removeAll(['lion', 'sagittaire', 'vierge'].map(function (s) { return 'horo2_' + ymd_(new Date()) + '_' + s; }));
  Logger.log(JSON.stringify(getHoroscope_(['lion', 'sagittaire', 'vierge']), null, 2));
}

/* ======================= Agenda ======================= */

function calendars_() {
  var ids = PropertiesService.getScriptProperties().getProperty('CALENDARS');
  if (ids) {
    return ids.split(',').map(function (id) { return CalendarApp.getCalendarById(id.trim()); }).filter(Boolean);
  }
  return CalendarApp.getAllCalendars().filter(function (c) { return !c.isHidden(); });
}

function isBirthday_(ev, cal) {
  try {
    if (ev.getEventType && ev.getEventType() === CalendarApp.EventType.BIRTHDAY) return true;
  } catch (e) { /* type d'événement non disponible */ }
  return /anniv|birthday/i.test(cal.getName()) || /^anniversaire/i.test(ev.getTitle());
}

function ymd_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }

function getEvents_(start, end) {
  var a = Utilities.parseDate(start, TZ, 'yyyy-MM-dd');
  var b = Utilities.parseDate(end, TZ, 'yyyy-MM-dd');
  var out = [], seen = {};
  calendars_().forEach(function (cal) {
    var owned = false;
    try { owned = cal.isOwnedByMe(); } catch (e) { }
    cal.getEvents(a, b).forEach(function (ev) {
      var allDay = ev.isAllDayEvent();
      var key = ev.getId() + '|' + (allDay ? ymd_(ev.getAllDayStartDate()) : ev.getStartTime().getTime());
      if (seen[key]) return;
      seen[key] = true;
      var recurring = ev.isRecurringEvent();
      var bday = isBirthday_(ev, cal);
      out.push({
        id: ev.getId() + '::' + cal.getId(),
        title: ev.getTitle(),
        location: ev.getLocation(),
        allDay: allDay,
        start: allDay ? ymd_(ev.getAllDayStartDate()) : ev.getStartTime().getTime(),
        end: allDay ? ymd_(ev.getAllDayEndDate()) : ev.getEndTime().getTime(),
        calendar: cal.getName(),
        birthday: bday,
        recurring: recurring,
        editable: owned && !recurring && !bday
      });
    });
  });
  return out;
}

function findEvent_(fullId) {
  var parts = String(fullId).split('::');
  var cal = parts[1] ? CalendarApp.getCalendarById(parts[1]) : CalendarApp.getDefaultCalendar();
  if (!cal) throw new Error('Agenda introuvable');
  var ev = cal.getEventById(parts[0]);
  if (!ev) throw new Error('Événement introuvable');
  return ev;
}

function dates_(d) {
  if (d.allDay) return { day: Utilities.parseDate(d.date, TZ, 'yyyy-MM-dd') };
  return {
    start: Utilities.parseDate(d.date + ' ' + d.start, TZ, 'yyyy-MM-dd HH:mm'),
    end: Utilities.parseDate(d.date + ' ' + d.end, TZ, 'yyyy-MM-dd HH:mm')
  };
}

function createEvent_(d) {
  if (!d || !d.title || !d.date) throw new Error('Titre et date obligatoires');
  var cal = CalendarApp.getDefaultCalendar(), t = dates_(d), opts = { location: d.location || '' };
  var ev = d.allDay ? cal.createAllDayEvent(d.title, t.day, opts) : cal.createEvent(d.title, t.start, t.end, opts);
  return { id: ev.getId() };
}

function updateEvent_(d) {
  var ev = findEvent_(d.id), t = dates_(d);
  if (ev.isRecurringEvent()) throw new Error('Événement récurrent : modifie-le dans Google Agenda');
  ev.setTitle(d.title);
  ev.setLocation(d.location || '');
  if (d.allDay) ev.setAllDayDate(t.day); else ev.setTime(t.start, t.end);
  return { id: ev.getId() };
}

function deleteEvent_(d) {
  var ev = findEvent_(d.id);
  if (ev.isRecurringEvent()) throw new Error('Événement récurrent : supprime-le dans Google Agenda');
  ev.deleteEvent();
  return { deleted: true };
}

/* ======================= Horoscope ======================= */
/* Source : mon-horoscope-du-jour.com.
   Texte complet lu sur la page du jour de chaque signe ; si la page change de forme,
   on se rabat sur le flux RSS (extrait plus court). */

var HORO_SITE = 'https://www.mon-horoscope-du-jour.com';

function getHoroscope_(signs) {
  var cache = CacheService.getScriptCache();
  var today = ymd_(new Date());
  var result = { date: today, source: 'mon-horoscope-du-jour.com', signs: {} };
  var todo = [];
  signs.forEach(function (s) {
    s = String(s).trim().toLowerCase();
    if (!/^[a-z]+$/.test(s)) return;
    var hit = cache.get('horo2_' + today + '_' + s);
    if (hit) result.signs[s] = JSON.parse(hit); else todo.push(s);
  });
  if (!todo.length) return result;

  var pages = UrlFetchApp.fetchAll(todo.map(function (s) {
    return { url: HORO_SITE + '/horoscopes/quotidien/' + s + '.htm', muteHttpExceptions: true };
  }));
  var missing = [];
  todo.forEach(function (s, i) {
    var text = pages[i].getResponseCode() === 200 ? pageText_(pages[i].getContentText('UTF-8')) : '';
    if (text) store_(s, { date: Date.now(), text: text }); else missing.push(s);
  });

  if (missing.length) {
    var feeds = UrlFetchApp.fetchAll(missing.map(function (s) {
      return { url: HORO_SITE + '/rss/rss_' + s + '.php', muteHttpExceptions: true };
    }));
    missing.forEach(function (s, i) {
      if (feeds[i].getResponseCode() !== 200) return;
      var item = latestDaily_(feeds[i].getContentText('UTF-8'));
      if (item) store_(s, item);
    });
  }
  return result;

  function store_(s, item) {
    result.signs[s] = item;
    cache.put('horo2_' + today + '_' + s, JSON.stringify(item), 2 * 3600);
  }
}

/* Texte du jour : paragraphe <p class="content-intro"> de la page quotidienne */
function pageText_(html) {
  var m = html.match(/<p class="content-intro">([\s\S]*?)<\/p>/);
  if (!m) return '';
  var t = decode_(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return t.length > 40 ? t : '';
}

function latestDaily_(xml) {
  var items = xml.split('<item>').slice(1), best = null;
  items.forEach(function (it) {
    var link = tag_(it, 'link');
    if (link.indexOf('/quotidien/') < 0) return;
    var date = new Date(tag_(it, 'pubDate')).getTime();
    if (best && best.date >= date) return;
    var text = decode_(tag_(it, 'description'))
      .replace(/<a\b[^>]*>.*?<\/a>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/^\s*[A-Za-zÀ-ÿ]+\s*:\s*/, '')
      .replace(/\s*\[\.\.\.\]\s*$/, '…')
      .replace(/\s+/g, ' ').trim();
    best = { date: date, text: text };
  });
  return best;
}

function tag_(s, name) {
  var m = s.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>'));
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function decode_(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); })
    .replace(/&amp;/g, '&');
}

/* ======================= Citation du jour ======================= */
/* Source : citationdujour.fr, une citation publiée chaque nuit vers 3 h.
   On lit le premier article de la page d'accueil : la citation, son auteur et sa date. */

function getQuote_() {
  var cache = CacheService.getScriptCache();
  var key = 'quote_' + ymd_(new Date());
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var props = PropertiesService.getScriptProperties();
  var q = null;
  try {
    var res = UrlFetchApp.fetch('https://citationdujour.fr/', { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) q = parseQuote_(res.getContentText('UTF-8'));
  } catch (e) { /* site injoignable : on garde la dernière citation */ }
  if (q) {
    q.source = 'citationdujour.fr';
    props.setProperty('LAST_QUOTE', JSON.stringify(q));
    cache.put(key, JSON.stringify(q), 3 * 3600);
    return q;
  }
  var last = props.getProperty('LAST_QUOTE');
  return last ? JSON.parse(last) : null;
}

function parseQuote_(html) {
  var art = html.match(/<article\b[\s\S]*?<\/article>/);
  if (!art) return null;
  var a = art[0];
  var t = a.match(/class="entry-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/);
  var au = a.match(/class="lauteur"[^>]*>([\s\S]*?)<\/a>/);
  var d = a.match(/datetime="(\d{4}-\d{2}-\d{2})/);
  var clean = function (x) { return decode_(x.replace(/<[^>]+>/g, ' ')).replace(/&#8217;/g, '\u2019').replace(/\s+/g, ' ').trim(); };
  var text = t ? clean(t[1]) : '';
  if (text.length < 5) return null;
  return { text: text, author: au ? clean(au[1]) : '', date: d ? d[1] : '' };
}

/* ======================= Spotify ======================= */
/* Affiche la lecture en cours et sert de télécommande (Spotify Premium obligatoire).
   La musique sort de l'appareil où Spotify joue : tablette, téléphone, enceinte...
   Liaison une seule fois : ouvrir dans un navigateur  <adresse /exec>?action=spotifyLogin&token=<code secret> */

var SPOTIFY_SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';

function spotifyRedirect_() {
  return PropertiesService.getScriptProperties().getProperty('SPOTIFY_REDIRECT') || ScriptApp.getService().getUrl();
}

function html_(title, body) {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:40px auto;line-height:1.5;font-size:16px">' +
    '<h2>' + title + '</h2>' + body + '</div>').setTitle(title);
}
function escHtml_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function spotifyPages_(p) {
  var props = PropertiesService.getScriptProperties();
  var tok = props.getProperty('TOKEN');
  var redirect = spotifyRedirect_();
  try {
    if (p.action === 'spotifyLogin') {
      if (!tok || p.token !== tok) return html_('Accès refusé', '<p>Code secret incorrect dans l\'adresse.</p>');
      var id = props.getProperty('SPOTIFY_CLIENT_ID');
      if (!id || !props.getProperty('SPOTIFY_CLIENT_SECRET')) {
        return html_('Spotify : réglages manquants', '<p>Ajoute SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans les propriétés du script.</p>');
      }
      var url = 'https://accounts.spotify.com/authorize?response_type=code&client_id=' + encodeURIComponent(id) +
        '&scope=' + encodeURIComponent(SPOTIFY_SCOPES) + '&redirect_uri=' + encodeURIComponent(redirect) +
        '&state=' + encodeURIComponent(tok) + '&show_dialog=true';
      return html_('Relier Spotify',
        '<p>1. Vérifie que cette adresse figure <b>exactement</b> dans les « Redirect URIs » de ton application Spotify :</p>' +
        '<p style="background:#eee;padding:10px;word-break:break-all"><code>' + escHtml_(redirect) + '</code></p>' +
        '<p>2. Puis clique ici : <a href="' + escHtml_(url) + '" target="_top" style="font-size:20px">Se connecter à Spotify</a></p>');
    }
    if (!tok || p.state !== tok) return html_('Accès refusé', '<p>Retour Spotify non reconnu.</p>');
    if (p.error) return html_('Spotify refusé', '<p>Spotify a répondu : ' + escHtml_(p.error) + '</p>');
    var t = spotifyTokenRequest_({ grant_type: 'authorization_code', code: p.code, redirect_uri: redirect });
    if (!t.refresh_token) throw new Error('Pas de jeton de rafraîchissement reçu');
    props.setProperty('SPOTIFY_REFRESH', t.refresh_token);
    CacheService.getScriptCache().put('sp_access', t.access_token, 3000);
    return html_('Spotify est relié ✓', '<p>Tu peux fermer cette page. Le tableau affichera la lecture en cours d\'ici quelques secondes.</p>');
  } catch (err) {
    return html_('Erreur Spotify', '<p>' + escHtml_(err.message || err) + '</p>');
  }
}

function spotifyTokenRequest_(payload) {
  var props = PropertiesService.getScriptProperties();
  var basic = Utilities.base64Encode(props.getProperty('SPOTIFY_CLIENT_ID') + ':' + props.getProperty('SPOTIFY_CLIENT_SECRET'));
  var res = UrlFetchApp.fetch('https://accounts.spotify.com/api/token', {
    method: 'post', payload: payload, headers: { Authorization: 'Basic ' + basic }, muteHttpExceptions: true
  });
  var j = {};
  try { j = JSON.parse(res.getContentText()); } catch (e) { }
  if (res.getResponseCode() !== 200) throw new Error('Spotify ' + res.getResponseCode() + ' : ' + (j.error_description || j.error || res.getContentText().slice(0, 150)));
  return j;
}

function spotifyAccess_() {
  var cache = CacheService.getScriptCache();
  var a = cache.get('sp_access');
  if (a) return a;
  var props = PropertiesService.getScriptProperties();
  var refresh = props.getProperty('SPOTIFY_REFRESH');
  if (!refresh) return null;
  var t = spotifyTokenRequest_({ grant_type: 'refresh_token', refresh_token: refresh });
  if (t.refresh_token) props.setProperty('SPOTIFY_REFRESH', t.refresh_token);
  cache.put('sp_access', t.access_token, Math.max(60, (t.expires_in || 3600) - 300));
  return t.access_token;
}

function spotifyApi_(method, path, body) {
  var access = spotifyAccess_();
  if (!access) throw new Error('Spotify non relié');
  var opts = { method: method, headers: { Authorization: 'Bearer ' + access }, muteHttpExceptions: true };
  /* Spotify exige un corps (même vide) pour les commandes PUT/POST */
  if (method !== 'get') { opts.contentType = 'application/json'; opts.payload = JSON.stringify(body || {}); }
  var res = UrlFetchApp.fetch('https://api.spotify.com/v1' + path, opts);
  var code = res.getResponseCode();
  if (code === 401) { CacheService.getScriptCache().remove('sp_access'); throw new Error('Session Spotify expirée, nouvel essai au prochain rafraîchissement'); }
  if (code === 204 || code === 202) return null;
  var txt = res.getContentText();
  var j = null;
  try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
  if (code >= 300) {
    var msg = j && j.error ? (j.error.message || j.error) : txt.slice(0, 150);
    if (/NO_ACTIVE_DEVICE|No active device/i.test(msg)) msg = 'Aucun appareil Spotify actif';
    if (code === 403 && /premium/i.test(msg)) msg = 'Spotify Premium nécessaire';
    throw new Error(msg);
  }
  return j;
}

function spotifyState_() {
  if (!PropertiesService.getScriptProperties().getProperty('SPOTIFY_REFRESH')) return { linked: false };
  var st = spotifyApi_('get', '/me/player?additional_types=episode');
  if (!st || !st.item) {
    var dev = spotifyApi_('get', '/me/player/devices') || { devices: [] };
    return { linked: true, active: false, devices: (dev.devices || []).map(function (d) { return { id: d.id, name: d.name, type: d.type }; }) };
  }
  var it = st.item, isEp = it.type === 'episode';
  var imgs = isEp ? (it.images || (it.show && it.show.images) || []) : ((it.album && it.album.images) || []);
  var img = imgs.length ? imgs.reduce(function (best, x) { return (x.width >= 200 && (!best || x.width < best.width)) ? x : best; }, null) || imgs[0] : null;
  return {
    linked: true, active: true, playing: !!st.is_playing,
    title: it.name,
    artist: isEp ? (it.show ? it.show.name : '') : (it.artists || []).map(function (a) { return a.name; }).join(', '),
    image: img ? img.url : '',
    progress: st.progress_ms || 0, duration: it.duration_ms || 0,
    shuffle: !!st.shuffle_state,
    device: st.device ? { id: st.device.id, name: st.device.name, type: st.device.type, volume: st.device.volume_percent } : null,
    at: Date.now()
  };
}

function spotifyControl_(d) {
  var dev = d.deviceId ? '?device_id=' + encodeURIComponent(d.deviceId) : '';
  switch (d.cmd) {
    case 'play': spotifyApi_('put', '/me/player/play' + dev); break;
    case 'pause': spotifyApi_('put', '/me/player/pause'); break;
    case 'next': spotifyApi_('post', '/me/player/next'); break;
    case 'previous': spotifyApi_('post', '/me/player/previous'); break;
    case 'volume': spotifyApi_('put', '/me/player/volume?volume_percent=' + Math.max(0, Math.min(100, Math.round(+d.value || 0)))); break;
    case 'transfer': spotifyApi_('put', '/me/player', { device_ids: [d.deviceId], play: true }); break;
    default: throw new Error('Commande Spotify inconnue');
  }
  return { ok: true };
}

/* ======================= Cozytouch (radiateurs Atlantic) ======================= */
/* Accès non officiel : même méthode que Home Assistant (bibliothèque pyoverkiz).
   1. jeton Atlantic  2. échange contre un JWT  3. connexion au serveur Overkiz (cookie de session).
   Atlantic peut modifier ce fonctionnement sans prévenir. */

var COZY_API = 'https://apis.groupe-atlantic.com';
var COZY_CLIENT = 'Q3RfMUpWeVRtSUxYOEllZkE3YVVOQmpGblpVYToyRWNORHpfZHkzNDJVSnFvMlo3cFNKTnZVdjBh';
var OVERKIZ = 'https://ha110-1.overkiz.com/enduser-mobile-web/enduserAPI/';

var TEMP_STATES = ['core:TemperatureState', 'core:RoomTemperatureState', 'core:AmbientTemperatureState'];
var TARGET_STATES = ['core:TargetTemperatureState', 'io:EffectiveTemperatureSetpointState', 'core:TargetRoomTemperatureState', 'core:ComfortRoomTemperatureState'];

function getIndoor_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('cozy_indoor');
  if (hit) return JSON.parse(hit);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('COZYTOUCH_USER')) return { temp: null, error: 'Identifiants Cozytouch non renseignés' };

  var devices;
  try {
    devices = overkizGet_('setup/devices');
  } catch (e) {
    cache.remove('cozy_session');   /* session expirée : une seule nouvelle tentative */
    devices = overkizGet_('setup/devices');
  }

  /* Regroupe par appareil physique : io://xxxx/123#1 (radiateur), #2 (sonde)... */
  var rooms = {};
  devices.forEach(function (d) {
    var base = String(d.deviceURL).split('#')[0];
    var r = rooms[base] || (rooms[base] = { name: '', temp: null, target: null });
    if (String(d.deviceURL).slice(-2) === '#1' || !r.name) r.name = d.label || r.name;
    (d.states || []).forEach(function (s) {
      if (typeof s.value !== 'number') return;
      if (TEMP_STATES.indexOf(s.name) >= 0 && r.temp === null && s.value > -30 && s.value < 60) r.temp = s.value;
      if (TARGET_STATES.indexOf(s.name) >= 0 && r.target === null) r.target = s.value;
    });
  });
  var list = Object.keys(rooms).map(function (k) { return rooms[k]; }).filter(function (r) { return r.temp !== null; });
  if (!list.length) return { temp: null, error: 'Aucun radiateur avec température trouvé', rooms: [] };

  var sum = 0, min = Infinity, max = -Infinity;
  list.forEach(function (r) { sum += r.temp; min = Math.min(min, r.temp); max = Math.max(max, r.temp); });
  var out = {
    temp: Math.round(sum / list.length * 10) / 10,
    min: min, max: max, count: list.length,
    rooms: list, at: Date.now()
  };
  cache.put('cozy_indoor', JSON.stringify(out), 10 * 60);  /* limite les appels chez Atlantic */
  return out;
}

function overkizGet_(path) {
  var res = UrlFetchApp.fetch(OVERKIZ + path, {
    headers: { Cookie: cozySession_() }, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Cozytouch ' + res.getResponseCode() + ' : ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText());
}

function cozySession_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('cozy_session');
  if (c) return c;
  var props = PropertiesService.getScriptProperties();

  var tok = UrlFetchApp.fetch(COZY_API + '/token', {
    method: 'post', muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + COZY_CLIENT },
    payload: {
      grant_type: 'password',
      username: 'GA-PRIVATEPERSON/' + props.getProperty('COZYTOUCH_USER'),
      password: props.getProperty('COZYTOUCH_PASSWORD')
    }
  });
  var t = {};
  try { t = JSON.parse(tok.getContentText()); } catch (e) { }
  if (!t.access_token) throw new Error('Connexion Cozytouch refusée (' + tok.getResponseCode() + ') : ' + (t.error_description || t.error || 'identifiants ?'));

  var jwtRes = UrlFetchApp.fetch(COZY_API + '/magellan/accounts/jwt', {
    headers: { Authorization: 'Bearer ' + t.access_token }, muteHttpExceptions: true
  });
  var jwt = jwtRes.getContentText().replace(/"/g, '').trim();
  if (!jwt) throw new Error('Cozytouch : JWT absent (' + jwtRes.getResponseCode() + ')');

  var login = UrlFetchApp.fetch(OVERKIZ + 'login', {
    method: 'post', payload: { jwt: jwt }, muteHttpExceptions: true, followRedirects: false
  });
  var code = login.getResponseCode();
  if (code !== 200 && code !== 204) throw new Error('Cozytouch : connexion Overkiz refusée (' + code + ') ' + login.getContentText().slice(0, 200));

  var h = login.getAllHeaders();
  var raw = h['Set-Cookie'] || h['set-cookie'] || [];
  if (!Array.isArray(raw)) raw = [raw];
  var cookie = raw.map(function (x) { return String(x).split(';')[0]; }).join('; ');
  if (!cookie) throw new Error('Cozytouch : pas de cookie de session');
  cache.put('cozy_session', cookie, 2 * 3600);
  return cookie;
}
