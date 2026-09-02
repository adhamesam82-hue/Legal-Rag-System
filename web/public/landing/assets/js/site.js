/* ==========================================================================
   alsigil — page behaviour
   No dependencies. Every enhancement degrades to a readable static page:
   nothing here is required to see content, only to see it arrive well.
   ========================================================================== */
(() => {
  'use strict';

  /* --- Asset slots ------------------------------------------------------
     Drop real files at these paths and the page picks them up on next load.
     Until then the hero runs its authored ambient loop and the tour lightbox
     explains itself. See README.md. */
  const VIDEO = {
    hero: '/landing/assets/video/hero-loop.mp4',
    tour: '/landing/assets/video/tour.mp4',
    ctaTexture: '/landing/assets/video/cta-texture.mp4',
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isSmall = () => window.matchMedia('(max-width: 680px)').matches;

  /* ======================================================================
     Scroll reveal
     The hiding class goes on <html> from script, so a failure to run here
     leaves every section visible rather than blank.
     ====================================================================== */
  function initReveal() {
    const targets = $$('[data-reveal]');
    if (!targets.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('js-reveal');

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        // The hint has done its job; holding it pins a layer per section.
        entry.target.addEventListener('transitionend', () => {
          entry.target.style.willChange = 'auto';
        }, { once: true });
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

    targets.forEach((el) => io.observe(el));

    // Anything already above the fold at load reveals immediately, so the
    // first viewport is never mid-animation when the page becomes usable.
    requestAnimationFrame(() => {
      targets.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    });
  }

  /* ======================================================================
     Hero ambient loop — seven infinite animations, so they stop paying rent
     the moment the hero leaves the viewport.
     ====================================================================== */
  function initAmbient() {
    const bg = document.querySelector('.hero-bg');
    if (!bg || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      $$('.amb', bg).forEach((el) => {
        el.style.animationPlayState = entry.isIntersecting ? '' : 'paused';
      });
    }, { threshold: 0 });
    io.observe(bg);
  }

  /* ======================================================================
     Nav — condense on scroll, mobile drawer
     ====================================================================== */
  function initNav() {
    const nav = $('[data-nav]');
    const menu = $('[data-menu]');
    const openBtn = $('[data-menu-open]');
    if (!nav) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        nav.classList.toggle('is-stuck', window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!menu || !openBtn) return;

    const close = ({ restoreFocus = true } = {}) => {
      menu.classList.remove('is-open');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      window.setTimeout(() => { menu.hidden = true; }, 380);
      if (restoreFocus) openBtn.focus();
    };
    const open = () => {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      const first = $('a, button', menu);
      if (first) first.focus();
    };

    openBtn.addEventListener('click', open);
    $$('[data-menu-close]', menu).forEach((b) => b.addEventListener('click', close));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => close({ restoreFocus: false })));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) close();
    });
  }

  /* ======================================================================
     Tabs — shared by the platform overview and the feature section
     Roving tabindex, arrow-key navigation, Home/End.
     ====================================================================== */
  function wireTablist(list, tabs, panels, onSelect) {
    const select = (index) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (onSelect) onSelect(index);
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        const last = tabs.length - 1;
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = last;
        if (next === null) return;
        e.preventDefault();
        select(next);
        tabs[next].focus();
      });
    });

    return select;
  }

  function initOverviewTabs() {
    const root = $('[data-tabs="overview"]');
    if (!root) return;
    const tabs = $$('.tab', root);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    if (panels.some((p) => !p)) return;
    const select = wireTablist(root, tabs, panels);
    select(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));
  }

  /* ======================================================================
     Features — tabs on desktop, accordion below 900px
     The panels' children are wrapped once so the accordion can animate a
     grid-row collapse; the same wrapper carries the two-column desktop grid.
     ====================================================================== */
  function initFeatures() {
    const root = $('[data-tabs="features"]');
    if (!root) return;

    const tabs = $$('.feat-tab', root);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    if (panels.some((p) => !p)) return;

    // Wrap panel children once.
    panels.forEach((panel) => {
      if ($('.feat-inner', panel)) return;
      const inner = document.createElement('div');
      inner.className = 'feat-inner';
      while (panel.firstChild) inner.appendChild(panel.firstChild);
      panel.appendChild(inner);
    });

    // Build one accordion header per panel, kept in the DOM and shown by CSS
    // only in accordion mode.
    const headers = panels.map((panel, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'feat-acc';
      btn.id = `facc-${i + 1}`;
      btn.setAttribute('aria-controls', panel.id);
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML =
        `<span>${tabs[i].textContent.trim()}</span>` +
        `<svg class="ico" aria-hidden="true"><use href="#i-chev-d"/></svg>`;
      panel.parentNode.insertBefore(btn, panel);
      btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        headers.forEach((h, j) => {
          const on = j === i && !isOpen;
          h.setAttribute('aria-expanded', String(on));
          panels[j].classList.toggle('is-open', on);
        });
      });
      return btn;
    });

    const selectTab = wireTablist(root, tabs, panels);
    selectTab(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));

    const bp = window.matchMedia(`(max-width: ${root.dataset.accordionBelow || 900}px)`);
    let accordion = null;

    const applyMode = () => {
      const wantAccordion = bp.matches;
      if (wantAccordion === accordion) return;
      accordion = wantAccordion;

      if (accordion) {
        root.classList.add('is-acc');
        panels.forEach((p, i) => {
          p.hidden = false;
          p.removeAttribute('role');
          p.setAttribute('aria-labelledby', headers[i].id);
          const open = i === 0;
          p.classList.toggle('is-open', open);
          headers[i].setAttribute('aria-expanded', String(open));
        });
        tabs.forEach((t) => { t.tabIndex = -1; });
      } else {
        root.classList.remove('is-acc');
        panels.forEach((p, i) => {
          p.setAttribute('role', 'tabpanel');
          p.setAttribute('aria-labelledby', tabs[i].id);
          p.classList.remove('is-open');
        });
        selectTab(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));
      }
    };

    applyMode();
    bp.addEventListener('change', applyMode);
  }

  /* ======================================================================
     Count-up
     ====================================================================== */
  function initCounters() {
    const nodes = $$('[data-count]');
    if (!nodes.length) return;

    const format = (value, node) => {
      const rounded = Math.round(value);
      const text = node.dataset.format === 'thousands'
        ? rounded.toLocaleString('en-US')
        : String(rounded);
      return text + (node.dataset.suffix || '');
    };

    const run = (node) => {
      const target = Number(node.dataset.count);
      if (!Number.isFinite(target)) return;
      if (reduceMotion.matches) { node.textContent = format(target, node); return; }

      const duration = 1500;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        // Exponential ease-out, matching the page's motion curve.
        const eased = 1 - Math.pow(2, -10 * t);
        node.textContent = format(target * (t === 1 ? 1 : eased), node);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    nodes.forEach((n) => io.observe(n));
  }

  /* ======================================================================
     Marquee — duplicate the track so the -50% loop is seamless
     ====================================================================== */
  function initMarquee() {
    const marquee = $('[data-marquee]');
    if (!marquee) return;
    const track = $('.marquee-track', marquee);
    if (!track || track.dataset.doubled) return;
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    while (clone.firstChild) track.appendChild(clone.firstChild);
    track.dataset.doubled = '1';
  }

  /* ======================================================================
     Insights carousel
     ====================================================================== */
  function initCarousel() {
    const rail = $('[data-carousel]');
    const prev = $('[data-carousel-prev]');
    const next = $('[data-carousel-next]');
    if (!rail || !prev || !next) return;

    const step = () => {
      const card = $('.ins-card', rail);
      if (!card) return rail.clientWidth * 0.8;
      const gap = parseFloat(getComputedStyle($('.ins-track', rail)).columnGap) || 16;
      return card.getBoundingClientRect().width + gap;
    };

    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    };

    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ======================================================================
     Hero parallax and settle
     The mockup arrives tilted and levels off as it scrolls into place, then
     drifts slower than the page. Both are skipped under reduced motion and
     on phones, where the perspective is switched off in CSS anyway.
     ====================================================================== */
  function initParallax() {
    const el = $('[data-parallax]');
    if (!el || reduceMotion.matches) return;

    const depth = parseFloat(el.dataset.parallax) || 0.05;
    let ticking = false;

    const update = () => {
      ticking = false;
      if (isSmall()) { el.style.transform = ''; return; }

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the panel's top edge is a viewport down, 1 once it has settled.
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.85)));
      const tilt = 9 * (1 - p);
      const shift = -(vh - rect.top) * depth;
      el.style.transform =
        `translate3d(0, ${shift.toFixed(1)}px, 0) rotateX(${tilt.toFixed(2)}deg) rotateZ(${(-0.5 * (1 - p)).toFixed(2)}deg)`;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ======================================================================
     Background video
     The poster and the authored ambient loop are the default state. A film
     is fetched only when one exists, the viewport is not a phone, and the
     visitor has not asked for reduced motion — then it fades in over the
     loop once it can actually play.
     ====================================================================== */
  function loadBackgroundVideo(el, src) {
    if (!el || !src) return;
    if (reduceMotion.matches || isSmall()) return;

    el.addEventListener('canplay', () => {
      el.classList.add('is-ready');
      const play = el.play();
      if (play && typeof play.catch === 'function') play.catch(() => {});
    }, { once: true });

    // A missing file is the expected state before the film is produced: leave
    // the authored loop running and say nothing.
    el.addEventListener('error', () => { el.removeAttribute('src'); }, { once: true });

    el.preload = 'auto';
    el.src = src;
  }

  function initVideos() {
    loadBackgroundVideo($('[data-hero-video]'), VIDEO.hero);
    loadBackgroundVideo($('[data-cta-video]'), VIDEO.ctaTexture);
  }

  /* ======================================================================
     Tour lightbox
     ====================================================================== */
  function initLightbox() {
    const box = $('[data-lightbox]');
    const openers = $$('[data-lightbox-open]');
    if (!box || !openers.length) return;

    const video = $('[data-tour-video]', box);
    const fallback = $('[data-tour-fallback]', box);
    const inner = $('.lightbox-inner', box);
    let lastFocus = null;
    let sourceTried = false;

    const focusables = () =>
      $$('a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])', inner)
        .filter((el) => el.offsetParent !== null);

    const tryTourSource = () => {
      if (sourceTried || !video) return;
      sourceTried = true;
      video.addEventListener('loadeddata', () => {
        if (fallback) fallback.hidden = true;
        const title = $('[data-tour-title]', box);
        if (title) title.textContent = 'alsigil — the two-minute tour';
        // The hero button names the film only now that one exists to play.
        $$('[data-tour-label]').forEach((el) => { el.textContent = 'Watch the 2-min tour'; });
      }, { once: true });
      video.addEventListener('error', () => { if (fallback) fallback.hidden = false; }, { once: true });
      video.src = VIDEO.tour;
    };

    const open = () => {
      lastFocus = document.activeElement;
      box.hidden = false;
      document.body.classList.add('is-locked');
      requestAnimationFrame(() => box.classList.add('is-open'));
      tryTourSource();
      const first = focusables()[0];
      if (first) first.focus();
    };

    const close = () => {
      box.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (video) { video.pause(); }
      window.setTimeout(() => { box.hidden = true; }, 380);
      if (lastFocus) lastFocus.focus();
    };

    openers.forEach((b) => b.addEventListener('click', open));
    $$('[data-lightbox-close]', box).forEach((b) => b.addEventListener('click', close));

    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // Keep focus inside the dialog while it is open.
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ======================================================================
     Newsletter
     Posts to whatever endpoint the form declares. With no endpoint declared
     the form refuses rather than congratulating the visitor on a subscription
     that was never recorded — a false confirmation is worse than none.
     ====================================================================== */
  function initNewsletter() {
    const form = $('[data-newsletter]');
    if (!form) return;
    const input = $('input[type="email"]', form);
    const msg = $('[data-newsletter-msg]', form);
    const button = $('button[type="submit"]', form);
    if (!input || !msg) return;

    const endpoint = form.dataset.endpoint;

    const say = (text, tone) => {
      msg.classList.remove('is-err', 'is-ok');
      if (tone) msg.classList.add(tone);
      msg.textContent = text;
    };

    async function send(value) {
      if (button) { button.disabled = true; button.textContent = 'Subscribing…'; }
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value }),
        });
        if (!res.ok) throw new Error(String(res.status));
        say('Check your inbox — confirm the address and you are on the list.', 'is-ok');
        form.reset();
      } catch {
        say('That did not go through. Try again, or email hello@legalos.com.', 'is-err');
      } finally {
        if (button) { button.disabled = false; button.textContent = 'Subscribe'; }
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      if (!value) {
        input.setAttribute('aria-invalid', 'true');
        say('Enter your work email so we know where to send it.', 'is-err');
        input.focus();
        return;
      }
      if (!valid) {
        input.setAttribute('aria-invalid', 'true');
        say(`“${value}” is not a valid email address. Check for a typo.`, 'is-err');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');

      if (!endpoint) {
        say('Signup is not connected yet. Email hello@legalos.com and we will add you.', 'is-err');
        return;
      }
      send(value);
    });

    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      say('');
    });
  }

  /* ======================================================================
     Optional images — a missing file reveals its authored fallback rather
     than a broken-image glyph.
     ====================================================================== */
  function initOptionalImages() {
    $$('[data-optional-img]').forEach((img) => {
      const drop = () => { img.style.display = 'none'; };
      img.addEventListener('error', drop, { once: true });
      if (img.complete && img.naturalWidth === 0) drop();
    });
  }

  /* ====================================================================== */
  function init() {
    initReveal();
    initAmbient();
    initNav();
    initOverviewTabs();
    initFeatures();
    initCounters();
    initMarquee();
    initCarousel();
    initParallax();
    initVideos();
    initLightbox();
    initNewsletter();
    initOptionalImages();
    // The tablists now own panel visibility, so the pre-init hide can go.
    document.documentElement.classList.remove('js-boot');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ------------------------------------------------------------------------
 * Language preference (T-036).
 *
 * Arabic is the root and English is /en. Clicking either switcher records
 * the choice; a later visit to "/" honours a recorded "en" by moving to
 * /en. The English page never redirects: a request for /en is explicit,
 * whatever was recorded, so a shared link opens what it says.
 *
 * localStorage rather than a cookie: nothing server-side reads this, and a
 * cookie would ride along on every API request for no reason.
 * ---------------------------------------------------------------------- */
(function () {
  var KEY = 'alsigil-lang';
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } }

  var links = document.querySelectorAll('a[hreflang="ar"], a[hreflang="en"]');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function (ev) {
      write(ev.currentTarget.getAttribute('hreflang'));
    });
  }

  var isRoot = location.pathname === '/' || location.pathname === '/index.html';
  if (isRoot && document.documentElement.lang === 'ar' && read() === 'en') {
    location.replace('/en');
  }
})();
