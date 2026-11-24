# Naksh — portfolio

Static site, no build step. Run `python3 dev_server.py` and open `http://localhost:8000/`. The local server falls back to `index.html` for client-side routes such as `/aboutme`.

## Part A — the threshold

1. **Opening** — `assets/intro.webm` / `assets/intro.mp4`: the 4K (3840×2160, 30 fps, 4.9 s) School of Athens
   animation, played once from start to finish at 1×, untouched (no filters, overlays, canvas or re-encoding).
2. **Transition** — when the footage ends, the camera carries its push-in on into the light between Plato and
   Aristotle; the light swallows the frame.
3. **Atrium** — `#atrium` emerges from the light: an editorial collage built after `assets/main_page.png`
   (the design reference; it is not loaded by the page). The visitor then scrolls on into `#dimension-1`.

Visitors can click/tap (or press Esc) to stay on the opening, which then loops with a dissolve.

### Video delivery
- The `<video>` lists `intro.mp4` (H.264) first and `intro.webm` (VP9) second; the browser plays the first it supports,
  each with `?v=` so old cached cuts can't
  appear. **When replacing the videos, change the `?v=` value on both sources and the poster.**
- The opening is never skipped: if a browser refuses to autoplay, "tap to begin" appears and the camera waits.
- `assets/intro-poster.jpg` is the first frame at 2560 px, shown only until the first frame decodes.
- The atrium's images are requested only after the video reports `canplaythrough`, so they never compete with it.

### Files
- `index.html` — threshold, atrium (collage pieces), `#dimension-1` (empty, for content), image credits.
- `main.js` — source selection, layout, playback/loop, the camera move, auto-journey / stay logic, atrium reveal.
- `styles.css` — palette tokens, the atrium grid (24×24 on landscape, 12×24 on portrait screens).
- `assets/main/` — collage images (WebP, several widths). Sources and licences are in the page footer.

Tunables at the top of `main.js`: `FOCUS`, `AUTO_TRAVEL_MS`, `MAX_ZOOM`, `ZOOM_LINEAR`, `DEPART_SPEED`.
The journey length is `--travel` in `styles.css`. Reusable styles for future content: `.plate`, `.card`,
`.label`, `.drawing`.
