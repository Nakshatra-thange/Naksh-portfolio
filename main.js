/* ------------------------------------------------------------------
   Naksh — Part A: the threshold
   Opening footage → camera falls into an eye → the black galaxy.
   ------------------------------------------------------------------ */
(() => {
  'use strict';

  // ---------- Constants ---------------------------------------------------

  const SRC_W = 720;
  const SRC_H = 1280;
  // The chosen eye: the meditating figure's right eye (viewer's right), in source pixels.
  const EYE = { x: 374.5 / SRC_W, y: 806 / SRC_H, r: 3.3 / SRC_W };

  const LOOP_END = 2.97;        // only the first three seconds are ever shown
  const LOOP_FADE = 1.1;        // seconds the faces take to dissolve when the loop restarts
  const AUTO_TRAVEL_MS = 3600;  // duration of the automatic journey into the eye
  const SNAP_IDLE_MS = 170;     // pause in manual scrolling before the camera settles
  const BLEED = 32;             // .extend canvas bleed (matches CSS)
  const EXT_DPR = 0.5;          // the extension is blurred, so it can be drawn small

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- Elements ----------------------------------------------------

  const $ = (s) => document.querySelector(s);
  const threshold = $('#threshold');
  const stage = $('.stage');
  const world = $('.world');
  const extend = $('.extend');
  const frame = $('.frame');
  const video = $('#intro');
  const xfade = $('.crossfade');
  const pupil = $('.pupil');
  const glint = $('.glint');
  const vignette = $('.vignette');
  const whisper = $('.whisper');
  const countdown = $('.countdown');
  const countdownBar = countdown.querySelector('span');
  const firstDimension = $('#dimension-1');
  const galaxyCanvas = $('#galaxy');

  const extCtx = extend.getContext('2d', { alpha: false });
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
  // The journey: slow departure, the plunge at full speed, a long settling arrival
  const easeJourney = (t) => (t < 0.45 ? 4.3896 * t * t * t
                                       : 1 - 0.6 * Math.pow((1 - t) / 0.55, 2.2));

  // ---------- State -------------------------------------------------------

  const L = {};                 // layout cache
  const state = {
    p: 0,                       // journey progress: 0 = threshold, 1 = inside the galaxy
    prevP: 0,
    lastY: 0,
    dir: 1,
    stayed: false,              // visitor chose to remain at the threshold
    journeyDone: false,         // the automatic journey has happened (or been forfeited)
    autoRunning: false,
    glide: null,                // active programmatic scroll
    programmaticY: -1,
    touching: false,
    snapTimer: 0,
    firstPlayStarted: 0,
    atTopSince: performance.now(),
    loopFade: 0,                // 1 → 0 while the loop dissolves
    playPending: false,
    mx: 0, my: 0, smx: 0, smy: 0,
    loadedAt: performance.now(),
  };

  // ---------- Layout ------------------------------------------------------

  function layout() {
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    L.vw = vw; L.vh = vh;

    let w, h, x0, y0;
    const extended = vw / vh > SRC_W / SRC_H;

    if (extended) {
      // Wide screens: the footage keeps its true proportions at full height (slightly
      // over-scaled), and mirrored copies continue the landscape to either side.
      h = vh * 1.1;
      w = h * (SRC_W / SRC_H);
      x0 = (vw - w) / 2;
      y0 = clamp(vh * 0.56 - EYE.y * h, vh - h, 0);
    } else {
      // Tall screens: cover, framed around the figure.
      const s = Math.max(vw / SRC_W, vh / SRC_H) * 1.04;
      w = SRC_W * s; h = SRC_H * s;
      x0 = clamp(vw / 2 - EYE.x * w, vw - w, 0);
      y0 = clamp(vh * 0.56 - EYE.y * h, vh - h, 0);
    }

    Object.assign(L, { w, h, x0, y0, extended });
    L.ex = x0 + EYE.x * w;
    L.ey = y0 + EYE.y * h;
    L.r0 = EYE.r * w;
    // Scale at which the pupil swallows the whole screen
    L.smax = (Math.hypot(vw, vh) * 0.62) / L.r0;

    frame.style.left = `${x0}px`;
    frame.style.top = `${y0}px`;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.classList.toggle('is-extended', extended);
    world.style.transformOrigin = `${L.ex}px ${L.ey}px`;

    extend.style.display = extended ? 'block' : 'none';
    extend.width = Math.ceil((vw + BLEED * 2) * EXT_DPR);
    extend.height = Math.ceil((vh + BLEED * 2) * EXT_DPR);

    L.trackTop = threshold.offsetTop;
    L.travel = Math.max(1, threshold.offsetHeight - vh);
    L.arrival = firstDimension.offsetTop;     // where the first dimension begins

    drawExtension();
    galaxy.resize();
  }

  // ---------- Footage -----------------------------------------------------

  function drawTiles(ctx, source, alpha) {
    const { w, h, x0, y0, vw } = L;
    ctx.globalAlpha = alpha;
    const left = x0 + BLEED;
    const top = y0 + BLEED;
    const span = vw + BLEED * 2;
    const nLeft = Math.ceil(left / w);
    const nRight = Math.ceil((span - (left + w)) / w);
    for (let i = -nLeft; i <= nRight; i++) {
      if (i === 0) continue;                    // the centre is the real footage
      const x = left + i * w;
      if (Math.abs(i) % 2 === 1) {              // mirror alternate tiles: seamless horizon
        ctx.save();
        ctx.translate(x + w, top);
        ctx.scale(-1, 1);
        ctx.drawImage(source, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(source, x, top, w, h);
      }
    }
    ctx.drawImage(source, left, top, w, h);
    ctx.globalAlpha = 1;
  }

  function drawExtension() {
    if (!L.extended || video.readyState < 2) return;
    extCtx.setTransform(EXT_DPR, 0, 0, EXT_DPR, 0, 0);
    extCtx.fillStyle = '#000';
    extCtx.fillRect(0, 0, L.vw + BLEED * 2, L.vh + BLEED * 2);
    drawTiles(extCtx, video, 1);
    if (state.loopFade > 0.001) drawTiles(extCtx, xfade, state.loopFade);
  }

  function restartLoop() {
    // Freeze the final frame on top, rewind underneath, then let the faces dissolve away.
    if (xfade.width !== SRC_W) { xfade.width = SRC_W; xfade.height = SRC_H; }
    try { xfCtx.drawImage(video, 0, 0, SRC_W, SRC_H); } catch (_) { /* not ready */ }
    state.loopFade = 1;
    xfade.style.opacity = '1';
    video.currentTime = 0;
    safePlay();
  }

  function safePlay() {
    if (state.playPending || !video.paused) return;
    state.playPending = true;
    const pr = video.play();
    if (pr && pr.then) pr.then(() => { state.playPending = false; }, () => { state.playPending = false; });
    else state.playPending = false;
  }

  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const onFrame = () => { drawExtension(); video.requestVideoFrameCallback(onFrame); };
    video.requestVideoFrameCallback(onFrame);
  }

  video.addEventListener('loadeddata', drawExtension);
  video.addEventListener('playing', () => {
    if (!state.firstPlayStarted) state.firstPlayStarted = performance.now();
  });
  video.addEventListener('ended', () => {
    if (state.p <= 0.001) onLoopEnd();
  });

  function onLoopEnd() {
    if (canAutoTravel()) startAutoJourney();
    else restartLoop();
  }

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
    video.pause();
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

  // Settle the camera after manual scrolling inside the journey: never leave the visitor half-way into an eye.
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

  // Any hand on the wheel or screen takes the camera back from the automatic journey.
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

  // ---------- The galaxy --------------------------------------------------

  const galaxy = (() => {
    const ctx = galaxyCanvas.getContext('2d', { alpha: false });
    let w = 0, h = 0, dpr = 1, stars = [], nebula = null, nebSize = 0;
    let energy = 0, t = 0;
    const tints = ['#ffffff', '#dfe7ff', '#c9d6ff', '#fff2de', '#ffe1c7'];

    const gauss = () => {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    function spawn(s, far) {
      s.x = (Math.random() * 2 - 1) * 1.8;
      s.y = (Math.random() * 2 - 1) * 1.8;
      s.z = far ? 1 : 0.04 + Math.random() * 0.96;
      s.a = 0.35 + Math.random() * 0.65;
      s.s = 0.5 + Math.pow(Math.random(), 3) * 1.6;
      s.c = tints[(Math.random() * tints.length) | 0];
      s.tw = Math.random() * Math.PI * 2;
      s.tws = 0.6 + Math.random() * 2.2;
      return s;
    }

    function paintNebula() {
      // A faint galactic band and a few deep-coloured clouds, painted once per size.
      nebSize = Math.ceil(Math.hypot(w, h) * 1.15);
      const n = Math.ceil(nebSize * 0.5);
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const g = c.getContext('2d');
      g.translate(n / 2, n / 2);
      g.rotate(-0.42);
      g.globalCompositeOperation = 'lighter';

      const clouds = [
        [-0.28, -0.02, 0.36, 'rgba(66, 38, 122, 0.14)'],
        [0.06, 0.03, 0.30, 'rgba(28, 48, 118, 0.14)'],
        [0.30, -0.04, 0.26, 'rgba(110, 52, 96, 0.08)'],
        [-0.05, 0.00, 0.14, 'rgba(180, 170, 210, 0.05)'],
        [0.42, 0.06, 0.20, 'rgba(18, 86, 112, 0.05)'],
      ];
      for (const [cx, cy, r, col] of clouds) {
        const rad = g.createRadialGradient(cx * n, cy * n, 0, cx * n, cy * n, r * n);
        rad.addColorStop(0, col);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        g.save();
        g.scale(1, 0.45);
        g.fillStyle = rad;
        g.fillRect(-n, -n * 2, n * 2, n * 4);
        g.restore();
      }

      const dust = Math.round(n * 7);
      for (let i = 0; i < dust; i++) {
        const x = (Math.random() - 0.5) * n * 1.1;
        const y = gauss() * n * 0.055 * (1 + Math.abs(x) / n);
        const a = Math.random() * 0.16 * Math.exp(-Math.abs(y) / (n * 0.08));
        g.fillStyle = Math.random() < 0.8 ? `rgba(220,226,255,${a})` : `rgba(255,214,180,${a})`;
        const r = Math.random() < 0.97 ? 0.5 : 1.1;
        g.fillRect(x, y, r, r);
      }

      // Dark lanes through the band
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * n * 0.8;
        const y = gauss() * n * 0.015;
        const r = n * (0.04 + Math.random() * 0.07);
        const rad = g.createRadialGradient(x, y, 0, x, y, r);
        rad.addColorStop(0, 'rgba(0,0,0,0.5)');
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rad;
        g.save(); g.translate(x, y); g.scale(2.6, 0.5); g.translate(-x, -y);
        g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
      }
      nebula = c;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = galaxyCanvas.clientWidth || window.innerWidth;
      h = galaxyCanvas.clientHeight || window.innerHeight;
      galaxyCanvas.width = Math.round(w * dpr);
      galaxyCanvas.height = Math.round(h * dpr);
      const count = Math.round(clamp((w * h) / 950, 450, 2000));
      stars = Array.from({ length: count }, () => spawn({}, false));
      paintNebula();
    }

    function push(amount) { energy = clamp(energy + amount, -1.2, 1.6); }

    function render(dt, scrollY) {
      t += dt;
      energy *= Math.exp(-dt / (reduceMotion ? 0.3 : 1.1));
      const cx = w / 2, cy = h / 2;
      const focal = Math.max(w, h) * 0.55;
      const speed = (reduceMotion ? 0.002 : 0.006) + energy * (reduceMotion ? 0.12 : 1.4);   // depth units / second
      const px = state.smx * 18, py = state.smy * 12;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // Nebula — slow rotation, a hint of parallax with pointer and scroll
      ctx.save();
      ctx.translate(cx - px * 0.4, cy - py * 0.4 - (scrollY - L.arrival) * 0.02);
      ctx.rotate(t * 0.0035);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(nebula, -nebSize / 2, -nebSize / 2, nebSize, nebSize);
      ctx.restore();

      // Stars
      const streak = Math.abs(speed) > 0.08;
      ctx.lineCap = 'round';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const pz = s.z;
        s.z -= speed * dt;
        if (s.z <= 0.02) { spawn(s, true); continue; }
        if (s.z > 1) { spawn(s, false); s.z = 0.05 + Math.random() * 0.2; continue; }
        const depth = 1 - s.z;
        const sx = cx + (s.x / s.z) * focal - px * depth;
        const sy = cy + (s.y / s.z) * focal - py * depth;
        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) {
          if (speed > 0) spawn(s, true);
          continue;
        }
        const twinkle = 0.75 + 0.25 * Math.sin(t * s.tws + s.tw);
        const alpha = clamp(Math.pow(depth, 1.4) * 1.5) * s.a * twinkle;
        if (alpha < 0.02) continue;
        const size = s.s * (0.35 + depth * 1.5);
        ctx.globalAlpha = alpha;
        if (streak) {
          const ox = cx + (s.x / pz) * focal - px * depth;
          const oy = cy + (s.y / pz) * focal - py * depth;
          ctx.strokeStyle = s.c;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = s.c;
          if (size > 1.6) {
            ctx.beginPath();
            ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    return { resize, render, push };
  })();

  // ---------- Frame loop --------------------------------------------------

  let last = performance.now();

  function frameLoop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const y = window.scrollY;
    const p = clamp((y - L.trackTop) / L.travel);
    state.prevP = state.p;
    state.p = p;

    state.smx += (state.mx - state.smx) * Math.min(1, dt * 2.2);
    state.smy += (state.my - state.smy) * Math.min(1, dt * 2.2);

    // --- footage: play only while the visitor is at the threshold
    const atTop = p <= 0.001;
    if (atTop) {
      if (video.paused && !state.autoRunning) safePlay();
      if (!video.paused && video.currentTime >= LOOP_END) onLoopEnd();
    } else {
      if (!video.paused) video.pause();
      state.atTopSince = now;
    }

    // Wall-clock fallback when the footage cannot autoplay (e.g. low-power mode)
    if (atTop && !state.firstPlayStarted && now - state.loadedAt > 4200 && canAutoTravel()) {
      startAutoJourney();
    }

    // dissolve after a loop restart
    if (state.loopFade > 0) {
      state.loopFade = Math.max(0, state.loopFade - dt / LOOP_FADE);
      const a = state.loopFade * state.loopFade * (3 - 2 * state.loopFade);
      xfade.style.opacity = a.toFixed(3);
      if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype) || video.paused) drawExtension();
    } else if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype) && !video.paused) {
      drawExtension();
    }

    // --- the camera
    const breathe = 1 + 0.012 * Math.sin(now / 2600) * (1 - smooth(0, 0.2, p));
    const zp = clamp(p / 0.8);
    const scale = Math.exp(Math.log(L.smax) * Math.pow(zp, 2.5)) * breathe;
    const k = easeInOutSine(clamp(p / 0.62));
    const tx = (L.vw / 2 - L.ex) * k;
    const ty = (L.vh / 2 - L.ey) * k;
    world.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;

    // Drop layers that are no longer visible: filters and masks on a layer scaled hundreds of
    // times are very costly to rasterise.
    const frameCovers = L.w * scale > L.vw * 1.4;
    const pupilCovers = L.r0 * scale * 0.9 > Math.hypot(L.vw, L.vh) / 2;
    world.style.visibility = pupilCovers ? 'hidden' : 'visible';
    extend.style.visibility = L.extended && !frameCovers ? 'visible' : 'hidden';
    frame.classList.toggle('is-extended', L.extended && !frameCovers);

    if (L.extended && !frameCovers) {
      const par = 1 - smooth(0, 0.3, p);
      extend.style.transform = `translate3d(${(-state.smx * 14 * par).toFixed(2)}px, ${(-state.smy * 8 * par).toFixed(2)}px, 0)`;
    }

    // the pupil, drawn crisply at any scale
    const ex = L.ex + tx, ey = L.ey + ty;
    const pr = L.r0 * scale * 1.04;
    const pupilA = smooth(0.0, 0.16, p);
    pupil.style.opacity = pupilA.toFixed(3);
    if (pupilA > 0) {
      pupil.style.width = pupil.style.height = `${(pr * 2).toFixed(2)}px`;
      pupil.style.transform = `translate3d(${(ex - pr).toFixed(2)}px, ${(ey - pr).toFixed(2)}px, 0)`;
    }

    // catch-light: the eye is chosen just before the plunge
    const vt = video.currentTime || 0;
    const g = Math.max(smooth(2.15, 2.75, vt) * (1 - state.loopFade), smooth(0, 0.03, p)) *
              (1 - smooth(0.05, 0.22, p));
    glint.style.opacity = (g * 0.9).toFixed(3);
    if (g > 0) {
      const gs = clamp((L.r0 * scale) / 7, 0.32, 2.2);
      glint.style.transform = `translate3d(${(ex - 48 - pr * 0.25).toFixed(2)}px, ${(ey - 48 - pr * 0.3).toFixed(2)}px, 0) scale(${gs.toFixed(3)})`;
    }

    vignette.style.opacity = (0.6 + 0.4 * smooth(0.05, 0.55, p)).toFixed(3);
    const stageA = 1 - smooth(0.82, 0.94, p);
    stage.style.opacity = stageA.toFixed(3);
    stage.style.visibility = stageA > 0 ? 'visible' : 'hidden';

    // --- the galaxy
    const gA = smooth(0.78, 0.99, p);
    galaxyCanvas.style.opacity = gA.toFixed(3);
    const dp = p - state.prevP;
    if (p > 0.55 && dp !== 0) galaxy.push(dp * 7);
    if (gA > 0) galaxy.render(dt, y);

    // --- whisper & countdown
    const firstPlay = state.firstPlayStarted ? (now - state.firstPlayStarted) / 1000 : 0;
    const showLinger = atTop && !reduceMotion && !state.stayed && !state.journeyDone &&
                       !state.autoRunning && firstPlay > 0.5;
    const showEnter = atTop && (state.stayed || state.journeyDone || reduceMotion) &&
                      !state.autoRunning && (now - state.atTopSince) > 1400;
    whisper.classList.toggle('show-linger', showLinger);
    whisper.classList.toggle('show-enter', showEnter && !showLinger);
    countdown.classList.toggle('is-on', showLinger);
    if (showLinger) countdownBar.style.transform = `scaleX(${clamp(vt / LOOP_END).toFixed(3)})`;

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
