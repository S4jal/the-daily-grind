/* ==========================================================================
   The Daily Grind — shared data layer
   Loaded by BOTH the public site and the admin dashboard (/admin).

   This is the seam between the front end and wherever the data really lives.
   Right now it is browser localStorage (static build, no server).

   >>> TO GO LIVE WITH A REAL BACKEND <<<
       Replace the bodies of load() and save() with fetch() calls to your API.
       Nothing else in the site or the dashboard needs to change — every page
       goes through TDG.getHours() / TDG.getMenu() / TDG.save().
   ========================================================================== */
(function (window) {
  'use strict';

  var STORAGE_KEY = 'tdg:site-data:v1';

  /* ------------------------------------------------------------------------
     Defaults — these mirror the hard-coded HTML in menu.html and the footer
     hours lists. They are what the site falls back to when nothing has been
     saved in the dashboard yet.
     ---------------------------------------------------------------------- */
  var DEFAULTS = {
    version: 1,
    updatedAt: null,

    // open/close are 24h "HH:MM". open === null means closed that day.
    hours: [
      { day: 'Sunday',    open: '07:00', close: '17:00' },
      { day: 'Monday',    open: '06:30', close: '18:00' },
      { day: 'Tuesday',   open: '06:30', close: '18:00' },
      { day: 'Wednesday', open: '06:30', close: '18:00' },
      { day: 'Thursday',  open: '06:30', close: '18:00' },
      { day: 'Friday',    open: '06:30', close: '19:00' },
      { day: 'Saturday',  open: '07:00', close: '19:00' }
    ],

    holidayNote: 'The kitchen stops at 2pm daily. We close on Thanksgiving, ' +
                 'Christmas Day, and New Year’s Day — holiday hours are always ' +
                 'posted on the door and on Instagram.',

    categories: [
      { id: 'espresso', name: 'Espresso',           note: 'House blend, or ask for the single origin' },
      { id: 'brewed',   name: 'Brewed & Pour Over', note: 'Origins change every few weeks' },
      { id: 'other',    name: 'Not Coffee',         note: 'For the other half of the table' },
      { id: 'bakery',   name: 'Bakery',             note: 'Baked in house from 6am' },
      { id: 'kitchen',  name: 'Kitchen',            note: 'Served until 2pm' }
    ],

    items: [
      // --- Espresso ---
      { id: 'i01', category: 'espresso', name: 'Espresso', price: 3.25, available: true,
        desc: 'Double shot, 18g in, 36g out. Chocolate and dried cherry.', tags: [] },
      { id: 'i02', category: 'espresso', name: 'Macchiato', price: 3.75, available: true,
        desc: 'Double shot marked with a spoon of dense foam.', tags: [] },
      { id: 'i03', category: 'espresso', name: 'Cortado', price: 4.25, available: true,
        desc: 'Double ristretto cut with a small pour of silky steamed milk.', tags: [] },
      { id: 'i04', category: 'espresso', name: 'Cappuccino', price: 4.75, available: true,
        desc: 'Six ounces, properly foamed. No cocoa dust unless you ask.', tags: [] },
      { id: 'i05', category: 'espresso', name: 'Latte', price: 5.25, available: true,
        desc: 'Twelve ounces of steamed milk over a double shot.', tags: [] },
      { id: 'i06', category: 'espresso', name: 'Honey Oat Latte', price: 5.75, available: true,
        desc: 'Local wildflower honey, oat milk, a pinch of sea salt.',
        tags: [{ label: 'House favorite', style: 'gold' }, { label: 'Vegan', style: 'sage' }] },
      { id: 'i07', category: 'espresso', name: 'Mocha', price: 5.95, available: true,
        desc: '70% dark chocolate ganache, stirred through by hand.', tags: [] },
      { id: 'i08', category: 'espresso', name: 'Iced Shakerato', price: 5.25, available: true,
        desc: 'Shaken hard with ice and a touch of demerara until it foams.', tags: [] },

      // --- Brewed ---
      { id: 'i09', category: 'brewed', name: 'Filter Coffee', price: 3.75, available: true,
        desc: 'Batch brewed all day. Free refill if you’re staying in.', tags: [] },
      { id: 'i10', category: 'brewed', name: 'Single-Origin Pour Over', price: 5.50, available: true,
        desc: 'V60, brewed to order. Ask what’s on the bar today.',
        tags: [{ label: 'Rotating', style: 'gold' }] },
      { id: 'i11', category: 'brewed', name: 'Cold Brew', price: 5.00, available: true,
        desc: 'Steeped eighteen hours. Smooth, low acid, deceptively strong.', tags: [] },
      { id: 'i12', category: 'brewed', name: 'Nitro Cold Brew', price: 6.00, available: true,
        desc: 'On tap, poured with a cascading head. No milk needed.', tags: [] },

      // --- Not Coffee ---
      { id: 'i13', category: 'other', name: 'Loose Leaf Tea', price: 4.25, available: true,
        desc: 'English breakfast, jasmine green, peppermint, or rooibos.', tags: [] },
      { id: 'i14', category: 'other', name: 'Matcha Latte', price: 5.75, available: true,
        desc: 'Ceremonial grade, whisked to order. Hot or iced.',
        tags: [{ label: 'Vegan option', style: 'sage' }] },
      { id: 'i15', category: 'other', name: 'Drinking Chocolate', price: 5.25, available: true,
        desc: 'Thick, barely sweet, finished with a little flaky salt.', tags: [] },
      { id: 'i16', category: 'other', name: 'Fresh Orange Juice', price: 5.50, available: true,
        desc: 'Squeezed in the morning, sold until it runs out.', tags: [] },

      // --- Bakery ---
      { id: 'i17', category: 'bakery', name: 'Butter Croissant', price: 4.50, available: true,
        desc: 'Three days of lamination. Shatters properly.', tags: [] },
      { id: 'i18', category: 'bakery', name: 'Morning Bun', price: 4.75, available: true,
        desc: 'Rolled in orange zest and cinnamon sugar. Usually gone by nine.',
        tags: [{ label: 'House favorite', style: 'gold' }] },
      { id: 'i19', category: 'bakery', name: 'Almond Croissant', price: 5.25, available: true,
        desc: 'Yesterday’s croissant, soaked and refilled with frangipane.', tags: [] },
      { id: 'i20', category: 'bakery', name: 'Seasonal Galette', price: 5.75, available: true,
        desc: 'Whatever the farmers market had this week.', tags: [] },
      { id: 'i21', category: 'bakery', name: 'Banana Bread', price: 4.25, available: true,
        desc: 'Toasted on request, with cultured butter.',
        tags: [{ label: 'Vegetarian', style: 'sage' }] },
      { id: 'i22', category: 'bakery', name: 'Chocolate Chip Cookie', price: 3.75, available: true,
        desc: 'Rested 36 hours, baked soft in the middle.', tags: [] },

      // --- Kitchen ---
      { id: 'i23', category: 'kitchen', name: 'Avocado Toast', price: 12.50, available: true,
        desc: 'Country sourdough, chili, lemon, olive oil. Add a soft egg for $2.50.',
        tags: [{ label: 'Vegan', style: 'sage' }] },
      { id: 'i24', category: 'kitchen', name: 'Egg & Cheddar Sandwich', price: 9.75, available: true,
        desc: 'Folded egg, aged cheddar, house tomato jam, brioche bun.', tags: [] },
      { id: 'i25', category: 'kitchen', name: 'Yogurt & Granola', price: 8.50, available: true,
        desc: 'Whole milk yogurt, our own oat granola, seasonal fruit.',
        tags: [{ label: 'Vegetarian', style: 'sage' }] },
      { id: 'i26', category: 'kitchen', name: 'Soup of the Day', price: 9.00, available: true,
        desc: 'With a slice of buttered sourdough. From 11am.', tags: [] }
    ]
  };

  /* ------------------------------------------------------------------------
     Storage
     ---------------------------------------------------------------------- */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function defaults() { return clone(DEFAULTS); }

  /** Returns the saved override, or null if the client has never saved. */
  function loadOverride() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) { return null; }
      var data = JSON.parse(raw);
      // Shape check — a corrupt or half-written record falls back to defaults.
      if (!data || !Array.isArray(data.hours) || !Array.isArray(data.items)) { return null; }
      if (data.hours.length !== 7) { return null; }
      return data;
    } catch (err) {
      return null;
    }
  }

  /** Full current state: saved data if present, otherwise the defaults. */
  function load() {
    return loadOverride() || defaults();
  }

  function save(data) {
    var payload = clone(data);
    payload.version = 1;
    payload.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return { ok: true, data: payload };
    } catch (err) {
      // Quota exceeded, private mode, storage disabled…
      return { ok: false, error: String(err && err.message || err) };
    }
  }

  function clear() {
    try { window.localStorage.removeItem(STORAGE_KEY); return true; }
    catch (err) { return false; }
  }

  function hasOverride() { return loadOverride() !== null; }

  /* ------------------------------------------------------------------------
     Accessors used by the public pages
     ---------------------------------------------------------------------- */
  function getHours() { return load().hours; }

  function getMenu() {
    var data = load();
    return { categories: data.categories, items: data.items };
  }

  function getHolidayNote() { return load().holidayNote; }

  /* ------------------------------------------------------------------------
     Formatting helpers (shared so the site and dashboard agree)
     ---------------------------------------------------------------------- */
  function toMinutes(hhmm) {
    if (!hhmm) { return null; }
    var p = String(hhmm).split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function to12h(hhmm) {
    var m = toMinutes(hhmm);
    if (m === null || isNaN(m)) { return ''; }
    var h = Math.floor(m / 60), min = m % 60;
    var suffix = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (min ? ':' + String(min).padStart(2, '0') : '') + suffix;
  }

  function money(n) {
    var v = Number(n);
    return '$' + (isNaN(v) ? '0.00' : v.toFixed(2));
  }

  function nextId(items) {
    var max = 0;
    items.forEach(function (it) {
      var n = parseInt(String(it.id).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) { max = n; }
    });
    return 'i' + String(max + 1).padStart(2, '0');
  }

  window.TDG = {
    STORAGE_KEY: STORAGE_KEY,
    defaults: defaults,
    load: load,
    save: save,
    clear: clear,
    hasOverride: hasOverride,
    getHours: getHours,
    getMenu: getMenu,
    getHolidayNote: getHolidayNote,
    toMinutes: toMinutes,
    to12h: to12h,
    money: money,
    nextId: nextId
  };
})(window);
