(() => {
  'use strict';

  /* ---------- CONFIG: fill these in with real contact details ---------- */
  const CONFIG = {
    email: 'info@kalpanaaasoftwaresolutions.in', // fallback mailto if the API is down
    apiUrl: '/api/contact',  // same-origin when served by server/; use the full URL if the API is hosted elsewhere
    chatUrl: '/api/chat'
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pad = (n, l = 4) => String(Math.max(0, Math.round(n))).padStart(l, '0');
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } } };

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Text decode effect ---------- */
  const GLYPHS = '01<>/\\_[]{}#$%&*+=';
  const decode = (el, text, frames = 26) => {
    if (reduceMotion) { el.textContent = text; return; }
    let f = 0;
    const step = () => {
      const p = f / frames;
      el.textContent = [...text].map((ch, i) => ch === ' ' || i < text.length * p ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');
      if (f++ < frames) requestAnimationFrame(step); else el.textContent = text;
    };
    step();
  };
  const scramble = el => decode(el, el.dataset.final || (el.dataset.final = el.textContent), 28);

  /* ---------- Section tracking: nav, HUD ---------- */
  const SECTION_NAMES = { top: 'HOME', apps: 'MOBILE APPS', chatbots: 'AI CHATBOTS', web: 'WEB PLATFORMS', stack: 'TECH STACK', services: 'SERVICES', process: 'PROCESS', contact: 'CONTACT' };
  const navAnchors = $$('.nav-links a[href^="#"]:not(.btn)');
  const trackIds = ['apps', 'chatbots', 'web', 'stack', 'services', 'process', 'contact'];
  const trackEls = trackIds.map(id => document.getElementById(id));
  const nav = $('#nav'), progress = $('#progress');
  const hudL = $('#hudL'), hudR = $('#hudR');
  const hud = { x: 0, y: 0, scr: 0, sec: 'top', dirty: false };
  const paintHud = () => {
    hud.dirty = false;
    if (hudL) hudL.textContent = `X ${pad(hud.x)}  Y ${pad(hud.y)}  SCR ${pad(hud.scr, 3)}%`;
    if (hudR) hudR.textContent = `// ${SECTION_NAMES[hud.sec] || 'HOME'}`;
  };
  const queueHud = () => { if (!hud.dirty) { hud.dirty = true; requestAnimationFrame(paintHud); } };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? (y / max) * 100 : 0;
      nav.classList.toggle('scrolled', y > 30);
      progress.style.width = pct + '%';
      let current = 'top';
      trackEls.forEach(s => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id; });
      navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
      hud.scr = pct; hud.sec = current; queueHud();
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger'), navLinks = $('#navLinks');
  const setMenu = open => { navLinks.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); };
  burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  /* ---------- Reveal, counters, rotating headline (run after boot) ---------- */
  const initReveal = () => {
    const revealEls = $$('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          $$('.scramble', en.target).forEach(scramble);
          obs.unobserve(en.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach(el => io.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('in'));
    }
  };
  const initCounters = () => {
    $$('[data-count]').forEach(el => {
      const target = Number(el.dataset.count) || 0;
      if (reduceMotion) { el.textContent = target; return; }
      const start = performance.now() + 500, dur = 1400;
      const tick = now => {
        const p = Math.max(0, Math.min((now - start) / dur, 1));
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  const initRotator = () => {
    const el = $('#rot');
    if (!el || reduceMotion) return;
    const phrases = ['intelligent apps', 'WhatsApp chatbots', 'AI assistants', 'web platforms'];
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % phrases.length;
      el.dataset.text = phrases[i];
      decode(el, phrases[i], 20);
    }, 3200);
  };

  /* ---------- Boot sequence ---------- */
  const runBoot = done => {
    const boot = $('#boot'), log = $('#bootLog'), bar = $('#bootBar'), pctEl = $('#bootPct');
    const lines = ['> INITIALIZING KSS CORE', '> LOADING PROJECT MODULES', '> MOBILE APPS ........... OK', '> AI CHATBOTS ........... OK', '> WEB PLATFORMS ......... OK', '> SYSTEM READY'];
    let i = 0;
    const iv = setInterval(() => {
      if (i < lines.length) log.textContent += lines[i++] + '\n';
      const p = Math.round((i / lines.length) * 100);
      bar.style.width = p + '%'; pctEl.textContent = p + '%';
      if (i >= lines.length) {
        clearInterval(iv);
        setTimeout(() => {
          boot.classList.add('done');
          setTimeout(() => { root.classList.remove('booting'); store.set('kssBoot', '1'); done(); }, 650);
        }, 350);
      }
    }, 240);
  };
  const begin = () => { initReveal(); initCounters(); initRotator(); };
  if (root.classList.contains('booting')) runBoot(begin); else begin();

  /* ---------- Pointer effects (fine pointers only) ---------- */
  addEventListener('pointermove', e => { hud.x = e.clientX; hud.y = e.clientY; queueHud(); }, { passive: true });

  if (canHover && !reduceMotion) {
    // holographic screen tilt + spotlight
    document.addEventListener('pointermove', e => {
      const s = e.target.closest && e.target.closest('.shot');
      if (!s) return;
      const r = s.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      s.style.setProperty('--mx', (px * 100) + '%'); s.style.setProperty('--my', (py * 100) + '%');
      s.style.transform = `perspective(1000px) rotateY(${(px - 0.5) * 8}deg) rotateX(${-(py - 0.5) * 8}deg)`;
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const s = e.target.closest && e.target.closest('.shot');
      if (s && !s.contains(e.relatedTarget)) s.style.transform = '';
    });

    // magnetic buttons
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.28}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }

  /* ---------- Project consoles (tabs + auto-cycle + readouts) ---------- */
  $$('[data-console]').forEach(con => {
    const tabs = $$('[role="tab"]', con), panes = $$('[role="tabpanel"]', con);
    let idx = 0;
    con.dataset.auto = reduceMotion ? 'off' : 'on';
    con.classList.add('paused'); // resumes once visible

    panes.forEach((p, n) => {
      const holo = $('.holo', p), tag = $('.tag', p);
      if (!holo || !tag) return;
      const ro = document.createElement('div');
      ro.className = 'readout';
      [['PROJECT', `${pad(n + 1, 2)}/${pad(panes.length, 2)}`], ['CATEGORY', tag.textContent.trim()]].forEach(([k, v]) => {
        const s = document.createElement('span'), b = document.createElement('b');
        s.textContent = k + ' '; b.textContent = v; s.appendChild(b); ro.appendChild(s);
      });
      holo.appendChild(ro);
    });

    const select = (i, user) => {
      idx = (i + tabs.length) % tabs.length;
      tabs.forEach((t, n) => { t.setAttribute('aria-selected', String(n === idx)); t.tabIndex = n === idx ? 0 : -1; });
      panes.forEach((p, n) => p.classList.toggle('active', n === idx));
      if (user) con.dataset.auto = 'off';
    };
    tabs.forEach((t, n) => {
      t.addEventListener('click', () => select(n, true));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault(); select(idx + d, true); tabs[idx].focus();
      });
      $('.bar', t).addEventListener('animationend', () => { if (con.dataset.auto === 'on' && n === idx) select(idx + 1); });
    });

    let hovering = false, visible = false;
    const sync = () => con.classList.toggle('paused', hovering || !visible);
    con.addEventListener('pointerenter', () => { hovering = true; sync(); });
    con.addEventListener('pointerleave', () => { hovering = false; sync(); });
    con.addEventListener('focusin', () => { hovering = true; sync(); });
    con.addEventListener('focusout', () => { hovering = false; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }, { threshold: 0.35 }).observe(con);
    } else { visible = true; sync(); }
    document.addEventListener('lightbox', e => { hovering = e.detail; sync(); });
  });

  /* ---------- Ambient network background ---------- */
  (() => {
    const canvas = $('#bg'), ctx = canvas.getContext('2d');
    let W, H, pts = [], raf;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(60, Math.floor((W * H) / 30000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.4 + 0.5 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = 'rgba(31,92,255,.4)'; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
          if (d < 17000) {
            ctx.strokeStyle = `rgba(31,92,255,${0.13 * (1 - d / 17000)})`;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    resize();
    addEventListener('resize', resize);
    if (!reduceMotion) {
      draw();
      document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) draw(); });
    }
  })();

  /* ---------- 3D neural core (hero) ---------- */
  (() => {
    const cv = $('#orb');
    if (!cv) return;
    const c = cv.getContext('2d');
    const N = 230, ga = Math.PI * (3 - Math.sqrt(5));
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
      return { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
    });
    // each node links to its 3 nearest neighbours
    const edgeSet = new Set(), edges = [];
    pts.forEach((p, i) => {
      pts.map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
        .filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
        .forEach(o => { const k = i < o.j ? i + '-' + o.j : o.j + '-' + i; if (!edgeSet.has(k)) { edgeSet.add(k); edges.push([Math.min(i, o.j), Math.max(i, o.j)]); } });
    });
    const pulses = Array.from({ length: 18 }, () => ({ e: Math.floor(Math.random() * edges.length), t: Math.random(), s: 0.006 + Math.random() * 0.01 }));
    const rings = [{ tilt: 0.5, rad: 1.38, sp: 0.9 }, { tilt: -0.9, rad: 1.55, sp: -0.6 }, { tilt: 1.25, rad: 1.25, sp: 0.5 }];

    let w, h, cx, cy, R, dpr = Math.min(devicePixelRatio || 1, 2);
    let ay = 0, tx = 0, ty = 0, sx = 0, sy = 0, running = false, visible = true, raf;

    const fit = () => {
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height; cx = w / 2; cy = h / 2; R = Math.min(w, h) * 0.29;
      cv.width = w * dpr; cv.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const project = (x, y, z, cY, sY, cX, sX) => {
      const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
      const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const s = 1.8 / (1.8 - 0.6 * z2);
      return { x: cx + x1 * R * s, y: cy + y2 * R * s, z: z2, s };
    };

    const frame = time => {
      sx += (tx - sx) * 0.05; sy += (ty - sy) * 0.05;
      if (!reduceMotion) ay += 0.0032;
      const rotY = ay + sx * 0.9, rotX = 0.38 + sy * 0.5;
      const cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(rotX), sX = Math.sin(rotX);
      c.clearRect(0, 0, w, h);

      // core glow
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      g.addColorStop(0, 'rgba(0,184,230,.28)'); g.addColorStop(0.5, 'rgba(31,92,255,.1)'); g.addColorStop(1, 'rgba(31,92,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 1.5, 0, 6.283); c.fill();

      const P = pts.map(p => project(p.x, p.y, p.z, cY, sY, cX, sX));

      // links
      c.lineWidth = 1;
      for (const [a, b] of edges) {
        const A = P[a], B = P[b], depth = (A.z + B.z + 2) / 4;
        c.strokeStyle = `rgba(31,92,255,${0.05 + 0.4 * depth})`;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
      }

      // orbit rings with satellites
      rings.forEach((rg, k) => {
        const cT = Math.cos(rg.tilt), sT = Math.sin(rg.tilt);
        const ringPt = th => { const x = Math.cos(th) * rg.rad, z = Math.sin(th) * rg.rad; return project(x * cT, x * sT, z, cY, sY, cX, sX); };
        c.beginPath();
        for (let i = 0; i <= 90; i++) { const q = ringPt((i / 90) * 6.283); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }
        c.setLineDash([3, 7]); c.strokeStyle = 'rgba(0,150,205,.4)'; c.stroke(); c.setLineDash([]);
        const q = ringPt((time * 0.0004 * rg.sp) + k * 2);
        c.fillStyle = '#00b8e6'; c.shadowColor = '#00b8e6'; c.shadowBlur = 12;
        c.beginPath(); c.arc(q.x, q.y, 3.2 * q.s, 0, 6.283); c.fill(); c.shadowBlur = 0;
      });

      // nodes
      P.forEach((q, i) => {
        const depth = (q.z + 1) / 2, hot = i % 11 === 0;
        c.globalAlpha = 0.25 + 0.75 * depth;
        c.fillStyle = hot ? '#00b8e6' : '#1f5cff';
        c.beginPath(); c.arc(q.x, q.y, (hot ? 2.6 : 1.5) * q.s * (0.7 + depth * 0.6), 0, 6.283); c.fill();
      });
      c.globalAlpha = 1;

      // data pulses travelling along links
      pulses.forEach(p => {
        p.t += p.s;
        if (p.t >= 1) { p.t = 0; p.e = Math.floor(Math.random() * edges.length); }
        const [a, b] = edges[p.e], A = P[a], B = P[b];
        const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t, depth = ((A.z + B.z) / 2 + 1) / 2;
        c.globalAlpha = 0.35 + 0.65 * depth;
        c.fillStyle = '#00b8e6'; c.shadowColor = '#00b8e6'; c.shadowBlur = 10;
        c.beginPath(); c.arc(x, y, 2.6, 0, 6.283); c.fill();
      });
      c.shadowBlur = 0; c.globalAlpha = 1;

      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => { if (!running && !reduceMotion && visible && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    fit();
    frame(0);
    if (!reduceMotion) {
      new ResizeObserver(() => { fit(); if (!running) frame(0); }).observe(cv);
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(cv);
      document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
      cv.parentElement.addEventListener('pointermove', e => {
        const r = cv.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
      });
      cv.parentElement.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      start();
    } else {
      addEventListener('resize', () => { fit(); frame(0); });
    }
  })();

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbClose = $('#lbClose');
  let lastFocus = null;
  const openLb = el => {
    lastFocus = el;
    lbImg.src = el.dataset.zoom;
    lbImg.alt = el.dataset.caption || '';
    lbCap.textContent = el.dataset.caption || '';
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('open'));
    document.body.style.overflow = 'hidden';
    document.dispatchEvent(new CustomEvent('lightbox', { detail: true }));
    lbClose.focus();
  };
  const closeLb = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, 250);
    document.dispatchEvent(new CustomEvent('lightbox', { detail: false }));
    if (lastFocus) lastFocus.focus();
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-zoom]');
    if (t) openLb(t);
  });
  lb.addEventListener('click', e => { if (e.target === lb || e.target === lbClose) closeLb(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ---------- AI chat widget ---------- */
  (() => {
    const fab = $('#chatFab'), panel = $('#chatPanel'), body = $('#chatBody'), quick = $('#chatQuick');
    const formEl = $('#chatForm'), input = $('#chatText'), closeBtn = $('#chatClose');
    if (!fab || !panel || !body || !formEl) return;
    const sendBtn = formEl.querySelector('button[type="submit"]');
    const MAX_TURNS = 12; // server accepts at most 12 messages per request
    const QUICK = ['What do you build?', 'Show me your projects', 'I need a quote', 'How do you work?'];
    const history = [];   // [{ role: 'user' | 'assistant', content }]
    let busy = false, greeted = false;

    const stamp = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const addMsg = (who, text) => {
      const el = document.createElement('div');
      el.className = `msg ${who}`;
      const span = document.createElement('span'); span.textContent = text;   // textContent: model output is never parsed as HTML
      const time = document.createElement('time'); time.textContent = stamp();
      el.append(span, time);
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    };
    const addTyping = () => {
      const el = document.createElement('div');
      el.className = 'msg bot typing';
      el.setAttribute('aria-label', 'Assistant is typing');
      for (let i = 0; i < 3; i++) el.appendChild(document.createElement('i'));
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    };

    const greet = () => {
      if (greeted) return;
      greeted = true;
      addMsg('bot', "Hi! I'm the KSS AI assistant. Ask me about our apps, chatbots and web platforms, or tell me about your project idea.");
      QUICK.forEach(q => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = q;
        b.addEventListener('click', () => send(q));
        quick.appendChild(b);
      });
    };

    const fail = (status, text) => {
      history.pop();                 // drop the unanswered user turn so the history stays alternating
      input.value = text;            // let the visitor retry without retyping
      const why = status === 429 ? 'You are sending messages too quickly, so please wait a few minutes.'
        : status === 503 ? 'The assistant is unavailable right now.'
        : 'Sorry, I could not reach the assistant.';
      addMsg('bot', `${why} You can use the contact form below or email ${CONFIG.email}.`);
    };

    async function send(raw) {
      const text = String(raw || '').trim().slice(0, 600);
      if (!text || busy) return;
      busy = true; sendBtn.disabled = true; input.value = ''; quick.replaceChildren();
      addMsg('user', text);
      history.push({ role: 'user', content: text });
      const typing = addTyping();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 35000);
      try {
        // The server requires the first message to be from the user, so trim from the front accordingly.
        const msgs = history.slice(-MAX_TURNS);
        while (msgs.length && msgs[0].role !== 'user') msgs.shift();
        const res = await fetch(CONFIG.chatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs }),
          signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        typing.remove();
        if (res.ok && data.ok && data.reply) {
          addMsg('bot', data.reply);
          history.push({ role: 'assistant', content: data.reply });
        } else {
          fail(res.status, text);
        }
      } catch {
        typing.remove();
        fail(0, text);
      } finally {
        clearTimeout(timer); busy = false; sendBtn.disabled = false; input.focus();
      }
    }

    const isOpen = () => !panel.hidden && panel.classList.contains('open');
    const setOpen = open => {
      if (open) {
        panel.hidden = false;
        requestAnimationFrame(() => panel.classList.add('open'));
        greet();
        input.focus();
      } else {
        panel.classList.remove('open');
        setTimeout(() => { if (!panel.classList.contains('open')) panel.hidden = true; }, 250);
        fab.focus();
      }
      fab.setAttribute('aria-expanded', String(open));
    };

    fab.addEventListener('click', () => setOpen(!isOpen()));
    closeBtn.addEventListener('click', () => setOpen(false));
    $$('[data-open-chat]').forEach(b => b.addEventListener('click', () => setOpen(true)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) setOpen(false); });
    formEl.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  })();
  /* ---------- Contact form ---------- */
  const form = $('#leadForm'), note = $('#formNote');
  const submitBtn = $('#sendMsg');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const FIELD_MSG = { name: 'Please enter your name.', email: 'Please enter a valid email address.' };

  const val = k => String(form.elements[k].value || '').trim();
  const setNote = (text, state = '') => { note.textContent = text; note.dataset.state = state; };
  const markInvalid = names => {
    ['name', 'email'].forEach(k => form.elements[k].classList.toggle('invalid', names.includes(k)));
    if (names.length) { form.elements[names[0]].focus(); setNote(FIELD_MSG[names[0]], 'error'); }
  };
  // Email is required so the team can reply.
  const validate = () => {
    const bad = [];
    if (val('name').length < 2) bad.push('name');
    if (val('email').length > 254 || !EMAIL_RE.test(val('email'))) bad.push('email');
    markInvalid(bad);
    return bad.length === 0;
  };

  const mailText = () => [
    'Hello KSS team,',
    '',
    `Name: ${val('name')}`,
    `Company: ${val('company') || '-'}`,
    `Email: ${val('email')}`,
    `Interested in: ${val('interest')}`,
    '',
    val('message') || '(No additional details)'
  ].join('\r\n');
  const mailSubject = () => `Project enquiry: ${val('interest')} - ${val('name')}`;
  const mailtoUrl = () => `mailto:${CONFIG.email}?subject=${encodeURIComponent(mailSubject())}&body=${encodeURIComponent(mailText())}`;

  // No server needed: open the visitor's own email app with everything pre-filled; they just press Send.
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;
    if (val('website')) return; // honeypot: bots fill this hidden field
    window.location.href = mailtoUrl();
  });

  ['name', 'email'].forEach(k => form.elements[k].addEventListener('input', e => e.target.classList.remove('invalid')));})();


/* ===================== NAV v3 — gliding dash ===================== */
(function () {
  const links = document.getElementById('navLinks');
  const dash = document.getElementById('navDash');
  if (!links || !dash) return;
  const anchors = [...links.querySelectorAll('a[href^="#"]')];
  const getActive = () => anchors.find(a => a.classList.contains('active'));
  const place = a => {
    if (!a || innerWidth <= 980) { dash.classList.remove('on'); return; }
    dash.style.setProperty('--x', (a.offsetLeft + a.offsetWidth / 2 - 8) + 'px');
    dash.classList.add('on');
  };
  const settle = () => place(getActive());
  anchors.forEach(a => {
    a.addEventListener('pointerenter', () => place(a));
    a.addEventListener('focus', () => place(a));
    new MutationObserver(settle).observe(a, { attributes: true, attributeFilter: ['class'] });
  });
  links.addEventListener('pointerleave', settle);
  links.addEventListener('focusout', settle);
  addEventListener('resize', settle);
  const go = () => { settle(); requestAnimationFrame(() => requestAnimationFrame(() => dash.classList.add('ready'))); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
  addEventListener('load', settle);
})();


/* ===================== STACK EXPLORER v2 behaviour ===================== */
(function () {
  const map = document.getElementById('stackMap');
  const techCol = document.getElementById('techCol');
  const projCol = document.getElementById('projCol');
  if (!map || !techCol || !projCol) return;

  const PROJECTS = [
    { id: 'bbmp',    name: 'BBMP E-Governance Portal', tag: 'Governance', tech: ['Python', 'Django', 'React', 'JavaScript', 'HTML/CSS', 'REST APIs', 'Git'] },
    { id: 'medical', name: 'Kalpanaaa Medical',        tag: 'Healthcare', tech: ['React', 'TypeScript', 'Django', 'Tailwind CSS', 'HTML/CSS', 'REST APIs', 'Git'] },
    { id: 'finance', name: 'Kalpanaaa Finance',        tag: 'Finance',    tech: ['Java', 'Spring Boot', 'React', 'Tailwind CSS', 'HTML/CSS', 'REST APIs', 'Git'] },
    { id: 'edu',     name: 'Kalpanaaa Education',      tag: 'Education',  tech: ['React', 'Vite', 'Node.js', 'Express', 'HTML/CSS', 'REST APIs', 'Git'] },
    { id: 'nagara',  name: 'NAGARA',                   tag: 'Mobile App', tech: ['React Native', 'Expo', 'Expo Router', 'TypeScript', 'React Native Maps', 'Java', 'Spring Boot', 'Spring Security', 'JPA / Hibernate', 'PostgreSQL', 'Redis', 'Flyway', 'JWT', 'Cloudinary', 'Twilio', 'Docker', 'REST APIs'] },
    { id: 'grabit',  name: 'Grabit',                   tag: 'Mobile App', tech: ['React Native', 'Expo', 'Expo Router', 'TypeScript', 'React Native Maps', 'Python', 'FastAPI', 'Supabase', 'Redis', 'JWT', 'Server-Sent Events', 'REST APIs'] },
    { id: 'livo',    name: 'LIVO',                     tag: 'Mobile App', tech: ['React Native', 'Expo', 'TypeScript', 'React Navigation', 'TanStack Query', 'Firebase', 'Java', 'Spring Boot', 'Spring Security', 'JPA / Hibernate', 'PostgreSQL', 'Flyway', 'JWT', 'Cloudinary', 'Docker', 'REST APIs'] },
    { id: 'matte-sigona', name: 'Matte Sigona',        tag: 'Food & Beverage', tech: ['React Native', 'Expo', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 'REST APIs', 'Cloudinary'] },
    { id: 'kalpanaaa-ai', name: 'Kalpanaaa AI Assistant', tag: 'Conversational AI', tech: ['React Native', 'Expo', 'TypeScript', 'Python', 'FastAPI', 'Node.js', 'Express', 'Redis', 'REST APIs', 'Cloudinary'] },
    { id: 'whatsapp-bot', name: 'WhatsApp Chatbot',         tag: 'Automation', tech: ['Node.js', 'Express', 'Python', 'FastAPI', 'Redis', 'REST APIs', 'Cloudinary'] },
    { id: 'fairticket',   name: 'FairTicket',               tag: 'Ticketing & Events', tech: ['React Native', 'Expo', 'TypeScript', 'Node.js', 'Express', 'Redis', 'PostgreSQL', 'Server-Sent Events', 'JWT', 'REST APIs'] }
  ];
  const GROUPS = [
    { name: 'frontend', tech: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'Redux', 'TanStack Query', 'Tailwind CSS', 'Vite', 'HTML/CSS'] },
    { name: 'mobile apps', tech: ['React Native', 'Expo', 'Expo Router', 'React Navigation', 'React Native Maps', 'Flutter', 'Kotlin', 'Swift'] },
    { name: 'backend', tech: ['Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Spring Security', 'JPA / Hibernate', 'Node.js', 'Express', 'REST APIs', 'JWT', 'Server-Sent Events'] },
    { name: 'data & services', tech: ['PostgreSQL', 'Redis', 'Supabase', 'Flyway', 'Firebase', 'Cloudinary', 'Twilio'] },
    { name: 'cloud & devops', tech: ['Docker', 'AWS', 'Git', 'CI/CD'] }
  ];

  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const count = t => PROJECTS.filter(p => p.tech.includes(t)).length;
  const techEls = {}, projEls = {}, chipEls = {};

  GROUPS.forEach(g => {
    const box = el('div', 'sx-group');
    box.appendChild(el('p', 'sx-gname', '// ' + g.name));
    const row = el('div', 'sx-pills');
    g.tech.forEach(t => {
      const b = el('button', 'sx-tech');
      b.type = 'button';
      b.appendChild(el('span', '', t));
      const n = count(t);
      if (n > 0) b.appendChild(el('i', '', String(n)));
      b.setAttribute('aria-label', n ? `${t}: used in ${n} project${n === 1 ? '' : 's'}` : t);
      b.style.setProperty('--n', n / PROJECTS.length);
      row.appendChild(b);
      techEls[t] = b;
    });
    box.appendChild(row);
    techCol.appendChild(box);
  });

  PROJECTS.forEach((p, i) => {
    const a = el('article', 'sx-proj');
    a.tabIndex = 0;
    const top = el('div', 'sx-top');
    top.appendChild(el('b', '', '0' + (i + 1)));
    top.appendChild(el('h3', '', p.name));
    top.appendChild(el('em', '', p.tag));
    a.appendChild(top);
    const chips = el('div', 'sx-chips');
    chipEls[p.id] = {};
    p.tech.forEach(t => { const c = el('span', '', t); chips.appendChild(c); chipEls[p.id][t] = c; });
    a.appendChild(chips);
    projCol.appendChild(a);
    projEls[p.id] = a;
  });

  let hover = null, pinned = null;
  const same = (a, b) => a && b && a.type === b.type && a.id === b.id;

  const apply = sel => {
    let techs = new Set(), projs = new Set();
    if (sel && sel.type === 'tech') {
      techs.add(sel.id);
      PROJECTS.forEach(p => { if (p.tech.includes(sel.id)) projs.add(p.id); });
    } else if (sel && sel.type === 'proj') {
      projs.add(sel.id);
      PROJECTS.find(p => p.id === sel.id).tech.forEach(t => techs.add(t));
    }
    map.classList.toggle('has-active', !!sel);
    Object.keys(techEls).forEach(t => techEls[t].classList.toggle('on', techs.has(t)));
    PROJECTS.forEach(p => {
      projEls[p.id].classList.toggle('on', projs.has(p.id));
      p.tech.forEach(t => chipEls[p.id][t].classList.toggle('hit', !!sel && projs.has(p.id) && techs.has(t)));
    });
  };
  const refresh = () => apply(hover || pinned);

  const wire = (node, sel) => {
    node.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = sel; refresh(); } });
    node.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = null; refresh(); } });
    node.addEventListener('focus', () => { hover = sel; refresh(); });
    node.addEventListener('blur', () => { hover = null; refresh(); });
    node.addEventListener('click', () => { pinned = same(pinned, sel) ? null : sel; refresh(); });
    node.addEventListener('keydown', e => {
      if (e.target === node && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); node.click(); }
    });
  };
  Object.keys(techEls).forEach(t => wire(techEls[t], { type: 'tech', id: t }));
  PROJECTS.forEach(p => wire(projEls[p.id], { type: 'proj', id: p.id }));

  // tapping elsewhere clears a pin
  document.addEventListener('click', e => { if (pinned && !map.contains(e.target)) { pinned = null; refresh(); } });
})();


/* ---------- Mobile menu: close on outside tap / Escape / resize ---------- */
(function () {
  const burger = document.getElementById('burger'), links = document.getElementById('navLinks');
  if (!burger || !links) return;
  const close = () => { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('click', e => { if (links.classList.contains('open') && !e.target.closest('#nav')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (innerWidth > 980) close(); });
})();

/* ---------- Footer: scroll-progress back-to-top + terminal ticker ---------- */
(function () {
  const ft = document.getElementById('footer');
  if (!ft) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const up = document.getElementById('toTop');
  const bar = up && up.querySelector('.bar');
  if (up && bar) {
    const C = 2 * Math.PI * 23;
    bar.style.strokeDasharray = C;
    let queued = false;
    const paint = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      bar.style.strokeDashoffset = C * (1 - p);
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
    addEventListener('resize', paint);
    paint();
    up.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  }
})();
