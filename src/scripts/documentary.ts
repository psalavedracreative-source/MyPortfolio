/** About page documentary: 5s crossfade, Ken Burns, progress segments, pause/play, pauses off-screen. */
export function initDocumentary(root: HTMLElement) {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
  const subs = [...root.querySelectorAll<HTMLElement>('[data-sub]')];
  const segs = [...root.querySelectorAll<HTMLElement>('[data-seg]')];
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]')!;
  const ms = (Number(root.dataset.seconds) || 5) * 1000;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const n = slides.length;

  let active = 0;
  let userPaused = reduce; // reduced motion: start static
  let visible = false;
  let timer: number | undefined;
  let started = 0;
  let remaining = ms;

  const show = (i: number) => {
    active = ((i % n) + n) % n;
    slides.forEach((s, k) => {
      const on = k === active;
      s.toggleAttribute('data-on', on);
      s.setAttribute('aria-hidden', String(!on));
      // restart the Ken Burns animation on the new slide
      if (on) s.querySelectorAll('img').forEach((img) => { img.style.animation = 'none'; void img.offsetWidth; img.style.animation = ''; });
    });
    subs.forEach((s, k) => { s.toggleAttribute('data-on', k === active); s.setAttribute('aria-hidden', String(k !== active)); });
    segs.forEach((s, k) => {
      s.dataset.state = k < active ? 'done' : k === active ? 'on' : '';
      const bar = s.querySelector<HTMLElement>('i');
      if (bar && k === active) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    });
    remaining = ms;
  };

  const running = () => !userPaused && visible;
  const schedule = () => {
    clearTimeout(timer);
    if (!running()) return;
    started = performance.now();
    timer = window.setTimeout(() => { show(active + 1); schedule(); }, remaining);
  };
  const halt = () => {
    if (timer !== undefined) { clearTimeout(timer); timer = undefined; remaining = Math.max(0, remaining - (performance.now() - started)); }
  };
  const sync = () => {
    root.toggleAttribute('data-paused', !running());
    if (running()) schedule(); else halt();
  };

  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    toggle.setAttribute('aria-label', userPaused ? 'Play the story' : 'Pause the story');
    sync();
  });
  if (reduce) toggle.setAttribute('aria-label', 'Play the story');

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.35 }).observe(root);
  show(0);
  sync();
}
