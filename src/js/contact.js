/**
 * contact.js — Jaipuria Symposium 2026
 * Standalone script for contact.html
 *
 * Covers:
 *  1.  Fonts ready  → reveals nav logo
 *  2.  Navbar active link + hamburger menu
 *  3.  Page transition overlay
 *  4.  Intersection Observer → .reveal → .in
 *  5.  Custom cursor with lerp ring
 *  6.  Info panel spotlight (CSS custom props)
 *  7.  Channel rows staggered entrance
 *  8.  Form card entrance animation
 *  9.  Magnetic submit button
 * 10.  Contact form  — validation, char counter, submission
 */

/* ─────────────────────────────────────────────────────────
   1.  FONTS READY — reveal nav logo text
───────────────────────────────────────────────────────── */
document.fonts.ready.then(() => {
  document.body.classList.add('fonts-ready');
});

/* ─────────────────────────────────────────────────────────
   2.  NAVBAR — active link highlight + hamburger toggle
───────────────────────────────────────────────────────── */
(function initNavbar() {
  // Mark current page link as active
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-overlay a').forEach((a) => {
    const href = (a.getAttribute('href') || '').split('/').pop();
    if (href === currentFile) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });

  // Hamburger open / close
  const hamburger = document.querySelector('.nav-hamburger');
  const overlay   = document.querySelector('.nav-overlay');
  if (!hamburger || !overlay) return;

  const spans = hamburger.querySelectorAll('span');

  function openMenu() {
    overlay.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    spans[0].style.transform = 'rotate(45deg) translate(4.5px, 4.5px)';
    spans[1].style.opacity   = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(4.5px, -4.5px)';
  }

  function closeMenu() {
    overlay.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    spans.forEach((s) => { s.style.transform = ''; s.style.opacity = ''; });
  }

  hamburger.addEventListener('click', () => {
    overlay.classList.contains('open') ? closeMenu() : openMenu();
  });

  // Close when any overlay link is clicked
  overlay.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
})();

/* ─────────────────────────────────────────────────────────
   3.  PAGE TRANSITION OVERLAY
───────────────────────────────────────────────────────── */
(function initPageTransition() {
  const overlay = document.querySelector('.page-transition-overlay');
  if (!overlay) return;

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (
      !href ||
      href.startsWith('http') ||
      href.startsWith('//') ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      anchor.target === '_blank'
    ) return;

    e.preventDefault();
    overlay.classList.add('leaving');
    setTimeout(() => { window.location.href = href; }, 460);
  });
})();

/* ─────────────────────────────────────────────────────────
   4.  INTERSECTION OBSERVER — .reveal → .in
───────────────────────────────────────────────────────── */
(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => io.observe(el));
})();

/* ─────────────────────────────────────────────────────────
   5.  CUSTOM CURSOR  (desktop / pointer devices only)
───────────────────────────────────────────────────────── */
(function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;

  const dot  = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mx = -200, my = -200;
  let rx = -200, ry = -200;

  // Dot follows immediately
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  // Ring follows with lerp
  (function lerp() {
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(lerp);
  })();

  // Expand ring on interactive elements
  const hoverSel = [
    'a', 'button', '[role="button"]',
    '.contact-channel', '.social-pill',
    '.form-input', '.form-textarea', '.form-select',
  ].join(',');

  document.querySelectorAll(hoverSel).forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });

  // Hide when mouse leaves the window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
  });
})();

/* ─────────────────────────────────────────────────────────
   6.  INFO PANEL SPOTLIGHT
       Drives --spot-x / --spot-y / --spot-opacity CSS vars
───────────────────────────────────────────────────────── */
(function initSpotlight() {
  const panel = document.querySelector('.contact-info-panel');
  if (!panel || window.matchMedia('(hover: none)').matches) return;

  panel.addEventListener('mousemove', (e) => {
    const r = panel.getBoundingClientRect();
    panel.style.setProperty('--spot-x',       `${((e.clientX - r.left) / r.width)  * 100}%`);
    panel.style.setProperty('--spot-y',       `${((e.clientY - r.top)  / r.height) * 100}%`);
    panel.style.setProperty('--spot-opacity', '1');
  });

  panel.addEventListener('mouseleave', () => {
    panel.style.setProperty('--spot-opacity', '0');
  });
})();

/* ─────────────────────────────────────────────────────────
   7.  CHANNEL ROWS — staggered entrance on scroll
───────────────────────────────────────────────────────── */
(function initChannelStagger() {
  const channels = document.querySelectorAll('.contact-channel');
  const wrap     = document.querySelector('.contact-channels');
  if (!wrap || !channels.length) return;

  // Start hidden
  channels.forEach((ch) => {
    ch.style.opacity   = '0';
    ch.style.transform = 'translateX(-20px)';
  });

  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;

    channels.forEach((ch, i) => {
      const delay = i * 0.09;
      ch.style.transition = `opacity .55s cubic-bezier(0.22,1,0.36,1) ${delay}s,
                              transform .55s cubic-bezier(0.22,1,0.36,1) ${delay}s`;
      requestAnimationFrame(() => {
        ch.style.opacity   = '1';
        ch.style.transform = 'translateX(0)';
      });
    });

    io.disconnect();
  }, { threshold: 0.2 });

  io.observe(wrap);
})();

/* ─────────────────────────────────────────────────────────
   8.  FORM CARD ENTRANCE
───────────────────────────────────────────────────────── */
(function initFormCardEntrance() {
  const card = document.querySelector('.form-card');
  if (!card) return;

  card.style.opacity   = '0';
  card.style.transform = 'translateY(32px)';

  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    card.style.transition = 'opacity .9s cubic-bezier(0.22,1,0.36,1), transform .9s cubic-bezier(0.22,1,0.36,1)';
    requestAnimationFrame(() => {
      card.style.opacity   = '1';
      card.style.transform = 'translateY(0)';
    });
    io.disconnect();
  }, { threshold: 0.1 });

  io.observe(card);
})();

/* ─────────────────────────────────────────────────────────
   9.  MAGNETIC SUBMIT BUTTON
───────────────────────────────────────────────────────── */
(function initMagnetic() {
  const wrap = document.querySelector('.magnetic-wrap');
  const btn  = wrap?.querySelector('.btn-submit');
  if (!wrap || !btn || window.matchMedia('(hover: none)').matches) return;

  wrap.addEventListener('mousemove', (e) => {
    const r  = wrap.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width  / 2);
    const dy = e.clientY - (r.top  + r.height / 2);
    btn.style.transition = 'transform .2s ease';
    btn.style.transform  = `translate(${dx * 0.35}px, ${dy * 0.35}px)`;
  });

  wrap.addEventListener('mouseleave', () => {
    btn.style.transition = 'transform .65s cubic-bezier(0.34, 1.56, 0.64, 1)';
    btn.style.transform  = 'translate(0, 0)';
  });
})();

/* ─────────────────────────────────────────────────────────
   10. CONTACT FORM
       — blur validation
       — character counter
       — loading state on submit
       — Supabase Edge Function stub (swap console.log for real call)
───────────────────────────────────────────────────────── */
(function initContactForm() {
  const form     = document.querySelector('#contactForm');
  if (!form) return;

  const fName    = form.querySelector('#fieldName');
  const fEmail   = form.querySelector('#fieldEmail');
  const fSubject = form.querySelector('#fieldSubject');
  const fMsg     = form.querySelector('#fieldMessage');
  const btnSub   = form.querySelector('#btnSubmit');
  const feedback = form.querySelector('#formFeedback');
  const charEl   = form.querySelector('#charCount');

  // ── helpers ──────────────────────────────────
  const getGroup   = (el) => el?.closest('.form-group');

  const setError = (el, msg) => {
    const g = getGroup(el);
    if (!g) return;
    g.classList.add('is-error');
    g.classList.remove('is-valid');
    const span = g.querySelector('.form-error-msg');
    if (span) span.textContent = msg;
  };

  const setValid = (el) => {
    const g = getGroup(el);
    if (!g) return;
    g.classList.remove('is-error');
    g.classList.add('is-valid');
  };

  const clearState = (el) => {
    const g = getGroup(el);
    if (!g) return;
    g.classList.remove('is-error', 'is-valid');
  };

  // ── validators ───────────────────────────────
  const validate = {
    name:    (v) => !v.trim()                              ? 'Name is required.'
                  : v.trim().length < 2                    ? 'Enter your full name.'
                  : null,
    email:   (v) => !v.trim()                              ? 'Email is required.'
                  : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email address.'
                  : null,
    subject: (v) => !v                                     ? 'Please select a subject.'
                  : null,
    message: (v) => !v.trim()                              ? 'Message cannot be empty.'
                  : v.trim().length < 20                   ? 'Please write at least 20 characters.'
                  : v.trim().length > 1200                 ? 'Maximum 1200 characters.'
                  : null,
  };

  // ── blur-time validation ──────────────────────
  [
    [fName,    'name'],
    [fEmail,   'email'],
    [fSubject, 'subject'],
    [fMsg,     'message'],
  ].forEach(([el, key]) => {
    if (!el) return;
    el.addEventListener('blur',  () => {
      const err = validate[key](el.value);
      err ? setError(el, err) : setValid(el);
    });
    el.addEventListener('focus', () => clearState(el));
  });

  // ── character counter ─────────────────────────
  const MAX_CHARS = 1200;
  if (fMsg && charEl) {
    fMsg.addEventListener('input', () => {
      const len = fMsg.value.length;
      charEl.textContent = `${len} / ${MAX_CHARS}`;
      charEl.classList.toggle('near-limit', len > MAX_CHARS * 0.85);
    });
  }

  // ── feedback banner ───────────────────────────
  function showFeedback(type, title, desc) {
    if (!feedback) return;
    feedback.className = `form-feedback ${type}`;

    const iconEl  = feedback.querySelector('.feedback-icon');
    const titleEl = feedback.querySelector('.feedback-title');
    const descEl  = feedback.querySelector('.feedback-desc');

    if (titleEl) titleEl.textContent = title;
    if (descEl)  descEl.textContent  = desc;

    if (iconEl) {
      iconEl.innerHTML = type === 'success'
        ? '<polyline points="20 6 9 17 4 12"></polyline>'
        : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    }

    requestAnimationFrame(() => feedback.classList.add('visible'));
  }

  function hideFeedback() {
    if (feedback) feedback.classList.remove('visible');
  }

  // ── submit handler ────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    // Full validation pass
    const errN = validate.name(fName?.value    || '');
    const errE = validate.email(fEmail?.value  || '');
    const errS = validate.subject(fSubject?.value || '');
    const errM = validate.message(fMsg?.value  || '');

    errN ? setError(fName,    errN) : setValid(fName);
    errE ? setError(fEmail,   errE) : setValid(fEmail);
    errS ? setError(fSubject, errS) : setValid(fSubject);
    errM ? setError(fMsg,     errM) : setValid(fMsg);

    if (errN || errE || errS || errM) return;

    // Loading state
    if (btnSub) { btnSub.classList.add('is-loading'); btnSub.disabled = true; }

    const payload = {
      name:    fName?.value.trim(),
      email:   fEmail?.value.trim(),
      subject: fSubject?.value,
      message: fMsg?.value.trim(),
    };

    try {
      /* ── PRODUCTION: replace the block below with your real call ──────
       *
       * Option A — Supabase Edge Function (recommended):
       *   import { supabase } from './supabase.js';
       *   const { error } = await supabase.functions.invoke('send-contact-email', { body: payload });
       *   if (error) throw new Error(error.message);
       *
       * Option B — Direct Resend API (dev / server-side only):
       *   const res = await fetch('https://api.resend.com/emails', {
       *     method: 'POST',
       *     headers: { 'Content-Type': 'application/json', Authorization: 'Bearer YOUR_KEY' },
       *     body: JSON.stringify({
       *       from: 'contact@jaipuriasymposium.com',
       *       to:   'admin@jaipuriasymposium.com',
       *       subject: `[JS2026] ${payload.subject} — ${payload.name}`,
       *       html: `<p>${payload.message}</p>`,
       *     }),
       *   });
       *   if (!res.ok) throw new Error('Email service error');
       *
       * ──────────────────────────────────────────────────────────────── */

      // Placeholder — remove in production
      console.log('[contact.js] Form payload:', payload);
      await new Promise((resolve) => setTimeout(resolve, 1400));

      // Success
      showFeedback(
        'success',
        'Message sent successfully.',
        "We'll get back to you within 24 hours. Thank you for reaching out."
      );
      form.reset();
      [fName, fEmail, fSubject, fMsg].forEach(clearState);
      if (charEl) charEl.textContent = `0 / ${MAX_CHARS}`;

    } catch (err) {
      console.error('[contact.js] Submission error:', err);
      showFeedback(
        'error',
        'Failed to send message.',
        'Something went wrong. Please try again or email us directly.'
      );
    } finally {
      if (btnSub) { btnSub.classList.remove('is-loading'); btnSub.disabled = false; }
    }
  });
})();
