/* ------------------------------------------------------------------
   Shared accordion card component (Voice AI page, AI and me page).
   Pages call Accordion.build(listElement, items, idPrefix, renderBody, options)
   and use the small builders below to render each card's expanded body.
   ------------------------------------------------------------------ */
window.Accordion = (() => {
  'use strict';

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  // One section inside an expanded card: "1. The Problem" + its content.
  const section = (index, label, ...content) => {
    const s = el('section', 'acc-section');
    const h = el('h4', 'acc-section__label');
    h.append(el('span', 'acc-section__num', `${index}.`), document.createTextNode(` ${label}`));
    s.append(h, ...content.filter(Boolean));
    return s;
  };

  const bullets = (lines, ordered = false) => {
    const list = el(ordered ? 'ol' : 'ul', ordered ? 'acc-list acc-list--ordered' : 'acc-list');
    lines.forEach((line) => list.append(el('li', null, line)));
    return list;
  };

  // Links row. Entries with no href are skipped, so a missing demo leaves no gap.
  const linksRow = (links, placement = 'bottom') => {
    const row = el('div', `acc-links acc-links--${placement}`);
    links.filter((l) => l && l.href).forEach(({ label, href }) => {
      const a = el('a', 'acc-link', `${label} ↗`);
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      row.append(a);
    });
    return row.childElementCount ? row : null;
  };

  // Big figure + small label tiles.
  const stats = (results) => {
    const grid = el('dl', 'acc-stats');
    results.forEach(({ value, label }) => {
      const item = el('div', 'acc-stat');
      item.append(el('dt', 'acc-stat__value', value), el('dd', 'acc-stat__label', label));
      grid.append(item);
    });
    return grid;
  };

  const note = (text, className = 'acc-note') => (text ? el('p', className, text) : null);

  // Small table inside its own horizontal scroller, so it never widens the page.
  const table = ({ caption, head, rows }) => {
    const wrap = el('div', 'acc-table-wrap');
    const t = el('table', 'acc-table');
    if (caption) t.append(el('caption', null, caption));
    if (head) {
      const tr = el('tr');
      head.forEach((h) => tr.append(el('th', null, h)));
      const thead = el('thead');
      thead.append(tr);
      t.append(thead);
    }
    const tbody = el('tbody');
    rows.forEach((r) => {
      const tr = el('tr');
      r.forEach((c, i) => {
        const cell = el(i === 0 && !head ? 'th' : 'td', null, c);
        if (i === 0 && !head) cell.scope = 'row';
        tr.append(cell);
      });
      tbody.append(tr);
    });
    t.append(tbody);
    wrap.append(t);
    return wrap;
  };

  // ---- Diagram frame + lightbox ----
  let lightbox;
  const openLightbox = (src, alt) => {
    if (!lightbox) {
      lightbox = el('dialog', 'acc-lightbox');
      lightbox.setAttribute('aria-label', 'Architecture diagram');
      const img = el('img', 'acc-lightbox__img');
      const close = el('button', 'acc-lightbox__close', 'Close ×');
      close.type = 'button';
      close.addEventListener('click', () => lightbox.close());
      // Click outside the image (on the backdrop/dialog area) closes it. Esc is native to <dialog>.
      lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
      lightbox.append(close, img);
      document.body.append(lightbox);
    }
    const img = lightbox.querySelector('img');
    img.src = src;
    img.alt = alt;
    lightbox.showModal();
  };

  // Framed diagram with a fixed aspect ratio. Missing file -> "coming soon" placeholder, no broken icon.
  const diagram = (src, alt) => {
    const figure = el('figure', 'acc-diagram');
    const frame = el('div', 'acc-diagram__frame');
    const placeholder = el('p', 'acc-diagram__placeholder', 'Architecture diagram coming soon');
    frame.append(placeholder);
    figure.append(frame, el('figcaption', 'acc-diagram__caption', 'Architecture'));
    if (!src) return figure;

    const probe = new Image();
    probe.onload = () => {
      const button = el('button', 'acc-diagram__open');
      button.type = 'button';
      button.setAttribute('aria-label', `Open larger: ${alt}`);
      const img = el('img', 'acc-diagram__img');
      img.src = src;
      img.alt = alt;
      // Very wide diagrams keep a readable size and scroll sideways inside the frame only.
      if (probe.naturalWidth / probe.naturalHeight > 2.4) frame.classList.add('is-wide');
      button.append(img);
      button.addEventListener('click', () => openLightbox(src, alt));
      placeholder.replaceWith(button);
      frame.classList.add('has-image');
    };
    probe.src = src;
    return figure;
  };

  const setOpen = (card, open) => {
    card.classList.toggle('is-open', open);
    card.querySelector('.acc-card__toggle').setAttribute('aria-expanded', String(open));
    card.querySelector('.acc-card__panel').inert = !open;
  };

  // options.headerMeta(item) -> { badge, tag } shown under the subtitle in the collapsed header.
  // options.startAt: offset for the card numbers (startAt 4 -> first card is 05).
  const build = (list, items, idPrefix, renderBody, options = {}) => {
    if (!list) return;
    items.forEach((item, i) => {
      const num = String(i + 1 + (options.startAt || 0)).padStart(2, '0');
      const panelId = `${idPrefix}-panel-${num}`;
      const card = el('article', 'acc-card');

      const heading = el('h3', 'acc-card__heading');
      const toggle = el('button', 'acc-card__toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-controls', panelId);
      const titles = el('span', 'acc-card__titles');
      titles.append(el('span', 'acc-card__title', item.title), el('span', 'acc-card__subtitle', item.subtitle));
      const meta = options.headerMeta ? options.headerMeta(item) : null;
      if (meta && (meta.badge || meta.tag)) {
        const row = el('span', 'acc-card__meta');
        if (meta.badge) row.append(el('span', 'acc-card__badge', meta.badge));
        if (meta.tag) row.append(el('span', 'acc-card__tag', meta.tag));
        titles.append(row);
      }
      const icon = el('span', 'acc-card__icon');
      icon.setAttribute('aria-hidden', 'true');
      toggle.append(el('span', 'acc-card__num', num), titles, icon);
      heading.append(toggle);

      const panel = el('div', 'acc-card__panel');
      panel.id = panelId;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', item.title);
      const inner = el('div', 'acc-card__inner');
      const body = el('div', 'acc-card__body');
      body.append(...renderBody(item).filter(Boolean));
      inner.append(body);
      panel.append(inner);

      card.append(heading, panel);
      list.append(card);
      setOpen(card, false);

      toggle.addEventListener('click', () => {
        const willOpen = !card.classList.contains('is-open');
        list.querySelectorAll('.acc-card.is-open').forEach((c) => setOpen(c, false));
        setOpen(card, willOpen);
      });
    });
  };

  // Standard project body (AI and me, Fullstack): links first, Problem, What I Built,
  // Results (+ tables, notes), Architecture diagram, then the honest-limits line.
  const DIAGRAM_DIR = 'assets/diagrams/';
  const projectBody = (item) => [
    linksRow([
      { label: 'GitHub', href: item.github },
      item.demo ? { label: item.demo.label, href: item.demo.href } : null,
    ], 'top'),
    section(1, 'The Problem', bullets(item.problem)),
    section(2, 'What I Built', bullets(item.built, true)),
    section(3, 'Results',
      note(item.resultsIntro, 'acc-limits acc-results-intro'),
      stats(item.results),
      ...(item.tables || []).map(table),
      ...(item.notes || []).map((n) => note(n)),
    ),
    section(4, 'Architecture', diagram(item.diagram ? DIAGRAM_DIR + item.diagram : null, `${item.title} architecture diagram`)),
    note(item.limits, 'acc-limits'),
    note(item.next, 'acc-limits acc-next'),
  ];
  const projectHeaderMeta = (item) => ({ badge: item.badge, tag: item.tag });

  return { el, section, bullets, linksRow, stats, note, table, diagram, build, projectBody, projectHeaderMeta };
})();
