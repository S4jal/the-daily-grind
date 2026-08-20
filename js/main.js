/* ==========================================================================
   The Daily Grind — site scripts
   No dependencies, no build step. Loaded with `defer` on every page.

   >>> OPENING HOURS AND MENU CONTENT NOW LIVE IN js/site-data.js <<<
       That file is shared with the admin dashboard at /admin, so anything
       the client changes there shows up here. This file only reads.

       The FALLBACK_HOURS below exist purely so the site still works if
       site-data.js fails to load.
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ------------------------------------------------------------------------
     1. Opening hours — read through the shared data layer
        24h "HH:MM" strings. `null` means closed that day.
        Index 0 = Sunday ... 6 = Saturday.
     ---------------------------------------------------------------------- */
  var TIMEZONE = 'America/Los_Angeles';

  var FALLBACK_HOURS = [
    { day: 'Sunday',    open: '07:00', close: '17:00' },
    { day: 'Monday',    open: '06:30', close: '18:00' },
    { day: 'Tuesday',   open: '06:30', close: '18:00' },
    { day: 'Wednesday', open: '06:30', close: '18:00' },
    { day: 'Thursday',  open: '06:30', close: '18:00' },
    { day: 'Friday',    open: '06:30', close: '19:00' },
    { day: 'Saturday',  open: '07:00', close: '19:00' }
  ];

  /** Current hours: whatever the dashboard saved, else the built-in defaults. */
  function hours() {
    if (window.TDG && typeof window.TDG.getHours === 'function') {
      try {
        var h = window.TDG.getHours();
        if (h && h.length === 7) { return h; }
      } catch (err) { /* fall through */ }
    }
    return FALLBACK_HOURS;
  }

  /* ------------------------------------------------------------------------
     2. Small helpers
     ---------------------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function toMinutes(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function pretty(hhmm) {
    var m = toMinutes(hhmm);
    var h = Math.floor(m / 60);
    var min = m % 60;
    var suffix = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (min ? ':' + String(min).padStart(2, '0') : '') + suffix;
  }

  /** Current day + minute-of-day in the shop's timezone, not the visitor's. */
  function shopNow() {
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(new Date());
    } catch (err) {
      // Very old browser without timeZone support — fall back to local time.
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }

    var lookup = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var day = 0, hour = 0, minute = 0;

    parts.forEach(function (part) {
      if (part.type === 'weekday') { day = lookup[part.value] || 0; }
      if (part.type === 'hour') { hour = parseInt(part.value, 10) % 24; }
      if (part.type === 'minute') { minute = parseInt(part.value, 10); }
    });

    return { day: day, minutes: hour * 60 + minute };
  }

  /** -> { open: Boolean, text: String } */
  function openStatus() {
    var now = shopNow();
    var week = hours();
    var today = week[now.day];

    if (today && today.open) {
      var opensAt = toMinutes(today.open);
      var closesAt = toMinutes(today.close);

      if (now.minutes >= opensAt && now.minutes < closesAt) {
        return { open: true, text: 'Open now · until ' + pretty(today.close) };
      }
      if (now.minutes < opensAt) {
        return { open: false, text: 'Closed · opens ' + pretty(today.open) };
      }
    }

    // Closed for the day — find the next day we open.
    for (var i = 1; i <= 7; i++) {
      var next = week[(now.day + i) % 7];
      if (next && next.open) {
        var when = i === 1 ? 'tomorrow' : next.day;
        return { open: false, text: 'Closed · opens ' + when + ' ' + pretty(next.open) };
      }
    }
    return { open: false, text: 'Closed' };
  }

  /* ------------------------------------------------------------------------
     3. Live open/closed badges  ([data-open-status])
     ---------------------------------------------------------------------- */
  function renderStatusBadges() {
    var badges = $$('[data-open-status]');
    if (!badges.length) { return; }

    var status = openStatus();
    badges.forEach(function (el) {
      el.classList.remove('badge--open', 'badge--closed');
      el.classList.add('badge', status.open ? 'badge--open' : 'badge--closed');
      el.innerHTML = '<span class="badge__dot" aria-hidden="true"></span>' + status.text;
    });
  }

  /* ------------------------------------------------------------------------
     4. Hours table — fill rows and highlight today
     ---------------------------------------------------------------------- */
  function renderHoursTable() {
    var table = $('[data-hours-table]');
    if (!table) { return; }

    var todayIndex = shopNow().day;

    table.innerHTML = hours().map(function (entry, i) {
      var value = entry.open
        ? pretty(entry.open) + ' – ' + pretty(entry.close)
        : 'Closed';
      return '<tr class="' + (i === todayIndex ? 'is-today' : '') + '">' +
               '<th scope="row">' + entry.day + '</th>' +
               '<td>' + value + '</td>' +
             '</tr>';
    }).join('');

    // Holiday/kitchen note, if the dashboard changed it.
    var note = document.querySelector('[data-holiday-note]');
    if (note && window.TDG && window.TDG.hasOverride()) {
      var text = window.TDG.getHolidayNote();
      if (text) { note.textContent = text; }
    }
  }

  /* ------------------------------------------------------------------------
     4b. Menu — re-render from saved dashboard content
         The static HTML in menu.html stays the source of truth for search
         engines and for a first-time visitor. We only rebuild the list when
         the client has actually saved changes in /admin.
     ---------------------------------------------------------------------- */
  function renderMenuOverride() {
    var root = document.querySelector('[data-menu-root]');
    if (!root || !window.TDG || !window.TDG.hasOverride()) { return; }

    var data;
    try { data = window.TDG.getMenu(); } catch (err) { return; }
    if (!data || !data.categories || !data.items) { return; }

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    var html = data.categories.map(function (cat) {
      var items = data.items.filter(function (i) {
        return i.category === cat.id && i.available;
      });
      if (!items.length) { return ''; }

      var lis = items.map(function (it) {
        var tags = (it.tags || []).map(function (t) {
          return '<span class="tag' + (t.style === 'gold' ? ' tag--gold' : '') + '">' +
                 esc(t.label) + '</span>';
        }).join('');
        return '<li class="menu-item">' +
                 '<div class="menu-item__row">' +
                   '<span class="menu-item__name">' + esc(it.name) + '</span>' +
                   '<span class="menu-item__dots" aria-hidden="true"></span>' +
                   '<span class="menu-item__price">' + window.TDG.money(it.price) + '</span>' +
                 '</div>' +
                 (it.desc ? '<p class="menu-item__desc">' + esc(it.desc) + '</p>' : '') +
                 (tags ? '<div class="menu-item__tags">' + tags + '</div>' : '') +
               '</li>';
      }).join('');

      return '<section class="menu-group" data-category="' + esc(cat.id) + '">' +
               '<div class="menu-group__head">' +
                 '<h2>' + esc(cat.name) + '</h2>' +
                 '<span class="menu-group__note">' + esc(cat.note || '') + '</span>' +
               '</div>' +
               '<ul class="menu-list">' + lis + '</ul>' +
             '</section>';
    }).filter(Boolean).join('');

    if (html) { root.innerHTML = html; }
  }

  /* ------------------------------------------------------------------------
     5. Mobile navigation
     ---------------------------------------------------------------------- */
  function initNav() {
    var toggle = $('.nav-toggle');
    var nav = $('#site-nav');
    if (!toggle || !nav) { return; }

    function setOpen(isOpen) {
      toggle.setAttribute('aria-expanded', String(isOpen));
      nav.classList.toggle('is-open', isOpen);
      document.body.style.overflow = isOpen && window.innerWidth <= 900 ? 'hidden' : '';
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close on link click, Escape, or resize back up to desktop.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { setOpen(false); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) { setOpen(false); }
    });
  }

  /* ------------------------------------------------------------------------
     6. Sticky header shadow
     ---------------------------------------------------------------------- */
  function initStickyHeader() {
    var header = $('.site-header');
    if (!header) { return; }

    var ticking = false;
    function update() {
      header.classList.toggle('is-stuck', window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------------
     7. Scroll reveal
     ---------------------------------------------------------------------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) { return; }

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var delay = parseInt(entry.target.getAttribute('data-reveal-delay') || '0', 10);
        setTimeout(function () { entry.target.classList.add('is-visible'); }, delay);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     8. Menu category filter
     ---------------------------------------------------------------------- */
  function initMenuFilter() {
    var chips = $$('[data-filter]');
    var groups = $$('[data-category]');
    if (!chips.length || !groups.length) { return; }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var target = chip.getAttribute('data-filter');

        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', String(c === chip));
        });
        groups.forEach(function (group) {
          group.hidden = target !== 'all' && group.getAttribute('data-category') !== target;
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     9. Contact form — client-side validation
        DEMO ONLY: this does not send mail. See README for wiring it to a
        real handler (Formspree / Netlify Forms / your own endpoint).
     ---------------------------------------------------------------------- */
  function initForm() {
    var form = $('[data-contact-form]');
    if (!form) { return; }

    var status = $('[data-form-status]', form);

    function showError(field, message) {
      var wrap = field.closest('.field');
      if (!wrap) { return; }
      wrap.classList.add('has-error');
      field.setAttribute('aria-invalid', 'true');
      var slot = $('.field__error', wrap);
      if (slot) { slot.textContent = message; }
    }

    function clearError(field) {
      var wrap = field.closest('.field');
      if (!wrap) { return; }
      wrap.classList.remove('has-error');
      field.removeAttribute('aria-invalid');
      var slot = $('.field__error', wrap);
      if (slot) { slot.textContent = ''; }
    }

    function validate(field) {
      var value = (field.value || '').trim();

      if (field.required && !value) {
        showError(field, 'This field is required.');
        return false;
      }
      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        showError(field, 'Please enter a valid email address.');
        return false;
      }
      if (field.name === 'message' && value && value.length < 10) {
        showError(field, 'Please give us a little more detail (10+ characters).');
        return false;
      }
      clearError(field);
      return true;
    }

    var fields = $$('input, textarea, select', form).filter(function (f) {
      return f.type !== 'hidden' && f.type !== 'submit';
    });

    fields.forEach(function (field) {
      field.addEventListener('blur', function () { validate(field); });
      field.addEventListener('input', function () {
        if (field.closest('.field').classList.contains('has-error')) { validate(field); }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstInvalid = null;
      fields.forEach(function (field) {
        if (!validate(field) && !firstInvalid) { firstInvalid = field; }
      });

      if (firstInvalid) {
        status.hidden = false;
        status.className = 'form__status form__status--err';
        status.textContent = 'Please fix the highlighted fields and try again.';
        firstInvalid.focus();
        return;
      }

      // --- DEMO: simulate a successful send -------------------------------
      var button = $('button[type="submit"]', form);
      var original = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';

      setTimeout(function () {
        button.disabled = false;
        button.textContent = original;
        form.reset();
        status.hidden = false;
        status.className = 'form__status form__status--ok';
        status.textContent = 'Thanks for reaching out! We usually reply within one business day. ' +
                             '(Demo only — no message was actually sent.)';
        status.focus();
      }, 700);
    });
  }

  /* ------------------------------------------------------------------------
     10. Footer year
     ---------------------------------------------------------------------- */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ------------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  renderStatusBadges();
  renderHoursTable();
  renderMenuOverride();   // must run before initMenuFilter/initReveal bind
  initNav();
  initStickyHeader();
  initReveal();
  initMenuFilter();
  initForm();
  initYear();

  // Keep the badge honest if the tab is left open across an opening time.
  setInterval(renderStatusBadges, 60000);
})();
