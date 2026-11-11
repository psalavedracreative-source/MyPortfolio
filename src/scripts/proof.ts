/** Proof section: reaction cover → Apple-style cover flow with per-card stat captions. */
export function initProof(root: HTMLElement) {
  const cover = root.querySelector<HTMLElement>('[data-view="cover"]')!;
  const flow = root.querySelector<HTMLElement>('[data-view="flow"]')!;
  const openBtn = root.querySelector<HTMLButtonElement>('[data-open]')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('[data-close]')!;
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const cards = [...root.querySelectorAll<HTMLButtonElement>('[data-card]')];
  const caps = [...root.querySelectorAll<HTMLElement>('[data-cap]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-dot]')];
  const n = cards.length;
  let active = 0;

  const render = () => {
    cards.forEach((card, i) => {
      let off = i - active;
      if (off > n / 2) off -= n;
      if (off < -n / 2) off += n;
      const a = Math.abs(off);
      const sg = Math.sign(off);
      const x = off === 0 ? 0 : sg * (200 + (a - 1) * 105);
      const z = off === 0 ? 90 : -140 - (a - 1) * 70;
      const r = off === 0 ? 0 : -sg * 52;
      card.style.setProperty('--t', `translateX(calc(var(--u) * ${x})) translateZ(calc(var(--u) * ${z})) rotateY(${r}deg)`);
      card.style.setProperty('--z', String(10 - a));
      card.style.setProperty('--o', a > 2 ? '0' : '1');
      card.toggleAttribute('data-hidden', a > 2);
      card.tabIndex = a > 2 ? -1 : 0;
      card.setAttribute('aria-current', off === 0 ? 'true' : 'false');
    });
    caps.forEach((cap, i) => {
      cap.toggleAttribute('data-on', i === active);
      cap.setAttribute('aria-hidden', i === active ? 'false' : 'true');
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', i === active ? 'true' : 'false'));
  };

  const go = (i: number) => {
    active = ((i % n) + n) % n;
    render();
  };

  const open = () => {
    active = 0;
    render();
    cover.hidden = true;
    flow.hidden = false;
    stage.focus({ preventScroll: true });
    flow.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const close = () => {
    flow.hidden = true;
    cover.hidden = false;
    openBtn.focus({ preventScroll: true });
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  root.querySelector('[data-prev]')!.addEventListener('click', () => go(active - 1));
  root.querySelector('[data-next]')!.addEventListener('click', () => go(active + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
  cards.forEach((card, i) => card.addEventListener('click', () => { if (swiped) return; go(i); }));

  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    else if (e.key === 'Escape') { close(); }
  });

  // Swipe (touch / pen / mouse drag)
  let startX: number | null = null;
  let swiped = false;
  stage.addEventListener('pointerdown', (e) => { startX = e.clientX; swiped = false; });
  stage.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) {
      swiped = true;
      go(dx > 0 ? active - 1 : active + 1);
      setTimeout(() => { swiped = false; }, 0);
    }
  });
  stage.addEventListener('pointercancel', () => { startX = null; });

  // Pause the reaction animations while the section is off screen.
  new IntersectionObserver(([entry]) => root.toggleAttribute('data-offscreen', !entry.isIntersecting), { rootMargin: '100px' }).observe(root);

  render();
}
