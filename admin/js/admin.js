/* ==========================================================================
   The Daily Grind — Admin dashboard
   Depends on ../js/site-data.js (window.TDG) for all reading and writing.

   Static build: TDG.save() writes to localStorage. When the backend lands,
   only site-data.js changes — this file keeps working as-is.
   ========================================================================== */
(function () {
  'use strict';

  var TDG = window.TDG;
  if (!TDG) {
    document.body.innerHTML = '<p style="padding:40px;font:16px system-ui">' +
      'Could not load <code>js/site-data.js</code>. The dashboard needs it to run.</p>';
    return;
  }

  var TAG_CHOICES = [
    { label: 'House favorite', style: 'gold' },
    { label: 'Rotating',       style: 'gold' },
    { label: 'Vegan',          style: 'sage' },
    { label: 'Vegan option',   style: 'sage' },
    { label: 'Vegetarian',     style: 'sage' },
    { label: 'Gluten free',    style: 'sage' },
    { label: 'New',            style: 'gold' }
  ];

  var DAY_ORDER = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  /* ------------------------------------------------------------------------
     State
     ---------------------------------------------------------------------- */
  var saved = TDG.load();          // last persisted state
  var draft = clone(saved);        // what the user is editing
  var dirty = false;
  var currentView = 'overview';
  var filterCat = 'all';
  var searchTerm = '';
  var editingId = null;            // null = adding a new item
  var confirmAction = null;
  var lastFocused = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------------
     Toasts
     ---------------------------------------------------------------------- */
  function toast(message, kind) {
    var wrap = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast' + (kind === 'err' ? ' toast--err' : ' toast--ok');
    el.innerHTML = '<svg aria-hidden="true"><use href="#i-' +
      (kind === 'err' ? 'alert' : 'check') + '"/></svg><span>' + esc(message) + '</span>';
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(function () { el.remove(); }, 320);
    }, 3200);
  }

  /* ------------------------------------------------------------------------
     Dirty tracking
     ---------------------------------------------------------------------- */
  function markDirty() {
    dirty = JSON.stringify(stripMeta(draft)) !== JSON.stringify(stripMeta(saved));
    $('#unsaved').hidden = !dirty;
    $('#discard').hidden = !dirty;
    $('#save').disabled = !dirty;
  }

  function stripMeta(d) {
    var c = clone(d);
    delete c.updatedAt;
    delete c.version;
    return c;
  }

  function commit() {
    var result = TDG.save(draft);
    if (!result.ok) {
      toast('Could not save: ' + result.error, 'err');
      return;
    }
    saved = clone(result.data);
    draft = clone(result.data);
    markDirty();
    renderOverview();
    renderExport();
    toast('Saved. Your live site is updated.');
  }

  function discard() {
    draft = clone(saved);
    markDirty();
    renderAll();
    toast('Changes discarded.');
  }

  /* ------------------------------------------------------------------------
     Navigation
     ---------------------------------------------------------------------- */
  var VIEW_META = {
    overview: ['Overview', "What's live on the site right now"],
    menu:     ['Menu', 'Add, edit, reorder, and hide items'],
    hours:    ['Hours', 'Opening times for each day of the week'],
    export:   ['Export', 'Push these changes into the site files']
  };

  function go(view) {
    currentView = view;
    $$('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + view; });
    $$('.nav-btn[data-view]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === view);
    });
    $('#page-title').textContent = VIEW_META[view][0];
    $('#page-sub').textContent = VIEW_META[view][1];
    closeSidebar();
    if (view === 'export') { renderExport(); }
    if (view === 'overview') { renderOverview(); }
    window.scrollTo(0, 0);
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('is-open');
    $('#scrim').hidden = true;
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
  }

  /* ------------------------------------------------------------------------
     Overview
     ---------------------------------------------------------------------- */
  function renderOverview() {
    var items = draft.items;
    var out = items.filter(function (i) { return !i.available; }).length;

    $('[data-stat="items"]').textContent = items.length;
    $('[data-stat="items-meta"]').textContent = 'across ' + draft.categories.length + ' categories';
    $('[data-stat="available"]').textContent = items.length - out;
    $('[data-stat="available-meta"]').textContent = out
      ? out + ' marked sold out'
      : 'nothing marked sold out';

    var todayIdx = new Date().getDay();
    var today = draft.hours[todayIdx];
    $('[data-stat="today"]').textContent = today && today.open
      ? TDG.to12h(today.open) + ' – ' + TDG.to12h(today.close)
      : 'Closed';
    $('[data-stat="today-meta"]').textContent = DAY_ORDER[todayIdx];

    var el = $('[data-stat="saved"]');
    var meta = $('[data-stat="saved-meta"]');
    if (saved.updatedAt) {
      var d = new Date(saved.updatedAt);
      el.textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
                       ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      meta.textContent = 'your content is live';
    } else {
      el.textContent = 'Never';
      meta.textContent = 'showing default content';
    }

    $('[data-count-items]').textContent = items.length;
  }

  /* ------------------------------------------------------------------------
     Menu list
     ---------------------------------------------------------------------- */
  function renderCatFilter() {
    var wrap = $('#cat-filter');
    var buttons = [{ id: 'all', name: 'All' }].concat(draft.categories);
    wrap.innerHTML = buttons.map(function (c) {
      return '<button type="button" data-cat="' + esc(c.id) + '" aria-pressed="' +
             (filterCat === c.id) + '">' + esc(c.name) + '</button>';
    }).join('');
  }

  function visibleItems(catId) {
    var term = searchTerm.trim().toLowerCase();
    return draft.items.filter(function (it) {
      if (it.category !== catId) { return false; }
      if (!term) { return true; }
      return (it.name + ' ' + (it.desc || '')).toLowerCase().indexOf(term) !== -1;
    });
  }

  function renderMenu() {
    renderCatFilter();
    var host = $('#menu-list');
    var shown = 0;

    host.innerHTML = draft.categories.map(function (cat) {
      if (filterCat !== 'all' && filterCat !== cat.id) { return ''; }
      var items = visibleItems(cat.id);
      if (!items.length && searchTerm.trim()) { return ''; }
      shown += items.length;

      // Reordering while a search filters the list would move items relative to
      // results the user can't see, so it's disabled until the search is cleared.
      var canMove = !searchTerm.trim();

      var rows = items.map(function (it, idx) {
        var tags = (it.tags || []).map(function (t) {
          return '<span class="pill pill--' + (t.style === 'gold' ? 'gold' : 'sage') + '">' +
                 esc(t.label) + '</span>';
        }).join('');

        return '' +
        '<div class="row' + (it.available ? '' : ' is-out') + '" data-id="' + esc(it.id) + '">' +
          '<div class="row__move">' +
            '<button type="button" data-move="up" ' + (idx === 0 || !canMove ? 'disabled' : '') +
              ' aria-label="Move ' + esc(it.name) + ' up"><svg aria-hidden="true"><use href="#i-up"/></svg></button>' +
            '<button type="button" data-move="down" ' + (idx === items.length - 1 || !canMove ? 'disabled' : '') +
              ' aria-label="Move ' + esc(it.name) + ' down"><svg aria-hidden="true"><use href="#i-down"/></svg></button>' +
          '</div>' +
          '<div class="row__main">' +
            '<div class="row__name">' + esc(it.name) +
              (it.available ? '' : ' <span class="pill pill--danger">Sold out</span>') +
              (tags ? '<span class="row__tags">' + tags + '</span>' : '') +
            '</div>' +
            '<div class="row__desc">' + esc(it.desc || 'No description') + '</div>' +
          '</div>' +
          '<div class="row__price">' + TDG.money(it.price) + '</div>' +
          '<div class="row__actions">' +
            '<button class="icon-btn" type="button" data-act="toggle" aria-label="' +
              (it.available ? 'Mark sold out' : 'Mark available') + '">' +
              '<svg aria-hidden="true"><use href="#i-' + (it.available ? 'eye' : 'eye-off') + '"/></svg></button>' +
            '<button class="icon-btn" type="button" data-act="edit" aria-label="Edit ' + esc(it.name) + '">' +
              '<svg aria-hidden="true"><use href="#i-edit"/></svg></button>' +
            '<button class="icon-btn icon-btn--danger" type="button" data-act="delete" aria-label="Delete ' + esc(it.name) + '">' +
              '<svg aria-hidden="true"><use href="#i-trash"/></svg></button>' +
          '</div>' +
        '</div>';
      }).join('');

      return '' +
      '<section class="cat-block">' +
        '<div class="cat-block__head">' +
          '<h3>' + esc(cat.name) + '</h3>' +
          '<span class="pill">' + items.length + '</span>' +
          '<span class="cat-block__note">' + esc(cat.note || '') + '</span>' +
        '</div>' +
        (items.length
          ? '<div class="rows">' + rows + '</div>'
          : '<p style="font-size:13.5px;color:var(--c-ink-mute);padding:6px 4px">No items in this category yet.</p>') +
      '</section>';
    }).join('');

    var isEmpty = shown === 0;
    $('#menu-empty').hidden = !isEmpty;
    $('#menu-empty-msg').textContent = searchTerm.trim()
      ? 'No items match “' + searchTerm.trim() + '”.'
      : 'Add your first item to get started.';

    $('[data-count-items]').textContent = draft.items.length;
  }

  /* ------------------------------------------------------------------------
     Item modal
     ---------------------------------------------------------------------- */
  function renderTagChoices(selected) {
    var picked = (selected || []).map(function (t) { return t.label; });
    $('#f-tags').innerHTML = TAG_CHOICES.map(function (t, i) {
      return '<label class="check"><input type="checkbox" value="' + esc(t.label) +
             '" data-style="' + t.style + '"' + (picked.indexOf(t.label) !== -1 ? ' checked' : '') +
             '><span>' + esc(t.label) + '</span></label>';
    }).join('');
  }

  function openItemModal(id) {
    editingId = id || null;
    var item = id ? draft.items.filter(function (i) { return i.id === id; })[0] : null;

    $('#f-cat').innerHTML = draft.categories.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join('');

    $('#item-modal-title').textContent = item ? 'Edit menu item' : 'Add menu item';
    $('#item-save').textContent = item ? 'Save item' : 'Add item';
    $('#f-name').value = item ? item.name : '';
    $('#f-price').value = item ? item.price : '';
    $('#f-cat').value = item ? item.category
      : (filterCat !== 'all' ? filterCat : draft.categories[0].id);
    $('#f-desc').value = item ? (item.desc || '') : '';
    $('#f-available').checked = item ? !!item.available : true;
    $('#f-desc-count').textContent = $('#f-desc').value.length;
    renderTagChoices(item ? item.tags : []);
    clearFieldErrors();

    lastFocused = document.activeElement;
    $('#item-modal').hidden = false;
    setTimeout(function () { $('#f-name').focus(); }, 30);
  }

  function closeModals() {
    $('#item-modal').hidden = true;
    $('#confirm-modal').hidden = true;
    confirmAction = null;
    if (lastFocused && lastFocused.focus) { lastFocused.focus(); }
  }

  function clearFieldErrors() {
    $$('#item-form .field').forEach(function (f) {
      f.classList.remove('has-error');
      var e = $('.field__err', f);
      if (e) { e.textContent = ''; }
    });
  }

  function setFieldError(input, msg) {
    var wrap = input.closest('.field');
    wrap.classList.add('has-error');
    var slot = $('.field__err', wrap);
    if (slot) { slot.textContent = msg; }
  }

  function submitItem(e) {
    e.preventDefault();
    clearFieldErrors();

    var name = $('#f-name').value.trim();
    var priceRaw = $('#f-price').value.trim();
    var price = parseFloat(priceRaw);
    var bad = null;

    if (!name) {
      setFieldError($('#f-name'), 'Give the item a name.');
      bad = bad || $('#f-name');
    }

    var dupe = draft.items.some(function (i) {
      return i.id !== editingId && i.name.toLowerCase() === name.toLowerCase();
    });
    if (name && dupe) {
      setFieldError($('#f-name'), 'Another item already uses this name.');
      bad = bad || $('#f-name');
    }

    if (priceRaw === '' || isNaN(price) || price < 0) {
      setFieldError($('#f-price'), 'Enter a price, e.g. 4.75');
      bad = bad || $('#f-price');
    } else if (price > 999) {
      setFieldError($('#f-price'), 'That looks too high.');
      bad = bad || $('#f-price');
    }

    if (bad) { bad.focus(); return; }

    var tags = $$('#f-tags input:checked').map(function (cb) {
      return { label: cb.value, style: cb.getAttribute('data-style') };
    });

    var payload = {
      category: $('#f-cat').value,
      name: name,
      price: Math.round(price * 100) / 100,
      desc: $('#f-desc').value.trim(),
      tags: tags,
      available: $('#f-available').checked
    };

    if (editingId) {
      draft.items = draft.items.map(function (i) {
        return i.id === editingId ? Object.assign({}, i, payload) : i;
      });
      toast('“' + name + '” updated. Remember to save.');
    } else {
      payload.id = TDG.nextId(draft.items);
      draft.items.push(payload);
      toast('“' + name + '” added. Remember to save.');
    }

    closeModals();
    markDirty();
    renderMenu();
    renderOverview();
  }

  /* ------------------------------------------------------------------------
     Confirm modal
     ---------------------------------------------------------------------- */
  function askConfirm(title, body, okLabel, fn) {
    $('#confirm-title').textContent = title;
    $('#confirm-body').textContent = body;
    $('#confirm-ok').textContent = okLabel;
    confirmAction = fn;
    lastFocused = document.activeElement;
    $('#confirm-modal').hidden = false;
    setTimeout(function () { $('#confirm-ok').focus(); }, 30);
  }

  /* ------------------------------------------------------------------------
     Menu row actions
     ---------------------------------------------------------------------- */
  function onMenuClick(e) {
    var row = e.target.closest('.row');
    if (!row) { return; }
    var id = row.getAttribute('data-id');
    var item = draft.items.filter(function (i) { return i.id === id; })[0];
    if (!item) { return; }

    var moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      move(id, moveBtn.getAttribute('data-move'));
      return;
    }

    var actBtn = e.target.closest('[data-act]');
    if (!actBtn) { return; }
    var act = actBtn.getAttribute('data-act');

    if (act === 'edit') {
      openItemModal(id);
    } else if (act === 'toggle') {
      item.available = !item.available;
      markDirty();
      renderMenu();
      renderOverview();
      toast('“' + item.name + '” is now ' + (item.available ? 'available' : 'sold out') + '.');
    } else if (act === 'delete') {
      askConfirm('Delete this item?',
        '“' + item.name + '” will be removed from the menu. You can undo by pressing Discard before saving.',
        'Delete item',
        function () {
          draft.items = draft.items.filter(function (i) { return i.id !== id; });
          markDirty();
          renderMenu();
          renderOverview();
          toast('“' + item.name + '” deleted. Remember to save.');
        });
    }
  }

  /** Move an item up/down within its own category. */
  function move(id, dir) {
    var item = draft.items.filter(function (i) { return i.id === id; })[0];
    if (!item) { return; }

    // Indices of this category's items within the master array, in order.
    var idxs = [];
    draft.items.forEach(function (it, i) {
      if (it.category === item.category) { idxs.push(i); }
    });

    var pos = idxs.indexOf(draft.items.indexOf(item));
    var target = dir === 'up' ? pos - 1 : pos + 1;
    if (target < 0 || target >= idxs.length) { return; }

    var a = idxs[pos], b = idxs[target];
    var tmp = draft.items[a];
    draft.items[a] = draft.items[b];
    draft.items[b] = tmp;

    markDirty();
    renderMenu();
  }

  /* ------------------------------------------------------------------------
     Hours editor
     ---------------------------------------------------------------------- */
  function renderHours() {
    var todayIdx = new Date().getDay();

    $('#hours-rows').innerHTML = draft.hours.map(function (h, i) {
      var closed = !h.open;
      return '' +
      '<div class="hours-row' + (i === todayIdx ? ' is-today' : '') + '" data-day="' + i + '">' +
        '<div class="hours-row__day">' + esc(h.day) +
          (i === todayIdx ? ' <span class="pill pill--gold">Today</span>' : '') + '</div>' +
        '<div class="hours-row__times">' +
          (closed
            ? '<span class="hours-row__closed">Closed all day</span>'
            : '<input type="time" value="' + esc(h.open) + '" data-time="open" aria-label="' + esc(h.day) + ' opening time">' +
              '<span class="hours-row__sep">to</span>' +
              '<input type="time" value="' + esc(h.close) + '" data-time="close" aria-label="' + esc(h.day) + ' closing time">' +
              '<span class="hours-row__err" data-err></span>') +
        '</div>' +
        '<label class="switch">' +
          '<input type="checkbox" data-open-toggle' + (closed ? '' : ' checked') + '>' +
          '<span class="switch__track"></span>' +
          '<span>' + (closed ? 'Closed' : 'Open') + '</span>' +
        '</label>' +
      '</div>';
    }).join('');
  }

  function onHoursChange(e) {
    var row = e.target.closest('.hours-row');
    if (!row) { return; }
    var idx = parseInt(row.getAttribute('data-day'), 10);
    var entry = draft.hours[idx];

    if (e.target.hasAttribute('data-open-toggle')) {
      if (e.target.checked) {
        var fallback = TDG.defaults().hours[idx];
        entry.open = fallback.open || '07:00';
        entry.close = fallback.close || '17:00';
      } else {
        entry.open = null;
        entry.close = null;
      }
      markDirty();
      renderHours();
      renderOverview();
      return;
    }

    if (e.target.hasAttribute('data-time')) {
      var which = e.target.getAttribute('data-time');
      entry[which] = e.target.value;

      var errSlot = $('[data-err]', row);
      var o = TDG.toMinutes(entry.open), c = TDG.toMinutes(entry.close);
      if (o !== null && c !== null && !isNaN(o) && !isNaN(c) && c <= o) {
        if (errSlot) { errSlot.textContent = 'Closing must be after opening'; }
      } else if (errSlot) {
        errSlot.textContent = '';
      }
      markDirty();
      renderOverview();
    }
  }

  /** Blocks saving while any day has close <= open. */
  function hoursValid() {
    return draft.hours.every(function (h) {
      if (!h.open || !h.close) { return true; }
      var o = TDG.toMinutes(h.open), c = TDG.toMinutes(h.close);
      return !(o !== null && c !== null && c <= o);
    });
  }

  /* ------------------------------------------------------------------------
     Export
     ---------------------------------------------------------------------- */
  function jsString(s) {
    return "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  }

  function renderExport() {
    // 1. Hours array
    $('#out-hours').textContent = 'hours: [\n' + saved.hours.map(function (h) {
      return '  { day: ' + jsString(h.day) + ', open: ' +
             (h.open ? jsString(h.open) : 'null') + ', close: ' +
             (h.close ? jsString(h.close) : 'null') + ' }';
    }).join(',\n') + '\n],';

    // 2. Items array
    $('#out-items').textContent = 'items: [\n' + saved.items.map(function (it) {
      var tags = (it.tags || []).map(function (t) {
        return '{ label: ' + jsString(t.label) + ', style: ' + jsString(t.style) + ' }';
      }).join(', ');
      return '  { id: ' + jsString(it.id) +
             ', category: ' + jsString(it.category) +
             ', name: ' + jsString(it.name) +
             ', price: ' + Number(it.price).toFixed(2) +
             ', available: ' + !!it.available +
             ',\n    desc: ' + jsString(it.desc) +
             ', tags: [' + tags + '] }';
    }).join(',\n') + '\n],';

    // 3. Public menu HTML
    var html = saved.categories.map(function (cat) {
      var items = saved.items.filter(function (i) {
        return i.category === cat.id && i.available;
      });
      if (!items.length) { return ''; }

      var lis = items.map(function (it) {
        var tags = (it.tags || []).map(function (t) {
          return '<span class="tag' + (t.style === 'gold' ? ' tag--gold' : '') + '">' +
                 esc(t.label) + '</span>';
        }).join('');
        return '' +
'          <li class="menu-item">\n' +
'            <div class="menu-item__row"><span class="menu-item__name">' + esc(it.name) +
'</span><span class="menu-item__dots" aria-hidden="true"></span><span class="menu-item__price">' +
TDG.money(it.price) + '</span></div>\n' +
(it.desc ? '            <p class="menu-item__desc">' + esc(it.desc) + '</p>\n' : '') +
(tags ? '            <div class="menu-item__tags">' + tags + '</div>\n' : '') +
'          </li>';
      }).join('\n');

      return '' +
'      <section class="menu-group" data-category="' + esc(cat.id) + '" data-reveal>\n' +
'        <div class="menu-group__head">\n' +
'          <h2>' + esc(cat.name) + '</h2>\n' +
'          <span class="menu-group__note">' + esc(cat.note || '') + '</span>\n' +
'        </div>\n' +
'        <ul class="menu-list">\n' + lis + '\n        </ul>\n' +
'      </section>';
    }).filter(Boolean).join('\n\n');

    $('#out-html').textContent = html;
  }

  function copyBlock(id) {
    var text = $('#' + id).textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast('Copied to clipboard.'); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('Copied to clipboard.');
    } catch (err) {
      toast('Press Ctrl+C to copy.', 'err');
    }
    ta.remove();
  }

  function downloadJson() {
    var blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'daily-grind-content-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Backup downloaded.');
  }

  /* ------------------------------------------------------------------------
     Render everything
     ---------------------------------------------------------------------- */
  function renderAll() {
    renderOverview();
    renderMenu();
    renderHours();
    renderExport();
    $('#holiday-note').value = draft.holidayNote || '';
  }

  /* ------------------------------------------------------------------------
     Wiring
     ---------------------------------------------------------------------- */
  function init() {
    // --- login gate (demo) ---
    $('#gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      $('#gate').hidden = true;
      $('#app').hidden = false;
      renderAll();
    });

    $('#sign-out').addEventListener('click', function () {
      if (dirty) {
        askConfirm('Sign out with unsaved changes?',
          'Your edits have not been saved and will be lost.',
          'Sign out anyway',
          function () { closeModals(); location.reload(); });
        return;
      }
      location.reload();
    });

    // --- nav ---
    $$('.nav-btn[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-view')); });
    });
    $$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () {
        go(b.getAttribute('data-goto'));
        if (b.hasAttribute('data-add')) { openItemModal(null); }
      });
    });

    $('#menu-toggle').addEventListener('click', function () {
      var open = !$('#sidebar').classList.contains('is-open');
      $('#sidebar').classList.toggle('is-open', open);
      $('#scrim').hidden = !open;
      this.setAttribute('aria-expanded', String(open));
    });
    $('#scrim').addEventListener('click', closeSidebar);

    // --- save / discard ---
    $('#save').addEventListener('click', function () {
      if (!hoursValid()) {
        toast('Fix the closing times highlighted in red first.', 'err');
        go('hours');
        return;
      }
      commit();
    });
    $('#discard').addEventListener('click', function () {
      askConfirm('Discard your changes?',
        'Everything you have edited since the last save will be reverted.',
        'Discard changes',
        function () { closeModals(); discard(); });
    });

    // --- menu ---
    $('#add-item').addEventListener('click', function () { openItemModal(null); });
    $('#menu-list').addEventListener('click', onMenuClick);
    $('#cat-filter').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) { return; }
      filterCat = b.getAttribute('data-cat');
      renderMenu();
    });
    $('#menu-search').addEventListener('input', function () {
      searchTerm = this.value;
      renderMenu();
    });

    // --- item modal ---
    $('#item-form').addEventListener('submit', submitItem);
    $('#f-desc').addEventListener('input', function () {
      $('#f-desc-count').textContent = this.value.length;
    });

    // --- hours ---
    $('#hours-rows').addEventListener('change', onHoursChange);
    $('#hours-rows').addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-time')) { onHoursChange(e); }
    });
    $('#holiday-note').addEventListener('input', function () {
      draft.holidayNote = this.value;
      markDirty();
    });

    // --- export ---
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () { copyBlock(b.getAttribute('data-copy')); });
    });
    $('#download-json').addEventListener('click', downloadJson);
    $('#reset-all').addEventListener('click', function () {
      askConfirm('Reset everything?',
        'The menu and hours go back to the original content this site shipped with. ' +
        'Download a backup first if you might want these changes later.',
        'Reset everything',
        function () {
          TDG.clear();
          saved = TDG.defaults();
          draft = clone(saved);
          closeModals();
          markDirty();
          renderAll();
          toast('Reset to original content.');
        });
    });

    // --- modals ---
    $$('[data-close-modal]').forEach(function (b) {
      b.addEventListener('click', closeModals);
    });
    $('#confirm-ok').addEventListener('click', function () {
      var fn = confirmAction;
      closeModals();
      if (fn) { fn(); }
    });
    $$('.modal').forEach(function (m) {
      m.addEventListener('mousedown', function (e) {
        if (e.target === m) { closeModals(); }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('#item-modal').hidden || !$('#confirm-modal').hidden) { closeModals(); }
        else { closeSidebar(); }
      }
      // Ctrl/Cmd+S saves, like every other editor.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && hoursValid()) { commit(); }
      }
    });

    // Don't let someone close the tab on unsaved work.
    window.addEventListener('beforeunload', function (e) {
      if (!dirty) { return; }
      e.preventDefault();
      e.returnValue = '';
    });

    markDirty();
  }

  init();
})();
