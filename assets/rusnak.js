/* ============================================================
   RUSNAK - skrypt wspolny serwisu.
   Nawigacja, menu mobilne z zarzadzaniem fokusem, kotwice,
   scroll reveal, akordeon FAQ, filtr lokalizacji,
   formularze demonstracyjne i znaczniki zdarzen analitycznych.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* polska odmiana liczebnikow: 1 pole, 2-4 pola, 5+ pol */
  function odmiana(n, jeden, kilka, wiele) {
    if (n === 1) return jeden;
    var d = n % 10, s = n % 100;
    return (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? kilka : wiele;
  }

  /* ============ ANALITYKA: same znaczniki, bez podpietego konta ============ */

  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    if (!name) return;
    window.dataLayer.push(Object.assign({ event: name }, params || {}));
    if (window.RUSNAK_DEBUG) console.debug('[analytics]', name, params || {});
  }
  window.rusnakTrack = track;

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;
    track(el.dataset.event, {
      label: (el.textContent || '').trim().slice(0, 60),
      gateway: el.dataset.gateway || undefined,
      category: el.dataset.category || undefined
    });
  });

  if ('IntersectionObserver' in window) {
    var viewIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { track(en.target.dataset.eventView); viewIo.unobserve(en.target); }
      });
    }, { threshold: .25 });
    $$('[data-event-view]').forEach(function (el) { viewIo.observe(el); });
  }

  /* ============ NAGLOWEK ============ */

  (function () {
    var nav = $('.rk-nav');
    if (!nav) return;
    var ticking = false;
    function apply() { nav.classList.toggle('is-stuck', window.scrollY > 40); ticking = false; }
    apply();
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(apply); ticking = true; }
    }, { passive: true });
  })();

  /* ============ MENU MOBILNE + FOKUS ============ */

  (function () {
    var toggle = $('.rk-nav__toggle');
    var wrap = $('.rk-nav__wrap');
    if (!toggle || !wrap) return;
    var ico = $('.rk-icon', toggle);
    var lastFocus = null;

    function focusable() {
      return $$('a[href], button:not([disabled]), select, input, textarea', wrap)
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function setState(open) {
      wrap.classList.toggle('is-open', open);
      toggle.classList.toggle('is-open', open);
      if (ico) { ico.classList.toggle('i-menu', !open); ico.classList.toggle('i-x', open); }
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { lastFocus = document.activeElement; var f = focusable(); if (f[0]) f[0].focus(); }
      else if (lastFocus) { lastFocus.focus(); }
    }

    toggle.addEventListener('click', function () { setState(!wrap.classList.contains('is-open')); });
    wrap.addEventListener('click', function (e) { if (e.target.closest('a')) setState(false); });

    document.addEventListener('keydown', function (e) {
      if (!wrap.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setState(false); return; }
      if (e.key !== 'Tab') return;
      var f = focusable().concat([toggle]);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024 && wrap.classList.contains('is-open')) setState(false);
    });
  })();

  /* ============ PODMENU PIEKARNI (mysz + klawiatura) ============ */

  (function () {
    $$('.rk-nav__item.has-sub').forEach(function (item) {
      var btn = $('.rk-nav__more', item);
      var sub = $('.rk-nav__sub', item);
      if (!btn || !sub) return;

      function open(state) {
        sub.classList.toggle('is-open', state);
        btn.setAttribute('aria-expanded', state ? 'true' : 'false');
      }
      btn.addEventListener('click', function () { open(btn.getAttribute('aria-expanded') !== 'true'); });
      item.addEventListener('mouseenter', function () { if (window.innerWidth > 1024) open(true); });
      item.addEventListener('mouseleave', function () { if (window.innerWidth > 1024) open(false); });
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) open(false);
      });
      item.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); btn.focus(); } });
    });
  })();

  /* ============ NAWIGACJA KOTWICOWA ============ */

  (function () {
    var links = $$('.rk-anchors a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = new Map();
    links.forEach(function (a) {
      var el = document.querySelector(a.getAttribute('href'));
      if (el) map.set(el, a);
    });
    var visible = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.set(en.target, en.intersectionRatio);
        else visible.delete(en.target);
      });
      var best = null, r = 0;
      visible.forEach(function (v, el) { if (v > r) { r = v; best = el; } });
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (best && map.get(best)) map.get(best).classList.add('is-active');
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, .2, .5, .8] });
    map.forEach(function (_, el) { io.observe(el); });
  })();

  /* ============ SCROLL REVEAL ============ */

  (function () {
    var titles = $$('.rk-title:not([data-no-split]), .rk-quote:not([data-no-split])');

    if (reduced) { $$('[data-reveal]').forEach(function (el) { el.classList.add('is-visible'); }); return; }

    $$('[data-reveal-delay]').forEach(function (el) {
      el.style.setProperty('--reveal-delay', el.dataset.revealDelay);
    });

    titles.forEach(function (title) {
      if ($('.rk-word', title)) return;
      var parts = title.innerHTML.split(/(<br\s*\/?>)/i);
      title.innerHTML = parts.map(function (part) {
        if (/^<br/i.test(part)) return part;
        if (/<mark|<em|<span/i.test(part)) return part;
        return part.split(/\s+/).filter(Boolean).map(function (w) {
          return '<span class="rk-word"><span>' + w + '</span></span>';
        }).join(' ');
      }).join('');
      $$('.rk-word', title).forEach(function (w, i) {
        w.firstElementChild.style.setProperty('--word-i', i);
      });
    });

    if (!('IntersectionObserver' in window)) {
      $$('[data-reveal], .rk-word').forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        $$('.rk-word', en.target).forEach(function (w) { w.classList.add('is-visible'); });
        io.unobserve(en.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
    titles.forEach(function (el) { io.observe(el); });

    window.requestAnimationFrame(function () {
      $$('.rk-hero [data-reveal], .rk-pagehero [data-reveal]').forEach(function (el, i) {
        window.setTimeout(function () {
          el.classList.add('is-visible');
          $$('.rk-word', el).forEach(function (w) { w.classList.add('is-visible'); });
        }, 100 + i * 100);
      });
      $$('.rk-hero .rk-title, .rk-pagehero .rk-title, .rk-hero__tagline').forEach(function (el) {
        el.classList.add('is-visible');
        $$('.rk-word', el).forEach(function (w) { w.classList.add('is-visible'); });
      });
    });
  })();

  /* ============ PLYWAJACE SYGNETY: wjazd + parallax ============ */

  (function () {
    var floats = $$('.rk-float');
    var hero = $('.rk-hero__sygnet');
    var all = floats.concat(hero ? [hero] : []);
    if (!all.length) return;

    /* wjazd, gdy element wchodzi w kadr */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) en.target.classList.add('is-in'); });
      }, { threshold: 0, rootMargin: '300px 0px 300px 0px' });
      floats.forEach(function (el) { io.observe(el); });
      /* awaryjnie: element schowany poza kadrem w poziomie nigdy nie zglosi przeciecia */
      window.setTimeout(function () {
        floats.forEach(function (el) { el.classList.add('is-in'); });
      }, 2600);
    } else {
      floats.forEach(function (el) { el.classList.add('is-in'); });
    }

    if (reduced) return;

    var data = [];
    var MAX = 200;
    var ticking = false;
    var startY = window.scrollY;

    function measure() {
      data = all.map(function (el) {
        var prev = el.style.transform;
        el.style.transform = 'none';
        var r = el.getBoundingClientRect();
        var center = r.top + window.scrollY + r.height / 2;
        var speed = parseFloat(el.dataset.parallax || '0.18');
        /* punkt zerowy liczymy od pozycji przy wejsciu na strone,
           zeby nic nie skakalo przy pierwszym renderze */
        var base = -(center - (startY + window.innerHeight / 2)) * speed;
        el.style.transform = prev;
        return { el: el, center: center, speed: speed, base: base };
      });
    }

    function update() {
      var vh = window.innerHeight, sy = window.scrollY;
      data.forEach(function (d) {
        var shift = (-(d.center - (sy + vh / 2)) * d.speed) - d.base;
        if (shift > MAX) shift = MAX;
        if (shift < -MAX) shift = -MAX;
        d.el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      });
      ticking = false;
    }

    function init() { measure(); update(); }
    init();
    if (document.readyState !== 'complete') window.addEventListener('load', init, { once: true });
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', function () { startY = window.scrollY; init(); });
  })();

  /* ============ AKORDEON FAQ ============ */

  (function () {
    $$('.rk-faq__btn').forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.hidden = open;
      });
    });
    document.addEventListener('keydown', function (e) {
      var btn = e.target.closest && e.target.closest('.rk-faq__btn');
      if (!btn) return;
      var all = $$('.rk-faq__btn');
      var i = all.indexOf(btn);
      if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); all[(i - 1 + all.length) % all.length].focus(); }
      if (e.key === 'Home') { e.preventDefault(); all[0].focus(); }
      if (e.key === 'End') { e.preventDefault(); all[all.length - 1].focus(); }
    });
  })();

  /* ============ FILTR LOKALIZACJI ============ */

  (function () {
    var filter = $('[data-location-filter]');
    var list = $('[data-location-list]');
    var empty = $('[data-location-empty]');
    if (!filter || !list) return;
    var select = $('select', filter);
    var count = $('.rk-filter__count', filter);
    var items = $$('[data-city]', list);

    function apply() {
      var v = select.value;
      var shown = 0;
      items.forEach(function (el) {
        var ok = !v || el.dataset.city === v;
        el.hidden = !ok;
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
      if (count) count.textContent = shown + ' ' + odmiana(shown, 'miejsce', 'miejsca', 'miejsc');
    }
    select.addEventListener('change', apply);
    apply();
  })();

  /* ============ FORMULARZE DEMONSTRACYJNE ============ */

  (function () {
    var params = new URLSearchParams(window.location.search);
    var forcedState = params.get('stan'); /* ?stan=sukces | blad | wysylanie - podglad stanow */

    $$('[data-form]').forEach(function (form) {
      var wrap = document.getElementById(form.id + '-wrap') || form.parentElement;
      var success = $('.rk-form__success', wrap);
      var global = $('.rk-form__global', form);
      var started = false;

      form.addEventListener('input', function () {
        if (started) return;
        started = true;
        track(form.dataset.eventStart);
      }, { once: false });

      function fieldOf(input) { return input.closest('.rk-field'); }

      function setError(input, msg) {
        var field = fieldOf(input);
        if (!field) return;
        field.classList.add('has-error');
        var box = $('.rk-field__error', field);
        if (box) { box.textContent = msg; box.hidden = false; }
        input.setAttribute('aria-invalid', 'true');
      }

      function clearError(input) {
        var field = fieldOf(input);
        if (!field) return;
        field.classList.remove('has-error');
        var box = $('.rk-field__error', field);
        if (box) { box.textContent = ''; box.hidden = true; }
        input.removeAttribute('aria-invalid');
      }

      function validate() {
        var errors = [];
        $$('.rk-field', form).forEach(function (field) {
          $$('input, select, textarea', field).forEach(clearError);
        });
        if (global) { global.hidden = true; global.textContent = ''; }

        /* pola wymagane */
        $$('[required]', form).forEach(function (input) {
          var empty = input.type === 'checkbox' ? !input.checked
            : input.type === 'radio' ? !form.querySelector('input[name="' + input.name + '"]:checked')
            : !String(input.value).trim();
          if (empty) { setError(input, 'To pole jest wymagane.'); errors.push(input); }
        });

        /* data nie z przeszlosci */
        var date = $('input[type=date]', form);
        if (date && date.value) {
          var today = new Date(); today.setHours(0, 0, 0, 0);
          if (new Date(date.value) < today) { setError(date, 'Termin nie może być z przeszłości.'); errors.push(date); }
        }

        /* e-mail albo telefon */
        var tel = form.querySelector('input[type=tel]');
        var mail = form.querySelector('input[type=email]');
        if (tel && mail && !tel.value.trim() && !mail.value.trim()) {
          setError(tel, 'Podaj telefon albo e-mail.');
          setError(mail, 'Podaj telefon albo e-mail.');
          errors.push(tel);
        }
        if (mail && mail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) {
          setError(mail, 'Sprawdź adres e-mail.'); errors.push(mail);
        }

        return errors;
      }

      function showSending() { form.classList.add('is-sending'); }
      function stopSending() { form.classList.remove('is-sending'); }

      function showSuccess() {
        stopSending();
        form.hidden = true;
        var demo = $('.rk-formdemo', wrap);
        if (demo) demo.hidden = true;
        if (success) { success.hidden = false; success.focus && success.focus(); }
        track(form.dataset.eventSubmit, { demo: true });
      }

      function showGlobalError(msg) {
        stopSending();
        if (!global) return;
        global.textContent = msg;
        global.hidden = false;
        global.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var errors = validate();
        if (errors.length) {
          showGlobalError('Popraw ' + errors.length + ' ' + odmiana(errors.length, 'pole', 'pola', 'pól') + ' i wyślij ponownie.');
          errors[0].focus();
          return;
        }
        showSending();
        /* TODO: integracja wysylki. W tym etapie nic nie wychodzi na zewnatrz. */
        window.setTimeout(showSuccess, 900);
      });

      $$('[data-form-reset]', wrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          form.reset();
          form.hidden = false;
          var demo = $('.rk-formdemo', wrap);
          if (demo) demo.hidden = false;
          if (success) success.hidden = true;
          form.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
        });
      });

      /* podglad stanow: index.html?stan=sukces */
      if (forcedState === 'sukces') showSuccess();
      if (forcedState === 'wysylanie') showSending();
      if (forcedState === 'blad') {
        showGlobalError('Nie udało się wysłać. Spróbuj ponownie za chwilę.');
        var first = $('input[required], select[required], textarea[required]', form);
        if (first) setError(first, 'To pole jest wymagane.');
      }
    });
  })();
})();
