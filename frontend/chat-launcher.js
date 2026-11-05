/* KSS chat launcher skins
 * Loads AFTER script.js. It only swaps the *contents* of #chatFab, so the existing
 * open/close handlers, aria-expanded updates and [data-open-chat] buttons keep working.
 *
 *   ?skin=robot | peek | orb | typing | gif   -> preview a skin via URL
 *   ?theme=steel | silver | graphite | gold | carbon   -> robot colourway
 *   KSSChatLauncher.setSkin('orb')            -> switch from the console
 *   KSSChatLauncher.setTheme('silver')
 *   KSSChatLauncher.replay()                  -> replay the robot's fly-in + greeting
 *   DEFAULT_SKIN / DEFAULT_THEME below        -> what visitors get
 */
(() => {
  'use strict';

  const DEFAULT_SKIN = 'robot';
  const DEFAULT_THEME = 'silver';
  const THEMES = ['steel', 'silver', 'graphite', 'gold', 'carbon']; // 'cyan' is accepted as an alias of 'graphite'
  const LABEL = 'Chat with our AI';
  const HINT = 'Hi! Ask me anything';
  const GREETING = "Hi! I'm KSS AI \u{1F44B}";
  const GIF_SRC = 'assets/robot.gif'; // drop your own animated gif here, then use ?skin=gif

  const WALK_IN_ON_LOAD = true; // robot/gif glide in from the right on every page load
  const WALK_SPEED_PX_PER_MS = 0.3; // ~300px/s
  const WALK_MIN_MS = 2400;
  const WALK_MAX_MS = 6500;
  const GREET_MS = 3800; // must be >= the rbGreet / clHintGreet durations in the CSS

  const fab = document.getElementById('chatFab');
  if (!fab) {
    console.warn('[chat-launcher] #chatFab not found; leaving the default button untouched.');
    return;
  }

  /* ---------- artwork ---------- */
  const GF = 'style="fill:var(--cl-glow)"'; // glow fill
  const GS = 'style="stroke:var(--cl-glow)"'; // glow stroke

  // Static arm (drawn for the viewer's left side; mirrored with <use> for the right side)
  const ARM_STATIC = `
    <circle cx="30" cy="88" r="6.5" fill="url(#cl-metal2)" stroke="#8a95a8" stroke-opacity=".45"/>
    <rect x="26.5" y="90" width="7" height="22" rx="3.5" fill="url(#cl-metal2)"/>
    <circle cx="30" cy="113" r="4.6" fill="#161a22" ${GS} stroke-width="1.2"/>
    <rect x="27" y="115" width="6" height="17" rx="3" fill="url(#cl-metal2)"/>
    <circle cx="30" cy="135" r="5.4" fill="url(#cl-metal)" ${GS} stroke-width="1"/>
    <path d="M27.5 139l-1.5 4M30 140v5M32.5 139l1.5 4" stroke="#8a95a8" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;

  const ROBOT_SVG = `
<svg viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="cl-metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color:var(--cl-m1)"/><stop offset=".35" style="stop-color:var(--cl-m2)"/><stop offset="1" style="stop-color:var(--cl-m3)"/>
    </linearGradient>
    <linearGradient id="cl-metal2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" style="stop-color:var(--cl-s1)"/><stop offset=".5" style="stop-color:var(--cl-s2)"/><stop offset="1" style="stop-color:var(--cl-s1)"/>
    </linearGradient>
    <linearGradient id="cl-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#121a28"/><stop offset="1" stop-color="#030508"/>
    </linearGradient>
    <linearGradient id="cl-scan" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="cl-flame" cx=".5" cy="0" r="1">
      <stop offset="0" style="stop-color:var(--cl-glow)" stop-opacity=".95"/>
      <stop offset=".55" style="stop-color:var(--cl-glow2)" stop-opacity=".45"/>
      <stop offset="1" style="stop-color:var(--cl-glow2)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cl-core" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff"/><stop offset=".45" style="stop-color:var(--cl-glow)"/><stop offset="1" style="stop-color:var(--cl-glow2)"/>
    </radialGradient>
    <filter id="cl-fx" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="0.9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="cl-vclip"><rect x="36" y="28" width="48" height="34" rx="13"/></clipPath>
    <g id="cl-arm-s">${ARM_STATIC}</g>
  </defs>

  <ellipse class="rb-shadow" cx="60" cy="163" rx="22" ry="3.8" fill="#0a1530" opacity=".2"/>

  <g class="rb-float">
    <!-- thruster glow -->
    <ellipse class="rb-flame" cx="60" cy="148" rx="9" ry="16" fill="url(#cl-flame)"/>

    <!-- torso -->
    <path d="M36 78C36 70 44 66 60 66C76 66 84 70 84 78L82 108C80 122 72 130 60 134C48 130 40 122 38 108Z"
          fill="url(#cl-metal)" style="stroke:var(--cl-edge)" stroke-opacity=".4" stroke-width="1"/>
    <path d="M40 76Q39 96 43 112" stroke="#fff" stroke-opacity=".2" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M44 84H76" stroke="#fff" stroke-opacity=".08" stroke-width="1"/>
    <!-- reactor core -->
    <circle cx="60" cy="98" r="12.5" fill="#06080c" stroke="url(#cl-metal2)" stroke-width="2.4"/>
    <g filter="url(#cl-fx)"><circle class="rb-core" cx="60" cy="98" r="5.6" fill="url(#cl-core)"/></g>
    <!-- nozzle -->
    <path d="M52 131H68L64 138H56Z" fill="#14171f" style="stroke:var(--cl-edge)" stroke-opacity=".5" stroke-width="1"/>

    <!-- neck -->
    <rect x="54" y="60" width="12" height="10" rx="3" fill="url(#cl-metal2)"/>

    <!-- right arm (static, gentle sway) -->
    <g class="rb-arm-r"><use href="#cl-arm-s" transform="translate(120 0) scale(-1 1)"/></g>

    <!-- left arm: shoulder raises, forearm waves -->
    <g class="rb-wave">
      <circle cx="30" cy="88" r="6.5" fill="url(#cl-metal2)" stroke="#8a95a8" stroke-opacity=".45"/>
      <rect x="26.5" y="90" width="7" height="22" rx="3.5" fill="url(#cl-metal2)"/>
      <circle cx="30" cy="113" r="4.6" fill="#161a22" ${GS} stroke-width="1.2"/>
      <g class="rb-fore">
        <rect x="27" y="115" width="6" height="17" rx="3" fill="url(#cl-metal2)"/>
        <circle cx="30" cy="135" r="5.4" fill="url(#cl-metal)" ${GS} stroke-width="1"/>
        <path d="M27.5 139l-1.5 4M30 140v5M32.5 139l1.5 4" stroke="#8a95a8" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      </g>
    </g>

    <!-- head -->
    <g class="rb-head">
      <line x1="60" y1="8" x2="60" y2="21" stroke="#8a95a8" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="60" cy="7" r="3.4" ${GF} class="rb-tip"/>
      <rect x="23" y="34" width="9" height="22" rx="4.5" fill="url(#cl-metal2)"/>
      <rect x="88" y="34" width="9" height="22" rx="4.5" fill="url(#cl-metal2)"/>
      <rect x="26.5" y="39" width="2" height="12" rx="1" ${GF}/>
      <rect x="91.5" y="39" width="2" height="12" rx="1" ${GF}/>
      <rect x="30" y="20" width="60" height="50" rx="18" fill="url(#cl-metal)" style="stroke:var(--cl-edge)" stroke-opacity=".5" stroke-width="1.2"/>
      <path d="M41 25Q60 19 79 25" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="36" y="28" width="48" height="34" rx="13" fill="url(#cl-glass)" stroke="#000" stroke-width="1"/>
      <rect x="37.5" y="29.5" width="45" height="31" rx="11.5" fill="none" ${GS} stroke-opacity=".3" stroke-width="1"/>
      <g class="rb-eye" filter="url(#cl-fx)">
        <circle cx="49" cy="45" r="7.2" fill="none" ${GS} stroke-width="2.2"/>
        <circle cx="49" cy="45" r="2.8" ${GF}/>
      </g>
      <g class="rb-eye" filter="url(#cl-fx)">
        <circle cx="71" cy="45" r="7.2" fill="none" ${GS} stroke-width="2.2"/>
        <circle cx="71" cy="45" r="2.8" ${GF}/>
      </g>
    </g>
  </g>
</svg>`;

  const PEEK_SVG = `
<svg viewBox="0 0 56 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="cl-pk-metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color:var(--cl-m1)"/><stop offset=".4" style="stop-color:var(--cl-m2)"/><stop offset="1" style="stop-color:var(--cl-m3)"/>
    </linearGradient>
    <filter id="cl-pk-fx" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g class="pk-head">
    <line x1="28" y1="6" x2="28" y2="12" stroke="#8a95a8" stroke-width="2.2" stroke-linecap="round"/>
    <circle class="rb-tip" cx="28" cy="4.5" r="3" ${GF}/>
    <rect x="2" y="24" width="5" height="12" rx="2.5" fill="#1b1f29" ${GS} stroke-width="1"/>
    <rect x="49" y="24" width="5" height="12" rx="2.5" fill="#1b1f29" ${GS} stroke-width="1"/>
    <rect x="6" y="11" width="44" height="38" rx="13" fill="url(#cl-pk-metal)" stroke="#9aa5ba" stroke-opacity=".5"/>
    <rect x="11" y="16" width="34" height="27" rx="9" fill="#04060a"/>
    <g class="rb-eye" filter="url(#cl-pk-fx)">
      <circle cx="21" cy="29" r="5" fill="none" ${GS} stroke-width="1.8"/><circle cx="21" cy="29" r="1.9" ${GF}/>
    </g>
    <g class="rb-eye" filter="url(#cl-pk-fx)">
      <circle cx="35" cy="29" r="5" fill="none" ${GS} stroke-width="1.8"/><circle cx="35" cy="29" r="1.9" ${GF}/>
    </g>
  </g>
</svg>`;

  const ORB_SVG = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="cl-orb" cx=".35" cy=".3" r=".9">
      <stop offset="0" stop-color="#7defff"/><stop offset=".45" stop-color="#00b8e6"/><stop offset="1" stop-color="#1f5cff"/>
    </radialGradient>
  </defs>
  <g class="ob-r1">
    <circle cx="32" cy="32" r="29" fill="none" stroke="#1f5cff" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="3 6" stroke-linecap="round"/>
    <circle cx="32" cy="3" r="2.8" fill="#5dffb0"/>
  </g>
  <g class="ob-r2">
    <circle cx="32" cy="32" r="24" fill="none" stroke="#00b8e6" stroke-opacity=".7" stroke-width="1.4" stroke-dasharray="14 10" stroke-linecap="round"/>
  </g>
  <circle cx="32" cy="32" r="18" fill="url(#cl-orb)"/>
  <path class="ob-spark" d="M32 21L35 29L43 32L35 35L32 43L29 35L21 32L29 29Z" fill="#fff"/>
</svg>`;

  /* ---------- skins ---------- */
  // Rule: the label is always the LAST child (the legacy mobile CSS only targets span:last-child, and these are <b>).
  const SKINS = {
    robot: () =>
      `<span class="cl-hint">${HINT}</span>` +
      `<i class="cl-art">${ROBOT_SVG}</i>` +
      `<b class="cl-tag cl-label cl-collapse">${LABEL}</b>`,

    gif: () =>
      `<span class="cl-hint">${HINT}</span>` +
      `<i class="cl-art"><img class="cl-gif" src="${GIF_SRC}" alt="" width="96" height="96" decoding="async"></i>` +
      `<b class="cl-tag cl-label cl-collapse">${LABEL}</b>`,

    peek: () =>
      `<i class="cl-peek">${PEEK_SVG}</i>` +
      `<b class="cl-label">Ask our AI</b>`,

    orb: () =>
      `<i class="cl-orb">${ORB_SVG}</i>` +
      `<b class="cl-label cl-collapse">${LABEL}</b>`,

    typing: () =>
      `<i class="cl-dots"><i></i><i></i><i></i></i>` +
      `<b class="cl-label cl-collapse">${LABEL}</b>`,
  };

  const has = (name) => Object.prototype.hasOwnProperty.call(SKINS, name);

  /* ---------- entrance: data-state  walk (fly-in) -> greet -> idle ---------- */
  let timers = [];
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const setState = (s) => {
    fab.dataset.state = s;
  };
  const setHint = (text) => {
    const el = fab.querySelector('.cl-hint');
    if (el) el.textContent = text;
  };
  const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const toIdle = () => {
    clearTimers();
    setHint(HINT);
    setState('idle');
  };

  const greet = () => {
    clearTimers();
    setHint(GREETING);
    setState('greet');
    timers.push(setTimeout(toIdle, GREET_MS));
  };

  const walkIn = () => {
    clearTimers();
    const skin = fab.dataset.skin;
    const canWalk = WALK_IN_ON_LOAD && !prefersReducedMotion() && (skin === 'robot' || skin === 'gif');
    if (!canWalk) {
      toIdle();
      return;
    }

    const distance = window.innerWidth + 140;
    const ms = Math.round(Math.min(WALK_MAX_MS, Math.max(WALK_MIN_MS, distance / WALK_SPEED_PX_PER_MS)));
    fab.style.setProperty('--cl-walk', `${ms}ms`);
    setHint(HINT);
    setState('walk');

    let done = false;
    const next = () => {
      if (done) return;
      done = true;
      fab.removeEventListener('animationend', onEnd);
      greet();
    };
    const onEnd = (e) => {
      if (e.target === fab && e.animationName === 'clWalkIn') next();
    };
    fab.addEventListener('animationend', onEnd);
    // safety net: background tabs / interrupted animations may never fire animationend
    timers.push(setTimeout(next, ms + 500));
  };

  /* ---------- theme + apply ---------- */
  const setTheme = (name) => {
    let t = String(name || '').toLowerCase();
    if (t === 'cyan') t = 'graphite';
    if (!THEMES.includes(t)) {
      console.warn(`[chat-launcher] unknown theme "${name}". Available: ${THEMES.join(', ')}`);
      return false;
    }
    fab.dataset.theme = t;
    return true;
  };

  const apply = (name) => {
    if (!has(name)) {
      console.warn(`[chat-launcher] unknown skin "${name}". Available: ${Object.keys(SKINS).join(', ')}`);
      return false;
    }
    clearTimers();
    fab.dataset.skin = name;
    fab.setAttribute('aria-label', LABEL); // stable accessible name regardless of skin / collapsed label
    fab.innerHTML = SKINS[name]();

    if (name === 'gif') {
      const img = fab.querySelector('.cl-gif');
      if (img) {
        img.addEventListener(
          'error',
          () => {
            console.warn(`[chat-launcher] ${GIF_SRC} failed to load; falling back to the SVG robot.`);
            apply('robot');
          },
          { once: true }
        );
      }
    }
    walkIn();
    return true;
  };

  const replay = () => {
    setState('idle');
    void fab.offsetWidth; // force reflow so the fly-in animation restarts
    walkIn();
  };

  const param = (key) => {
    try {
      return new URLSearchParams(window.location.search).get(key);
    } catch (_) {
      return null; // malformed URL state
    }
  };

  const initialSkin = String(param('skin') || fab.dataset.skin || DEFAULT_SKIN).toLowerCase();
  const initialTheme = String(param('theme') || fab.dataset.theme || DEFAULT_THEME).toLowerCase();
  if (!setTheme(initialTheme)) setTheme(DEFAULT_THEME);
  apply(has(initialSkin) ? initialSkin : DEFAULT_SKIN);

  const markup = (name, uid = '') => {
    if (!has(name)) return '';
    const html = SKINS[name]();
    return uid ? html.replace(/(id="|url\(#|href="#)(cl-[\w-]+)/g, `$1$2-${uid}`) : html;
  };

  window.KSSChatLauncher = Object.freeze({ setSkin: apply, setTheme, replay, markup, skins: Object.keys(SKINS), themes: THEMES });
})();
