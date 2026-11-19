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
 */

var TZ = 'Europe/Paris';

/* ======================= Point d'entrée ======================= */

function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }

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
  var cals = CalendarApp.getAllCalendars().map(function (c) { return '  ' + c.getName() + '  →  ' + c.getId(); });
  Logger.log('CODE SECRET à copier dans la tablette : ' + tok);
  Logger.log('Agendas trouvés :\n' + cals.join('\n'));
}

/** À lancer depuis l'éditeur pour vérifier la connexion Cozytouch. */
function testCozytouch() {
  CacheService.getScriptCache().remove('cozy_session');
  CacheService.getScriptCache().remove('cozy_indoor');
  var r = getIndoor_();
  Logger.log(JSON.stringify(r, null, 2));
}

/** À lancer depuis l'éditeur pour vérifier l'horoscope. */
function testHoroscope() {
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
/* Source : flux RSS de mon-horoscope-du-jour.com, un flux par signe.
   Le flux mêle quotidien, hebdomadaire et trimestriel : on garde le quotidien le plus récent. */

function getHoroscope_(signs) {
  var cache = CacheService.getScriptCache();
  var today = ymd_(new Date());
  var result = { date: today, source: 'mon-horoscope-du-jour.com', signs: {} };
  var todo = [];
  signs.forEach(function (s) {
    s = String(s).trim().toLowerCase();
    if (!/^[a-z]+$/.test(s)) return;
    var hit = cache.get('horo_' + today + '_' + s);
    if (hit) result.signs[s] = JSON.parse(hit); else todo.push(s);
  });
  if (todo.length) {
    var reqs = todo.map(function (s) {
      return { url: 'https://www.mon-horoscope-du-jour.com/rss/rss_' + s + '.php', muteHttpExceptions: true };
    });
    var resps = UrlFetchApp.fetchAll(reqs);
    todo.forEach(function (s, i) {
      if (resps[i].getResponseCode() !== 200) return;
      var item = latestDaily_(resps[i].getContentText('UTF-8'));
      if (!item) return;
      result.signs[s] = item;
      cache.put('horo_' + today + '_' + s, JSON.stringify(item), 6 * 3600);
    });
  }
  return result;
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
