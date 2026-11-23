/* ------------------------------------------------------------------
   Naksh — Part A: the threshold
   The School of Athens → the camera travels into the light at its
   centre → a classical hall in the painting's own palette.
   ------------------------------------------------------------------ */
(() => {
  'use strict';

  // ---------- Constants ---------------------------------------------------

  const SRC_W = 1280;
  const SRC_H = 720;
  // The point the camera travels into: the light between Plato and Aristotle,
  // which is also where the footage's own push-in is heading.
  const FOCUS = { x: 0.5, y: 0.48 };

  // intro.mp4 is pre-cut: 0–3 s of the source at 1×, then 3–11 s at 4× → 5.0 s.
  const CLIP_END = 5.0;
  const AUTO_AT = 4.4;          // start travelling while the fast push is still running
  const LOOP_END = 4.96;        // for visitors who stay: loop with a dissolve
  const LOOP_FADE = 1.1;
  const AUTO_TRAVEL_MS = 3800;
  const SNAP_IDLE_MS = 170;
  const MAX_ZOOM = 9;           // extra scale the camera adds on top of the footage's own push

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- Elements ----------------------------------------------------

  const $ = (s) => document.querySelector(s);
  const threshold = $('#threshold');
  const stage = $('.stage');
  const world = $('.world');
  const frame = $('.frame');
  const video = $('#intro');
  const xfade = $('.crossfade');
  const bloom = $('.bloom');
  const vignette = $('.vignette');
  const whisper = $('.whisper');
  const countdown = $('.countdown');
  const countdownBar = countdown.querySelector('span');
  const firstDimension = $('#dimension-1');
  const hallCanvas = $('#athens');

  const xfCtx = xfade.getContext('2d');

  const lingerLine = whisper.querySelector('.whisper__line--linger');
  lingerLine.textContent = finePointer ? lingerLine.dataset.fine : lingerLine.dataset.touch;

  // Every visit begins at the threshold.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // ---------- Helpers -----------------------------------------------------

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  // The journey: gentle departure, full speed through the light, a long settling arrival
  const easeJourney = (t) => (t < 0.45 ? 4.3896 * t * t * t
                                       : 1 - 0.6 * Math.pow((1 - t) / 0.55, 2.2));

  // ---------- State -------------------------------------------------------

  const L = {};
  const state = {
    p: 0,
    lastY: 0,
    dir: 1,
    stayed: false,
    journeyDone: false,
    autoRunning: false,
    glide: null,
    programmaticY: -1,
    touching: false,
    snapTimer: 0,
    firstPlayStarted: 0,
    atTopSince: performance.now(),
    loopFade: 0,
    playPending: false,
    mx: 0, my: 0, smx: 0, smy: 0,
    loadedAt: performance.now(),
  };

  // ---------- Layout ------------------------------------------------------

  function layout() {
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    // The footage is 16:9: it simply covers the viewport, untouched, centred on its focus.
    const s = Math.max(vw / SRC_W, vh / SRC_H);
    const w = SRC_W * s;
    const h = SRC_H * s;
    const x0 = clamp(vw / 2 - FOCUS.x * w, vw - w, 0);
    const y0 = clamp(vh / 2 - FOCUS.y * h, vh - h, 0);
    Object.assign(L, { vw, vh, w, h, x0, y0 });
    L.fx = x0 + FOCUS.x * w;
    L.fy = y0 + FOCUS.y * h;
    L.diag = Math.hypot(vw, vh);

    frame.style.left = `${x0}px`;
    frame.style.top = `${y0}px`;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    world.style.transformOrigin = `${L.fx}px ${L.fy}px`;

    L.trackTop = threshold.offsetTop;
    L.travel = Math.max(1, threshold.offsetHeight - vh);
    L.arrival = firstDimension.offsetTop;

    hall.resize();
  }

  // ---------- Footage -----------------------------------------------------

  function safePlay() {
    if (state.playPending || !video.paused || video.ended && state.autoRunning) return;
    state.playPending = true;
    const pr = video.play();
    if (pr && pr.then) pr.then(() => { state.playPending = false; }, () => { state.playPending = false; });
    else state.playPending = false;
  }

  function restartLoop() {
    // Hold the final frame on top, rewind underneath, then let it dissolve away.
    if (xfade.width !== SRC_W) { xfade.width = SRC_W; xfade.height = SRC_H; }
    try { xfCtx.drawImage(video, 0, 0, SRC_W, SRC_H); } catch (_) { /* not ready */ }
    state.loopFade = 1;
    xfade.style.opacity = '1';
    video.currentTime = 0;
    safePlay();
  }

  video.addEventListener('playing', () => {
    if (!state.firstPlayStarted) state.firstPlayStarted = performance.now();
  });
  video.addEventListener('ended', () => {
    if (state.p <= 0.001 && !state.autoRunning) restartLoop();
  });

  // ---------- Journey control --------------------------------------------

  function canAutoTravel() {
    return !reduceMotion && !state.stayed && !state.journeyDone && !state.autoRunning &&
           document.visibilityState === 'visible' && window.scrollY <= 1;
  }

  function glideTo(target, duration, ease, done) {
    cancelGlide();
    const from = window.scrollY;
    const dist = target - from;
    if (Math.abs(dist) < 1) { done && done(); return; }
    const t0 = performance.now();
    const g = { raf: 0 };
    const step = (now) => {
      const t = clamp((now - t0) / duration);
      const y = Math.round(from + dist * ease(t));
      state.programmaticY = y;
      window.scrollTo(0, y);
      if (t < 1) g.raf = requestAnimationFrame(step);
      else { state.glide = null; done && done(); }
    };
    g.raf = requestAnimationFrame(step);
    state.glide = g;
  }

  function cancelGlide() {
    if (state.glide) cancelAnimationFrame(state.glide.raf);
    state.glide = null;
    state.autoRunning = false;
  }

  function startAutoJourney() {
    state.journeyDone = true;
    // The footage keeps playing: its own accelerating push carries straight into the camera move.
    glideTo(L.arrival, AUTO_TRAVEL_MS, easeJourney, () => { state.autoRunning = false; });
    state.autoRunning = true;   // after glideTo, which clears it when replacing a glide
  }

  function stayHere() {
    state.stayed = true;
    state.journeyDone = true;
    if (window.scrollY > 1) {
      const d = window.scrollY / Math.max(1, L.arrival);
      glideTo(0, 700 + 1300 * d, easeInOutCubic);
    }
  }

  // Settle the camera after manual scrolling: never leave the visitor half-way into the light.
  function scheduleSnap() {
    clearTimeout(state.snapTimer);
    state.snapTimer = setTimeout(() => {
      if (state.glide || state.touching) return;
      const y = window.scrollY;
      if (y <= 1 || y >= L.arrival - 1) return;
      const target = state.dir > 0 ? L.arrival : 0;
      const d = Math.abs(target - y) / L.arrival;
      if (target === 0) state.stayed = true;
      state.journeyDone = true;
      glideTo(target, 650 + 1700 * d, target ? easeInOutSine : easeInOutCubic);
    }, SNAP_IDLE_MS);
  }

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y !== state.programmaticY) {
      if (y !== state.lastY) state.dir = y > state.lastY ? 1 : -1;
      if (!state.glide) scheduleSnap();
    }
    state.lastY = y;
  }, { passive: true });

  const takeControl = () => {
    if (state.glide) { cancelGlide(); state.journeyDone = true; }
  };
  window.addEventListener('wheel', (e) => {
    takeControl();
    if (e.deltaY < 0 && window.scrollY <= 1) state.stayed = true;
    state.dir = e.deltaY > 0 ? 1 : -1;
    scheduleSnap();
  }, { passive: true });
  window.addEventListener('touchstart', () => { state.touching = true; takeControl(); }, { passive: true });
  window.addEventListener('touchend', () => { state.touching = false; scheduleSnap(); }, { passive: true });
  window.addEventListener('touchcancel', () => { state.touching = false; scheduleSnap(); }, { passive: true });

  window.addEventListener('keydown', (e) => {
    const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar', 'End'].includes(e.key);
    const up = ['ArrowUp', 'PageUp', 'Home'].includes(e.key);
    if (e.key === 'Escape') { takeControl(); stayHere(); return; }
    if (!down && !up) return;
    if (window.scrollY < L.arrival - 1) {
      e.preventDefault();
      takeControl();
      state.journeyDone = true;
      if (down) glideTo(L.arrival, AUTO_TRAVEL_MS * 0.85, easeJourney);
      else stayHere();
    }
  });

  // A click or tap on the opening means "let me stay".
  stage.addEventListener('click', () => {
    if (state.p < 0.98) { takeControl(); stayHere(); safePlay(); }
  });

  window.addEventListener('pointermove', (e) => {
    state.mx = (e.clientX / window.innerWidth) * 2 - 1;
    state.my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(layout);
  });

  // ---------- The classical hall -----------------------------------------
  //
  // A one-point-perspective hall of arches, after the architecture of the painting:
  // marble arch walls with pilasters, meander friezes and medallions, coffered ceilings,
  // niches along the side walls, and an inlaid stone floor — all receding into a warm,
  // luminous haze that is the same light the camera flew into.

  const hall = (() => {
    const ctx = hallCanvas.getContext('2d', { alpha: false });
    let w = 0, h = 0, dpr = 1, F = 1, cx = 0, cy = 0;
    let marble = null, marblePattern = null;
    let cam = { x: 0, y: 0, z: 0 };
    let lastKey = '';

    // World (units ≈ metres). Camera eye at y = 0; +y is down.
    const FLOOR = 3.1, CEIL = -9.6, WALL = 8;
    const SPACING = 9, DEPTH = 1.5;          // distance between arch walls, wall thickness
    const A = 3.9, SPRING = -1.3;             // opening half-width and spring line
    const NEAR = 0.25, FAR = 96, FOG = 46;

    // Palette (from the reference): ivory, sand, sage-ivory, taupe, rose-taupe, olive-gold, oxblood
    const HAZE = [244, 239, 228];
    const COL = {
      face: [231, 221, 198],
      faceLow: [204, 189, 158],
      pilaster: [239, 233, 217],
      flute: [205, 190, 160],
      molding: [214, 200, 170],
      frieze: [217, 200, 150],               // #D9C896
      meander: [166, 145, 119],              // #A69177
      revealLit: [214, 200, 170],
      revealShade: [166, 145, 119],          // #A69177
      wall: [222, 209, 181],
      wallDeep: [184, 166, 134],
      niche: [184, 164, 132],
      nicheDeep: [160, 139, 108],
      ceil: [214, 201, 174],
      coffer: [186, 168, 134],
      cofferDeep: [174, 147, 89],            // #AE9359, sparingly
      floor: [226, 216, 194],
      tileA: [179, 151, 137],                // #B39789
      tileB: [140, 82, 58],                  // oxblood #732002, softened toward taupe
      tileC: [223, 221, 191],                // #DFDDBF
      statue: [244, 240, 231],
      statueShade: [196, 182, 154],
    };

    const fogF = (d) => clamp((1 - Math.exp(-Math.max(0, d - 5) / FOG)) * 1.08);
    const mix = (c, f) => `rgb(${Math.round(c[0] + (HAZE[0] - c[0]) * f)},${Math.round(c[1] + (HAZE[1] - c[1]) * f)},${Math.round(c[2] + (HAZE[2] - c[2]) * f)})`;

    // Project a world point to the screen
    const P = (x, y, z) => {
      const d = Math.max(NEAR, z - cam.z);
      const s = F / d;
      return [cx + (x - cam.x) * s, cy + (y - cam.y) * s];
    };

    function quad(a, b, c, d) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      ctx.closePath();
    }

    // ---- marble texture (painted once)
    function paintMarble() {
      const N = 256;
      const c = document.createElement('canvas');
      c.width = c.height = N;
      const g = c.getContext('2d');
      const img = g.createImageData(N, N);
      // tileable value noise
      const G = 16, grid = [];
      for (let i = 0; i < G * G; i++) grid.push(Math.random());
      const at = (x, y) => grid[((y % G + G) % G) * G + ((x % G + G) % G)];
      const noise = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = at(xi, yi), b = at(xi + 1, yi), c2 = at(xi, yi + 1), d = at(xi + 1, yi + 1);
        return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v;
      };
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const fx = (x / N) * G, fy = (y / N) * G;
          let t = 0, amp = 1, fr = 1, norm = 0;
          for (let o = 0; o < 4; o++) { t += noise(fx * fr, fy * fr) * amp; norm += amp; amp *= 0.5; fr *= 2; }
          t /= norm;
          const vein = Math.pow(1 - Math.abs(Math.sin((x / N) * Math.PI * 4 + (y / N) * Math.PI * 2 + t * 7)), 9);
          const cloud = (t - 0.5) * 0.5;
          const i = (y * N + x) * 4;
          img.data[i] = 120; img.data[i + 1] = 100; img.data[i + 2] = 78;
          img.data[i + 3] = Math.round(clamp(vein * 0.55 + Math.max(0, cloud) * 0.35) * 255);
        }
      }
      g.putImageData(img, 0, 0);
      marble = c;
      marblePattern = ctx.createPattern(marble, 'repeat');
    }

    // ---- an arch wall at depth z (planes parallel to the screen project with a uniform scale)
    function archPath(s, ox, oy, inset = 0) {
      const a = (A - inset) * s;
      const sp = oy + SPRING * s;
      ctx.moveTo(ox - a, oy + FLOOR * s);
      ctx.lineTo(ox - a, sp);
      ctx.arc(ox, sp, a, Math.PI, 0, false);
      ctx.lineTo(ox + a, oy + FLOOR * s);
      ctx.closePath();
    }

    function drawArchWall(z) {
      const d1 = z - cam.z, d2 = z + DEPTH - cam.z;
      if (d1 < NEAR) return;
      const s1 = F / d1, s2 = F / d2;
      const o1x = cx - cam.x * s1, o1y = cy - cam.y * s1;
      const o2x = cx - cam.x * s2, o2y = cy - cam.y * s2;
      const f1 = fogF(d1), f2 = fogF(d2);

      // Reveal: the depth of the wall seen through the opening (jambs and soffit)
      ctx.beginPath();
      archPath(s1, o1x, o1y);
      archPath(s2, o2x, o2y);
      const rg = ctx.createLinearGradient(o1x - A * s1, 0, o1x + A * s1, 0);
      rg.addColorStop(0, mix(COL.revealLit, f2));
      rg.addColorStop(0.5, mix(COL.revealShade, (f1 + f2) / 2));
      rg.addColorStop(1, mix(COL.revealShade, f1 * 0.9));
      ctx.fillStyle = rg;
      ctx.fill('evenodd');

      // Face of the wall, with the opening cut out
      ctx.save();
      ctx.beginPath();
      ctx.rect(o1x + (-WALL) * s1, o1y + CEIL * s1, WALL * 2 * s1, (FLOOR - CEIL) * s1);
      archPath(s1, o1x, o1y);
      ctx.clip('evenodd');

      const fg = ctx.createLinearGradient(0, o1y + CEIL * s1, 0, o1y + FLOOR * s1);
      fg.addColorStop(0, mix(COL.faceLow, f1));
      fg.addColorStop(0.45, mix(COL.face, f1));
      fg.addColorStop(1, mix(COL.faceLow, f1));
      ctx.fillStyle = fg;
      ctx.fillRect(o1x - WALL * s1, o1y + CEIL * s1, WALL * 2 * s1, (FLOOR - CEIL) * s1);

      // Marble veining, fixed to the stone
      if (marblePattern && f1 < 0.9) {
        const ts = (s1 * 3.2) / marble.width;
        marblePattern.setTransform(new DOMMatrix([ts, 0, 0, ts, o1x + z * 37 % 97 * s1, o1y]));
        ctx.globalAlpha = 0.28 * (1 - f1);
        ctx.fillStyle = marblePattern;
        ctx.fillRect(o1x - WALL * s1, o1y + CEIL * s1, WALL * 2 * s1, (FLOOR - CEIL) * s1);
        ctx.globalAlpha = 1;
      }

      // Everything below is drawn in world units on this plane
      ctx.setTransform(dpr * s1, 0, 0, dpr * s1, dpr * o1x, dpr * o1y);
      const lw = 1 / s1;   // one screen pixel in world units

      // Pilasters flanking the opening
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -A - 1.35 : A + 0.25;
        ctx.fillStyle = mix(COL.pilaster, f1);
        ctx.fillRect(x0, -6.7, 1.1, FLOOR + 6.7);
        ctx.strokeStyle = mix(COL.flute, f1);
        ctx.lineWidth = Math.max(lw * 0.8, 0.018);
        for (let i = 1; i <= 4; i++) {
          const fx = x0 + (1.1 / 5) * i;
          ctx.beginPath(); ctx.moveTo(fx, -6.35); ctx.lineTo(fx, FLOOR - 0.75); ctx.stroke();
        }
        // capital and base
        ctx.fillStyle = mix(COL.molding, f1);
        ctx.fillRect(x0 - 0.12, -6.95, 1.34, 0.28);
        ctx.fillRect(x0 - 0.08, -6.62, 1.26, 0.1);
        ctx.fillRect(x0 - 0.12, FLOOR - 0.55, 1.34, 0.55);
        // shadow on the inner edge
        ctx.fillStyle = `rgba(120,100,75,${0.12 * (1 - f1)})`;
        ctx.fillRect(side < 0 ? x0 + 1.02 : x0, -6.67, 0.08, FLOOR + 6.12);
      }

      // Archivolt mouldings
      ctx.strokeStyle = mix(COL.molding, f1);
      for (const [r, wdt] of [[A + 0.1, 0.16], [A + 0.42, 0.07], [A + 0.6, 0.04]]) {
        ctx.lineWidth = Math.max(wdt, lw);
        ctx.beginPath(); ctx.arc(0, SPRING, r, Math.PI, 0, false); ctx.stroke();
      }
      // Keystone
      ctx.fillStyle = mix(COL.pilaster, f1);
      ctx.beginPath();
      ctx.moveTo(-0.32, SPRING - A - 0.72); ctx.lineTo(0.32, SPRING - A - 0.72);
      ctx.lineTo(0.22, SPRING - A + 0.02); ctx.lineTo(-0.22, SPRING - A + 0.02);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = mix(COL.flute, f1); ctx.lineWidth = Math.max(lw, 0.02); ctx.stroke();

      // Medallions in the spandrels
      for (const side of [-1, 1]) {
        const mx = side * (A + 2.35), my = -5.55;
        ctx.fillStyle = mix(COL.wallDeep, f1);
        ctx.beginPath(); ctx.arc(mx, my, 0.62, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = mix(COL.molding, f1); ctx.lineWidth = Math.max(0.07, lw);
        ctx.beginPath(); ctx.arc(mx, my, 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = mix(COL.pilaster, f1 * 0.9);
        ctx.beginPath(); ctx.arc(mx - 0.08, my - 0.08, 0.36, 0, Math.PI * 2); ctx.fill();
      }

      // Niches with marble figures on either side, as on the painting's own walls
      if (f1 < 0.93) {
        for (const side of [-1, 1]) {
          const nx = side * 6.6;
          drawNiche(nx, 2.35, -2.55, 0.82, f1);
          drawStatue(nx, 1.45, side, f1, lw);
        }
      }

      // Entablature: architrave, meander frieze, cornice
      ctx.fillStyle = mix(COL.molding, f1);
      ctx.fillRect(-WALL, -7.25, WALL * 2, 0.28);
      ctx.fillStyle = mix(COL.frieze, f1);
      ctx.fillRect(-WALL, -8.05, WALL * 2, 0.8);
      ctx.fillStyle = mix(COL.pilaster, f1);
      ctx.fillRect(-WALL, -8.5, WALL * 2, 0.45);
      ctx.fillStyle = `rgba(110,90,65,${0.16 * (1 - f1)})`;
      ctx.fillRect(-WALL, -8.05, WALL * 2, 0.06);
      if (s1 * 0.8 > 6) drawMeander(-WALL, -7.95, WALL * 2, 0.6, mix(COL.meander, f1), lw);

      // Plinth
      ctx.fillStyle = mix(COL.faceLow, f1);
      ctx.fillRect(-WALL, FLOOR - 0.45, WALL - A, 0.45);
      ctx.fillRect(A, FLOOR - 0.45, WALL - A, 0.45);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.restore();
    }

    // An arched recess on a plane parallel to the screen (world units, current transform)
    function drawNiche(x, base, spring, r, f) {
      ctx.beginPath();
      ctx.moveTo(x - r, base); ctx.lineTo(x - r, spring);
      ctx.arc(x, spring, r, Math.PI, 0, false);
      ctx.lineTo(x + r, base); ctx.closePath();
      const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
      g.addColorStop(0, mix(COL.nicheDeep, f));
      g.addColorStop(0.55, mix(COL.niche, f));
      g.addColorStop(1, mix(COL.wallDeep, f));
      ctx.fillStyle = g; ctx.fill();
      // shell-like shading at the top of the recess
      const sg = ctx.createRadialGradient(x, spring, 0, x, spring, r);
      sg.addColorStop(0, `rgba(90,70,45,${0.0})`);
      sg.addColorStop(1, `rgba(90,70,45,${0.18 * (1 - f)})`);
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(x, spring, r, Math.PI, 0, false); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = mix(COL.molding, f); ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.moveTo(x - r - 0.06, base); ctx.lineTo(x - r - 0.06, spring);
      ctx.arc(x, spring, r + 0.06, Math.PI, 0, false); ctx.lineTo(x + r + 0.06, base); ctx.stroke();
      // sill
      ctx.fillStyle = mix(COL.molding, f);
      ctx.fillRect(x - r - 0.2, base, 2 * r + 0.4, 0.16);
    }

    // A draped marble figure in contrapposto, ~2.9 units tall, standing at (x, footY)
    function drawStatue(x, footY, facing, f, lw) {
      const k = facing;                       // mirror so figures face the centre of the hall
      ctx.save();
      ctx.translate(x, footY);
      ctx.scale(k * 0.95, 0.95);
      // pedestal
      ctx.fillStyle = mix(COL.pilaster, f);
      ctx.fillRect(-0.42, 0, 0.84, 0.9);
      ctx.fillStyle = mix(COL.molding, f);
      ctx.fillRect(-0.5, -0.06, 1.0, 0.1);
      ctx.fillRect(-0.5, 0.82, 1.0, 0.1);
      // figure
      const g = ctx.createLinearGradient(0.35, 0, -0.35, 0);
      g.addColorStop(0, mix(COL.statue, f));
      g.addColorStop(0.6, mix(COL.statue, f * 0.9 + 0.04));
      g.addColorStop(1, mix(COL.statueShade, f));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-0.26, -0.06);                           // hem, left
      ctx.bezierCurveTo(-0.3, -0.7, -0.22, -1.2, -0.24, -1.55);   // drapery falls along the weight leg
      ctx.bezierCurveTo(-0.27, -1.8, -0.3, -2.05, -0.27, -2.22);  // hip to shoulder
      ctx.bezierCurveTo(-0.2, -2.34, -0.1, -2.36, -0.07, -2.4);   // shoulder to neck
      ctx.lineTo(-0.06, -2.5);
      ctx.bezierCurveTo(-0.15, -2.55, -0.14, -2.84, 0.0, -2.86);  // head
      ctx.bezierCurveTo(0.15, -2.84, 0.15, -2.55, 0.06, -2.5);
      ctx.lineTo(0.07, -2.4);
      ctx.bezierCurveTo(0.14, -2.37, 0.24, -2.33, 0.28, -2.2);    // other shoulder
      ctx.bezierCurveTo(0.34, -1.95, 0.4, -1.72, 0.44, -1.5);     // arm resting on the hip
      ctx.bezierCurveTo(0.46, -1.38, 0.36, -1.32, 0.3, -1.36);
      ctx.bezierCurveTo(0.28, -1.0, 0.33, -0.5, 0.3, -0.06);      // free leg, bent knee
      ctx.closePath();
      ctx.fill();
      // drapery folds
      ctx.strokeStyle = mix(COL.statueShade, f);
      ctx.lineWidth = Math.max(0.025, lw * 0.8);
      ctx.globalAlpha = 0.7;
      for (const [x0, y0, x1, y1, x2, y2] of [
        [-0.18, -2.1, 0.05, -1.7, 0.22, -1.42],
        [-0.15, -1.6, -0.05, -1.0, -0.12, -0.1],
        [0.02, -1.35, 0.1, -0.8, 0.05, -0.08],
        [0.15, -1.3, 0.24, -0.7, 0.18, -0.08],
      ]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Greek key: one continuous line, a spiral per repeat (period 5u, height 4u)
    const KEY = [[0, 0], [4, 0], [4, 3], [2, 3], [2, 2], [3, 2], [3, 1], [1, 1], [1, 4], [5, 4]];
    function drawMeander(x0, y0, width, hgt, color, lw) {
      const u = hgt / 4;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(u * 0.5, lw);
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(x0, y0 + hgt);
      for (let x = x0; x < x0 + width; x += 5 * u) {
        for (const [a, b] of KEY) ctx.lineTo(x + a * u, y0 + b * u);
      }
      ctx.stroke();
    }

    // ---- the space between two arch walls: floor, side walls with niches, coffered ceiling
    function drawBay(za, zb) {
      za = Math.max(za, cam.z + NEAR);
      if (zb <= za) return;
      const da = za - cam.z, db = zb - cam.z;
      const fa = fogF(da), fb = fogF(db);

      // Floor: inlaid stone in the painting's pattern
      quad(P(-WALL, FLOOR, za), P(WALL, FLOOR, za), P(WALL, FLOOR, zb), P(-WALL, FLOOR, zb));
      const pa = P(0, FLOOR, za), pb = P(0, FLOOR, zb);
      let gr = ctx.createLinearGradient(0, pa[1], 0, pb[1]);
      gr.addColorStop(0, mix(COL.floor, fa)); gr.addColorStop(1, mix(COL.floor, fb));
      ctx.fillStyle = gr; ctx.fill();

      const T = 2;                                    // tile size
      const k0 = Math.ceil(za / T - 1e-6) - 1, k1 = Math.floor(zb / T);
      for (let k = k0; k <= k1; k++) {
        const t0 = Math.max(za, k * T + 0.22), t1 = Math.min(zb, k * T + T - 0.22);
        if (t1 <= t0) continue;
        const f = fogF((t0 + t1) / 2 - cam.z);
        if (f > 0.97) continue;
        for (let i = -4; i < 4; i++) {
          const x0 = i * T + 0.22, x1 = i * T + T - 0.22;
          const kind = ((i + k) % 2 + 2) % 2;
          quad(P(x0, FLOOR, t0), P(x1, FLOOR, t0), P(x1, FLOOR, t1), P(x0, FLOOR, t1));
          ctx.fillStyle = mix(kind ? COL.tileA : COL.tileC, f);
          ctx.fill();
          if (!kind) {
            // a small oxblood inlay in every other tile
            const m = T / 2, cxw = i * T + m, czw = k * T + m;
            if (czw - 0.34 > za && czw + 0.34 < zb) {
              quad(P(cxw, FLOOR, czw - 0.34), P(cxw + 0.34, FLOOR, czw), P(cxw, FLOOR, czw + 0.34), P(cxw - 0.34, FLOOR, czw));
              ctx.fillStyle = mix(COL.tileB, f);
              ctx.fill();
            }
          }
        }
      }

      // Side walls
      for (const side of [-1, 1]) {
        const X = side * WALL;
        quad(P(X, CEIL, za), P(X, CEIL, zb), P(X, FLOOR, zb), P(X, FLOOR, za));
        const qa = P(X, 0, za), qb = P(X, 0, zb);
        gr = ctx.createLinearGradient(qa[0], 0, qb[0], 0);
        const c = side < 0 ? COL.wall : COL.wallDeep;    // light falls from the left
        gr.addColorStop(0, mix(c, fa)); gr.addColorStop(1, mix(c, fb));
        ctx.fillStyle = gr; ctx.fill();

        // cornice band continuing the entablature
        quad(P(X, -8.05, za), P(X, -8.05, zb), P(X, -7.25, zb), P(X, -7.25, za));
        ctx.fillStyle = mix(COL.frieze, (fa + fb) / 2); ctx.fill();
        quad(P(X, -8.5, za), P(X, -8.5, zb), P(X, -8.05, zb), P(X, -8.05, za));
        ctx.fillStyle = mix(COL.pilaster, (fa + fb) / 2); ctx.fill();

        // a niche in the middle of the bay
        const zm = (za + zb) / 2;
        if (zb - za > 3.2) {
          const nw = 1.15, top = -3.2, base = 1.1;
          const pts = [P(X, base, zm - nw), P(X, top, zm - nw)];
          for (let a = 1; a < 12; a++) {
            const th = Math.PI - (a / 12) * Math.PI;
            pts.push(P(X, top - Math.sin(th) * nw, zm + Math.cos(th) * nw));
          }
          pts.push(P(X, top, zm + nw), P(X, base, zm + nw));
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.closePath();
          const fm = fogF(zm - cam.z);
          const ng = ctx.createLinearGradient(pts[0][0], 0, pts[pts.length - 1][0], 0);
          ng.addColorStop(0, mix(side < 0 ? COL.nicheDeep : COL.niche, fm));
          ng.addColorStop(1, mix(side < 0 ? COL.niche : COL.nicheDeep, fm));
          ctx.fillStyle = ng; ctx.fill();
          // pedestal
          quad(P(X, base, zm - 0.7), P(X, base - 1.6, zm - 0.7), P(X, base - 1.6, zm + 0.7), P(X, base, zm + 0.7));
          ctx.fillStyle = mix(COL.pilaster, fm); ctx.fill();
          quad(P(X, base - 1.6, zm - 0.82), P(X, base - 1.8, zm - 0.82), P(X, base - 1.8, zm + 0.82), P(X, base - 1.6, zm + 0.82));
          ctx.fillStyle = mix(COL.molding, fm); ctx.fill();
          // sill
          quad(P(X, base, zm - nw - 0.15), P(X, base + 0.22, zm - nw - 0.15), P(X, base + 0.22, zm + nw + 0.15), P(X, base, zm + nw + 0.15));
          ctx.fillStyle = mix(COL.molding, fm); ctx.fill();
        }
      }

      // Coffered ceiling
      quad(P(-WALL, CEIL, za), P(WALL, CEIL, za), P(WALL, CEIL, zb), P(-WALL, CEIL, zb));
      const ca = P(0, CEIL, za), cb = P(0, CEIL, zb);
      gr = ctx.createLinearGradient(0, ca[1], 0, cb[1]);
      gr.addColorStop(0, mix(COL.ceil, fa)); gr.addColorStop(1, mix(COL.ceil, fb));
      ctx.fillStyle = gr; ctx.fill();
      const cs = 2;
      for (let zc = Math.ceil(za / cs) * cs; zc + cs <= zb + 1e-6; zc += cs) {
        const f = fogF(zc + cs / 2 - cam.z);
        if (f > 0.95) continue;
        for (let i = -4; i < 4; i++) {
          const x0 = i * cs + 0.25, x1 = i * cs + cs - 0.25;
          quad(P(x0, CEIL, zc + 0.25), P(x1, CEIL, zc + 0.25), P(x1, CEIL, zc + cs - 0.25), P(x0, CEIL, zc + cs - 0.25));
          ctx.fillStyle = mix(COL.coffer, f); ctx.fill();
          quad(P(x0 + 0.3, CEIL, zc + 0.55), P(x1 - 0.3, CEIL, zc + 0.55), P(x1 - 0.3, CEIL, zc + cs - 0.55), P(x0 + 0.3, CEIL, zc + cs - 0.55));
          ctx.fillStyle = mix(COL.ceil, f); ctx.fill();
          const r = P(i * cs + cs / 2, CEIL, zc + cs / 2);
          ctx.fillStyle = mix(COL.cofferDeep, Math.max(f, 0.35));
          ctx.beginPath(); ctx.arc(r[0], r[1], Math.max(0.6, (0.09 * F) / (zc + cs / 2 - cam.z)), 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = hallCanvas.clientWidth || window.innerWidth;
      h = hallCanvas.clientHeight || window.innerHeight;
      hallCanvas.width = Math.round(w * dpr);
      hallCanvas.height = Math.round(h * dpr);
      F = Math.max(w * 0.62, h * 0.95);
      cx = w / 2;
      cy = h / 2;
      if (!marble) paintMarble();
      else marblePattern = ctx.createPattern(marble, 'repeat');
      lastKey = '';
    }

    function render(camera) {
      cam = camera;
      const key = `${w}|${h}|${cam.x.toFixed(3)}|${cam.y.toFixed(3)}|${cam.z.toFixed(3)}`;
      if (key === lastKey) return;          // nothing moved: keep the last frame
      lastKey = key;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // The luminous distance
      const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) * 0.6);
      hg.addColorStop(0, 'rgb(248,245,237)');
      hg.addColorStop(0.5, 'rgb(242,236,223)');
      hg.addColorStop(1, 'rgb(231,221,199)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, w, h);

      // Far to near: wall, bay, wall, bay …
      const first = Math.floor((cam.z + NEAR) / SPACING) + 1;
      const last = Math.floor((cam.z + FAR) / SPACING);
      for (let k = last; k >= first; k--) {
        const z = k * SPACING;
        drawBay(z, z + SPACING);
        drawArchWall(z);
      }
      drawBay(cam.z + NEAR, first * SPACING);

      // Soft daylight falling from high on the left
      ctx.globalCompositeOperation = 'lighter';
      const beams = [[0.08, 0.34, 0.05], [0.22, 0.5, 0.035], [-0.04, 0.2, 0.03]];
      for (const [x, spread, a] of beams) {
        const bx = w * x - cam.x * 6, top = -h * 0.1;
        const lg = ctx.createLinearGradient(bx, top, bx + w * 0.55, h);
        lg.addColorStop(0, `rgba(255,246,226,${a})`);
        lg.addColorStop(1, 'rgba(255,246,226,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(bx, top);
        ctx.lineTo(bx + w * spread * 0.35, top);
        ctx.lineTo(bx + w * (0.55 + spread), h * 1.05);
        ctx.lineTo(bx + w * 0.55, h * 1.05);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // Warm vignette
      const vg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.hypot(w, h) * 0.62);
      vg.addColorStop(0, 'rgba(120,96,64,0)');
      vg.addColorStop(1, 'rgba(120,96,64,0.2)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    return { resize, render };
  })();

  // ---------- Frame loop --------------------------------------------------

  let last = performance.now();

  function frameLoop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const y = window.scrollY;
    const p = clamp((y - L.trackTop) / L.travel);
    state.p = p;

    state.smx += (state.mx - state.smx) * Math.min(1, dt * 2.2);
    state.smy += (state.my - state.smy) * Math.min(1, dt * 2.2);

    // --- footage: plays at the threshold, and keeps playing through the start of the automatic journey
    const atTop = p <= 0.001;
    if (atTop) {
      if (video.paused && !state.autoRunning && !state.playPending) {
        if (video.ended || video.currentTime >= CLIP_END - 0.02) restartLoop(); else safePlay();
      }
      if (!video.paused && !state.autoRunning) {
        if (video.currentTime >= AUTO_AT && canAutoTravel()) startAutoJourney();
        else if (video.currentTime >= LOOP_END && (state.stayed || state.journeyDone || reduceMotion)) restartLoop();
      }
    } else {
      if (!state.autoRunning && !video.paused) video.pause();
      state.atTopSince = now;
    }

    // Wall-clock fallback when the footage cannot autoplay (e.g. low-power mode)
    if (atTop && !state.firstPlayStarted && now - state.loadedAt > 5600 && canAutoTravel()) {
      startAutoJourney();
    }

    if (state.loopFade > 0) {
      state.loopFade = Math.max(0, state.loopFade - dt / LOOP_FADE);
      const a = state.loopFade * state.loopFade * (3 - 2 * state.loopFade);
      xfade.style.opacity = a.toFixed(3);
    }

    // --- the camera: continue the footage's push-in, straight into its centre
    const zp = clamp(p / 0.72);
    const scale = Math.exp(Math.log(MAX_ZOOM) * Math.pow(zp, 2.1));
    const k = easeInOutSine(clamp(p / 0.5));
    const tx = (L.vw / 2 - L.fx) * k;
    const ty = (L.vh / 2 - L.fy) * k;
    world.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;

    // --- the light at the centre opens up and swallows the frame
    const bA = smooth(0.03, 0.3, p);
    bloom.style.opacity = bA.toFixed(3);
    if (bA > 0) {
      const r = L.diag * (0.06 + 1.35 * Math.pow(smooth(0.12, 0.64, p), 2));
      bloom.style.width = bloom.style.height = `${(r * 2).toFixed(1)}px`;
      bloom.style.transform = `translate3d(${(L.fx + tx - r).toFixed(1)}px, ${(L.fy + ty - r).toFixed(1)}px, 0)`;
    }

    vignette.style.opacity = (0.6 * (1 - smooth(0.05, 0.45, p))).toFixed(3);
    const stageA = 1 - smooth(0.62, 0.8, p);
    stage.style.opacity = stageA.toFixed(3);
    stage.style.visibility = stageA > 0 ? 'visible' : 'hidden';
    world.style.visibility = bA > 0.999 && p > 0.6 ? 'hidden' : 'visible';

    // --- the hall: the camera keeps moving forward out of the light, then walks on as the visitor scrolls
    const hA = smooth(0.5, 0.7, p);
    hallCanvas.style.opacity = hA.toFixed(3);
    if (hA > 0) {
      const arrive = easeOutCubic(clamp((p - 0.45) / 0.55));
      const walk = Math.max(0, y - L.trackTop - L.travel) / L.vh;    // viewport heights past the journey
      const camZ = -1.8 - 26 * (1 - arrive) + walk * 4.5;
      hall.render({ x: state.smx * 0.35, y: state.smy * 0.18, z: camZ });
    }

    // --- whisper & countdown
    const vt = video.currentTime || 0;
    const firstPlay = state.firstPlayStarted ? (now - state.firstPlayStarted) / 1000 : 0;
    const showLinger = atTop && !reduceMotion && !state.stayed && !state.journeyDone &&
                       !state.autoRunning && firstPlay > 0.6;
    const showEnter = atTop && (state.stayed || state.journeyDone || reduceMotion) &&
                      !state.autoRunning && (now - state.atTopSince) > 1400;
    whisper.classList.toggle('show-linger', showLinger);
    whisper.classList.toggle('show-enter', showEnter && !showLinger);
    countdown.classList.toggle('is-on', showLinger);
    if (showLinger) countdownBar.style.transform = `scaleX(${clamp(vt / AUTO_AT).toFixed(3)})`;

    requestAnimationFrame(frameLoop);
  }

  // ---------- Start -------------------------------------------------------

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.p <= 0.001) safePlay();
  });

  layout();
  safePlay();
  requestAnimationFrame((t) => { last = t; frameLoop(t); });
})();
