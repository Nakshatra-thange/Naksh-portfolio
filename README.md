# Naksh — portfolio

Static site, no build step. Serve the folder (e.g. `python3 -m http.server`) and open `index.html`.

## Part A — the threshold

- `assets/intro.webm` / `intro.mp4` — the first 3 s of the reference footage (no audio), `intro-poster.jpg` its first frame.
- `index.html` — `#threshold` (opening + journey into the eye) followed directly by `#dimension-1` (empty, for future content).
- `main.js` — layout, loop, the eye zoom, auto-journey / stay logic, and the galaxy canvas.
- `styles.css` — everything visual.

Tunables at the top of `main.js`: `EYE` (which eye, in source pixels), `LOOP_END`, `LOOP_FADE`, `AUTO_TRAVEL_MS`.
The journey length is `--travel` in `styles.css`.

Add content inside `#dimension-1 .dimension__inner`, or add more `<section class="dimension">` blocks after it; the galaxy stays fixed behind them.
