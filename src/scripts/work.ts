/** Work page: shareable filters, in-view reel autoplay, auto-advancing carousels. */
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initWork(root: HTMLElement) {
  initFilters(root);
  initMasonry(root);
  root.querySelectorAll<HTMLVideoElement>('video[data-reel]').forEach(initReel);
  root.querySelectorAll<HTMLElement>('[data-carousel]').forEach((el) => initCarousel(el, Number(el.dataset.index) || 0));
}

// ---------- filters (?type=reels) ----------
function initFilters(root: HTMLElement) {
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const tiles = [...root.querySelectorAll<HTMLElement>('[data-type]')];
  const infos = [...root.querySelectorAll<HTMLElement>('[data-style-info]')];
  const status = root.querySelector<HTMLElement>('[data-filter-status]');
  const more = root.querySelector<HTMLButtonElement>('[data-more]');
  const moreLabel = more?.querySelector<HTMLElement>('[data-more-label]');
  const moreCount = more?.querySelector<HTMLElement>('[data-more-count]');
  const limit = Number(root.dataset.limit) || Infinity;
  const valid = new Set(chips.map((c) => c.dataset.filter));
  let current = 'all';
  let expanded = false;

  const apply = (value: string, push: boolean) => {
    if (!valid.has(value)) value = 'all';
    current = value;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === value)));
    infos.forEach((el) => { el.hidden = el.dataset.styleInfo !== value; });
    // "All" shows the first `limit` samples until "Show more" is pressed; a single filter shows everything in it.
    const capped = value === 'all' && !expanded;
    let shown = 0;
    tiles.forEach((t) => {
      const match = value === 'all' || t.dataset.type === value;
      const show = match && !(capped && shown >= limit);
      t.hidden = !show;
      if (show) shown++;
    });
    if (more) {
      const hiddenCount = value === 'all' ? tiles.length - Math.min(tiles.length, limit) : 0;
      more.hidden = hiddenCount <= 0;
      more.setAttribute('aria-expanded', String(expanded));
      if (moreLabel) moreLabel.textContent = expanded ? 'Show less' : 'Show more work';
      if (moreCount) moreCount.textContent = expanded ? '' : `+${hiddenCount}`;
    }
    if (status) status.textContent = `Showing ${shown} of ${value === 'all' ? tiles.length : shown} ${shown === 1 ? 'item' : 'items'}`;
    if (push) {
      const url = new URL(location.href);
      if (value === 'all') url.searchParams.delete('type');
      else url.searchParams.set('type', value);
      history.replaceState(null, '', url);
    }
  };

  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filter!, true)));
  more?.addEventListener('click', () => {
    const wasExpanded = expanded;
    expanded = !expanded;
    apply(current, false);
    // collapsing: bring the button back into view instead of leaving the reader far below it
    if (wasExpanded) more.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  apply((new URL(location.href).searchParams.get('type') || 'all').toLowerCase(), false);
}

// ---------- masonry: tiles of different shapes (9:16, 16:9, 4:5) pack without gaps ----------
function initMasonry(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-grid]').forEach((grid) => {
    const ROW = 4;
    const layout = () => {
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      grid.querySelectorAll<HTMLElement>('.tile').forEach((t) => {
        if (t.hidden) return;
        t.style.gridRowEnd = `span ${Math.ceil((t.getBoundingClientRect().height + gap) / ROW)}`;
      });
    };
    grid.dataset.masonry = '';
    const ro = new ResizeObserver(() => requestAnimationFrame(layout));
    grid.querySelectorAll('.tile').forEach((t) => ro.observe(t));
    layout();
  });
}

// ---------- reels: play in view, pause out of view, tap toggles sound ----------
function initReel(video: HTMLVideoElement) {
  const tile = video.closest('.tile')!;
  const sound = tile.querySelector<HTMLButtonElement>('[data-sound]');
  video.muted = true;

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !reduceMotion()) video.play().catch(() => {});
      else video.pause();
    },
    { threshold: 0.4 },
  );
  io.observe(video);

  const toggleSound = () => {
    video.muted = !video.muted;
    if (!video.muted) video.play().catch(() => {});
    sound?.setAttribute('aria-pressed', String(!video.muted));
    sound?.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
  };
  if (sound) {
    sound.addEventListener('click', toggleSound);
    video.addEventListener('click', toggleSound);
  }
}

// ---------- carousels: auto-advance every 5s, staggered, pause on hover/focus/off-screen ----------
function initCarousel(el: HTMLElement, order: number) {
  const track = el.querySelector<HTMLElement>('[data-track]')!;
  const counter = el.querySelector<HTMLElement>('[data-counter]');
  const dots = [...el.querySelectorAll<HTMLElement>('.cdot')];
  const n = track.children.length;
  const INTERVAL = 5000;
  let i = 0;
  let visible = false;
  let hovered = false;
  let focused = false;
  let timer: number | undefined;
  let startDelay: number | undefined;

  const show = (next: number) => {
    i = ((next % n) + n) % n;
    track.style.transform = `translateX(-${i * 100}%)`;
    if (counter) counter.textContent = `${i + 1} / ${n}`;
    dots.forEach((d, k) => d.toggleAttribute('data-on', k === i));
    [...track.children].forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
  };

  const stop = () => { clearInterval(timer); clearTimeout(startDelay); timer = startDelay = undefined; };
  const sync = () => {
    const run = visible && !hovered && !focused && !reduceMotion() && !el.closest('[hidden]');
    if (!run) return stop();
    if (timer || startDelay) return;
    // stagger: each carousel starts a little later so they don't all move at once
    startDelay = window.setTimeout(() => {
      startDelay = undefined;
      timer = window.setInterval(() => show(i + 1), INTERVAL);
    }, (order % 4) * 1250);
  };
  const restart = () => { stop(); sync(); };

  el.querySelector('[data-prev]')!.addEventListener('click', () => { show(i - 1); restart(); });
  el.querySelector('[data-next]')!.addEventListener('click', () => { show(i + 1); restart(); });
  el.addEventListener('mouseenter', () => { hovered = true; sync(); });
  el.addEventListener('mouseleave', () => { hovered = false; sync(); });
  el.addEventListener('focusin', () => { focused = true; sync(); });
  el.addEventListener('focusout', () => { focused = el.contains(document.activeElement); sync(); });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
  });

  // swipe
  let sx: number | null = null;
  el.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  el.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) { show(dx > 0 ? i - 1 : i + 1); restart(); }
  });

  // Slides sit off to the side, so lazy-loading would only start as each one slides in.
  // Once the carousel is near the screen, load them all.
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    el.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
    obs.disconnect();
  }, { rootMargin: '300px' }).observe(el);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.3 }).observe(el);
  show(0);
}
