# Naksh — portfolio

Static site, no build step. Serve the folder (e.g. `python3 -m http.server`) and open `index.html`.

## Part A — the threshold

- `assets/intro.webm` / `intro.mp4` — the opening footage, pre-cut to 5.0 s: source 0–3 s at normal speed,
  then source 3–11 s at 4× (frame-blended for smooth motion). No audio. `intro-poster.jpg` is its first frame.
- `index.html` — `#threshold` (opening + journey into the light) followed directly by `#dimension-1` (empty, for content).
- `main.js` — layout, playback/loop, the push into the centre, auto-journey / stay logic, and the hall renderer (canvas).
- `styles.css` — palette tokens and everything visual.

Tunables at the top of `main.js`: `FOCUS` (point the camera travels into), `AUTO_AT`, `LOOP_END`, `AUTO_TRAVEL_MS`, `MAX_ZOOM`.
Hall colours are in `COL` inside the `hall` module. The journey length is `--travel` in `styles.css`.

Add content inside `#dimension-1 .dimension__inner`, or add more `<section class="dimension">` blocks after it;
the hall stays fixed behind them and the camera walks forward through its arches as the page scrolls.
