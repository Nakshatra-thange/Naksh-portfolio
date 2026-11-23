/* ------------------------------------------------------------------
   Naksh — Part A: the threshold
   The School of Athens (4K, played in full at 1×) → the camera carries the
   footage's push-in on, into the light at its centre → the atrium.
   ------------------------------------------------------------------ */
(() => {
  'use strict';

  // ---------- Constants ---------------------------------------------------

  // The point the camera travels into: the light between Plato and Aristotle,
  // which is also where the footage's own push-in is heading.
  const FOCUS = { x: 0.497, y: 0.47 };

  const FALLBACK_DURATION = 4.9;  // intro.mp4 / intro.webm: 147 frames at 30 fps, played untouched
  const LOOP_FADE = 1.1;          // for visitors who stay: the footage loops with a dissolve
  const AUTO_TRAVEL_MS = 3800;
  const SNAP_IDLE_MS = 170;
  const MAX_ZOOM = 9;             // extra scale the camera adds on top of the footage's own push
  // The footage ends while still pushing in (~0.15 ln-zoom/s). The camera departs at that pace instead
  // of from a standstill, so the hand-off from footage to camera reads as one movement.
  const ZOOM_LINEAR = 0.3;
  const DEPART_SPEED = 0.35;

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
  const whisper = $('.whisper');
  const countdown = $('.countdown');
  const countdownBar = countdown.querySelector('span');
  const atrium = $('#atrium');
  const scene = $('.atrium__scene');
  const pieces = Array.from(document.querySelectorAll('.piece[data-depth]'))
    .map((el) => ({ el, depth: parseFloat(el.dataset.depth) || 0, last: '' }));

  const xfCtx = xfade.getContext('2d');

  for (const line of whisper.querySelectorAll('[data-fine]')) {
    line.textContent = finePointer ? line.dataset.fine : line.dataset.touch;
  }

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
  // The same journey, but leaving at the footage's own pace (slope DEPART_SPEED at t = 0, still 0 at t = 1)
  const easeDepart = (t) => easeJourney(t) + DEPART_SPEED * t * Math.pow(1 - t, 3);

  const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : FALLBACK_DURATION);
  const atFootageEnd = () => video.ended || video.currentTime >= duration() - 0.04;

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
    autoplayBlocked: false,
    atTopSince: performance.now(),
    loopFade: 0,
    playPending: false,
    mx: 0, my: 0, smx: 0, smy: 0,
    loadedAt: performance.now(),
    imagesRequested: false,
  };

  // ---------- Layout ------------------------------------------------------

  function layout() {
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const snap = (v) => Math.round(v * dpr) / dpr;           // whole device pixels: no resampling blur
    const srcW = video.videoWidth || 3840;
    const srcH = video.videoHeight || 2160;
    // The footage covers the viewport, untouched and undistorted, centred on its focus.
    const s = Math.max(vw / srcW, vh / srcH);
    const w = snap(srcW * s);
    const h = snap(srcH * s);
    const x0 = snap(clamp(vw / 2 - FOCUS.x * w, vw - w, 0));
    const y0 = snap(clamp(vh / 2 - FOCUS.y * h, vh - h, 0));
    Object.assign(L, { vw, vh, w, h, x0, y0, dpr, srcW, srcH });
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
    // The atrium overlaps the last viewport of the track, so the camera arrives exactly as p reaches 1.
    L.arrival = L.trackTop + L.travel;
    state.lastRenderY = -1;
  }

  // ---------- Footage -----------------------------------------------------

  function safePlay() {
    if (state.playPending || !video.paused || video.ended && state.autoRunning) return;
    state.playPending = true;
    const pr = video.play();
    if (pr && pr.then) {
      pr.then(() => { state.playPending = false; state.autoplayBlocked = false; },
              (err) => { state.playPending = false; if (err && err.name === 'NotAllowedError') state.autoplayBlocked = true; });
    } else state.playPending = false;
  }

  function restartLoop() {
    // Hold the final frame on top — at the resolution it is displayed at — rewind underneath, then dissolve.
    const cw = Math.min(L.srcW, Math.round(L.w * L.dpr));
    const ch = Math.min(L.srcH, Math.round(L.h * L.dpr));
    if (xfade.width !== cw || xfade.height !== ch) { xfade.width = cw; xfade.height = ch; }
    try { xfCtx.drawImage(video, 0, 0, cw, ch); } catch (_) { /* not ready */ }
    state.loopFade = 1;
    xfade.style.opacity = '1';
    video.currentTime = 0;
    safePlay();
  }

  // The footage has played in full, once, at its natural speed: the camera takes over.
  // A visitor who chose to stay gets the loop instead.
  function onFootageEnd() {
    if (state.p > 0.001 || state.autoRunning) return;
    if (canAutoTravel()) startAutoJourney();
    else if (state.stayed || state.journeyDone || reduceMotion) restartLoop();
  }

  // The footage may already be playing (or even finished) before this script runs — on a fast connection
  // or from a local file it starts the moment the page parses. Never rely on the 'playing' event alone.
  function notePlayback() {
    if (state.firstPlayStarted) return;
    if (!video.paused || video.ended || video.currentTime > 0) {
      state.firstPlayStarted = performance.now() - (video.currentTime || 0) * 1000;
    }
  }
  video.addEventListener('playing', notePlayback);
  video.addEventListener('timeupdate', notePlayback);
  video.addEventListener('ended', onFootageEnd);
  video.addEventListener('loadedmetadata', layout);
  // The atrium's images wait until the footage has what it needs, so they never compete with it.
  video.addEventListener('canplaythrough', () => setTimeout(requestImages, 600), { once: true });

  function requestImages() {
    if (state.imagesRequested) return;
    state.imagesRequested = true;
    document.querySelectorAll('img[data-srcset]').forEach((img) => {
      const shown = () => img.classList.add('is-loaded');
      img.addEventListener('load', () => { if (img.currentSrc && !img.currentSrc.startsWith('data:')) shown(); });
      img.srcset = img.dataset.srcset;
      img.removeAttribute('data-srcset');
    });
  }

  // ---------- Journey control --------------------------------------------

  function canAutoTravel() {
    return !reduceMotion && !!state.firstPlayStarted && !state.stayed && !state.journeyDone && !state.autoRunning &&
           document.visibilityState === 'visible' && window.scrollY <= 1;
  }

  function glideTo(target, ms, ease, done) {
    cancelGlide();
    const from = window.scrollY;
    const dist = target - from;
    if (Math.abs(dist) < 1) { done && done(); return; }
    const t0 = performance.now();
    const g = { raf: 0 };
    const step = (now) => {
      const t = clamp((now - t0) / ms);
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
    requestImages();
    // The footage rests on its final frame; the camera carries its push-in on into the centre.
    glideTo(L.arrival, AUTO_TRAVEL_MS, easeDepart, () => { state.autoRunning = false; });
    state.autoRunning = true;   // after glideTo, which clears it when replacing a glide
  }

  function stayHere() {
    state.stayed = true;
    state.journeyDone = true;
    if (window.scrollY > 1) {
      const d = window.scrollY / Math.max(1, L.arrival);
      glideTo(0, 700 + 1300 * Math.min(1, d), easeInOutCubic);
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
    if (y > 1) requestImages();
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
    if (!state.firstPlayStarted) { safePlay(); return; }        // first click only starts the footage
    if (state.p < 0.98) { takeControl(); stayHere(); safePlay(); }
  });
  stage.addEventListener('touchend', () => { if (!state.firstPlayStarted) safePlay(); }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    state.mx = (e.clientX / window.innerWidth) * 2 - 1;
    state.my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(layout);
  });

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

    // --- footage: plays in full at the threshold; rests on its last frame while the camera travels
    notePlayback();
    const atTop = p <= 0.001;
    if (atTop) {
      if (!state.autoRunning) {
        if (atFootageEnd()) onFootageEnd();
        else if (video.paused && !state.playPending) safePlay();
      }
    } else {
      if (!state.autoRunning && !video.paused) video.pause();
      state.atTopSince = now;
    }

    // The footage is never skipped: if the browser refuses to autoplay it (e.g. iOS low-power mode),
    // the visitor is invited to start it, and the journey only begins once it has played through.

    if (state.loopFade > 0) {
      state.loopFade = Math.max(0, state.loopFade - dt / LOOP_FADE);
      const a = state.loopFade * state.loopFade * (3 - 2 * state.loopFade);
      xfade.style.opacity = a.toFixed(3);
    }

    // --- the camera: continue the footage's push-in, straight into its centre
    let tx = 0, ty = 0;
    if (p > 0) {
      const zp = clamp(p / 0.72);
      const scale = Math.exp(Math.log(MAX_ZOOM) * (ZOOM_LINEAR * zp + (1 - ZOOM_LINEAR) * Math.pow(zp, 2.1)));
      const k = easeInOutSine(clamp(p / 0.5));
      tx = (L.vw / 2 - L.fx) * k;
      ty = (L.vh / 2 - L.fy) * k;
      world.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    } else if (world.style.transform !== 'none') {
      world.style.transform = 'none';      // at rest the footage is composited 1:1, with no transform at all
    }

    // --- the light at the centre opens up and swallows the frame
    const bA = smooth(0.03, 0.3, p);
    bloom.style.opacity = bA.toFixed(3);
    if (bA > 0) {
      const r = L.diag * (0.06 + 1.35 * Math.pow(smooth(0.12, 0.64, p), 2));
      bloom.style.width = bloom.style.height = `${(r * 2).toFixed(1)}px`;
      bloom.style.transform = `translate3d(${(L.fx + tx - r).toFixed(1)}px, ${(L.fy + ty - r).toFixed(1)}px, 0)`;
    }

    const stageA = 1 - smooth(0.62, 0.8, p);
    stage.style.opacity = stageA.toFixed(3);
    stage.style.visibility = stageA > 0 ? 'visible' : 'hidden';
    world.style.visibility = bA > 0.999 && p > 0.6 ? 'hidden' : 'visible';

    // --- the atrium: emerges from the light as the camera settles, then scrolls on with the page
    const aA = smooth(0.5, 0.7, p);
    atrium.style.opacity = aA.toFixed(3);
    atrium.style.visibility = aA > 0 ? 'visible' : 'hidden';
    if (aA > 0) {
      const arrive = reduceMotion ? 1 : easeOutCubic(clamp((p - 0.45) / 0.55));
      const sc = 1 + 0.12 * (1 - arrive);
      const st = arrive >= 1 ? 'none' : `scale(${sc.toFixed(4)})`;
      if (scene.style.transform !== st) scene.style.transform = st;

      // Gentle depth: pieces drift apart a little as the atrium scrolls away, and with the pointer.
      const past = Math.max(0, y - L.arrival);
      const q = 1 / L.dpr;
      for (const pc of pieces) {
        const dx = reduceMotion ? 0 : state.smx * pc.depth * -6;
        const dy = reduceMotion ? 0 : state.smy * pc.depth * -4 - past * pc.depth * 0.12;
        const t = `translate3d(${(Math.round(dx / q) * q).toFixed(2)}px, ${(Math.round(dy / q) * q).toFixed(2)}px, 0)`;
        if (t !== pc.last) { pc.el.style.transform = t; pc.last = t; }
      }
    }

    // --- whisper & countdown
    const vt = video.currentTime || 0;
    const firstPlay = state.firstPlayStarted ? (now - state.firstPlayStarted) / 1000 : 0;
    const showLinger = atTop && !reduceMotion && !state.stayed && !state.journeyDone &&
                       !state.autoRunning && firstPlay > 0.6;
    const showEnter = atTop && (state.stayed || state.journeyDone || reduceMotion) &&
                      !state.autoRunning && (now - state.atTopSince) > 1400;
    const showBegin = atTop && !state.firstPlayStarted && state.autoplayBlocked;
    whisper.classList.toggle('show-begin', showBegin);
    whisper.classList.toggle('show-linger', showLinger);
    whisper.classList.toggle('show-enter', showEnter && !showLinger);
    countdown.classList.toggle('is-on', showLinger);
    if (showLinger) countdownBar.style.transform = `scaleX(${clamp(vt / duration()).toFixed(3)})`;

    requestAnimationFrame(frameLoop);
  }

  // ---------- Start -------------------------------------------------------

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.p <= 0.001) safePlay();
  });

  // Images for the atrium are fetched once the footage is safely buffered, or after 8 s regardless.
  setTimeout(requestImages, 8000);

  video.addEventListener('error', () => console.warn('intro video failed to load', video.error), true);

  layout();
  notePlayback();
  safePlay();
  requestAnimationFrame((t) => { last = t; frameLoop(t); });
})();
