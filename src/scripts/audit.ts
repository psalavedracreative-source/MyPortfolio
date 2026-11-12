/**
 * Free profile audit form.
 * Sends to the form service in site.json → form_endpoint (Formspree / Web3Forms).
 * Until one is connected it falls back to the visitor's email app (if a public email is set),
 * and otherwise to Instagram DMs, so a request is never lost.
 */
type Cfg = { endpoint: string | null; email: string | null; dmUrl: string; owner: string };

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

export function initAudit(form: HTMLFormElement) {
  const cfg = JSON.parse(form.dataset.cfg || '{}') as Cfg;
  const err = form.querySelector<HTMLElement>('[data-err]')!;
  const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const label = btn.innerHTML;

  const fail = (msg: string, field?: HTMLInputElement | null) => {
    err.textContent = msg;
    err.hidden = false;
    field?.setAttribute('aria-invalid', 'true');
    field?.focus();
  };

  const done = (title: string, text: string, action?: HTMLElement) => {
    const box = el('div', { className: 'done', tabIndex: -1 }, el('strong', {}, title), el('p', {}, text));
    if (action) box.append(action);
    form.replaceChildren(box);
    box.focus();
  };

  form.addEventListener('input', (e) => (e.target as HTMLElement).removeAttribute('aria-invalid'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const mail = String(fd.get('email') || '').trim();
    let page = String(fd.get('page') || '').trim();
    if (!name) return fail('Please add your name.', form.elements.namedItem('name') as HTMLInputElement);
    if (!/^\S+@\S+\.\S+$/.test(mail)) return fail('Please add a valid email so I can reply.', form.elements.namedItem('email') as HTMLInputElement);
    if (page && !/^https?:\/\//i.test(page)) page = `https://${page}`;
    if (!/^https?:\/\/\S+\.\S+/i.test(page)) return fail('Please add the link to your page.', form.elements.namedItem('page') as HTMLInputElement);
    fd.set('page', page);

    btn.disabled = true;
    btn.textContent = 'Sending…';

    if (cfg.endpoint) {
      try {
        fd.set('source', 'Free profile audit');
        fd.set('_subject', `Free audit request: ${name}`);
        const res = await fetch(cfg.endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        return done(`Thanks, ${name}!`, `${cfg.owner} will send your 3 quick fixes within 24 hours. Keep an eye on your inbox.`);
      } catch {
        btn.disabled = false;
        btn.innerHTML = label;
        return fail("That didn't send. Please try again in a moment, or DM \"GROW\" on Instagram.");
      }
    }

    // No form service connected yet.
    const body = `Free profile audit request\n\nName: ${name}\nEmail: ${mail}\nPage: ${page}\nPlatform: ${fd.get('platform')}\nGoal: ${String(fd.get('goal') || '').trim() || '-'}`;
    if (cfg.email) {
      location.href = `mailto:${cfg.email}?subject=${encodeURIComponent(`Free audit request: ${name}`)}&body=${encodeURIComponent(body)}`;
      return done('Almost there', 'Your email app should open with your request ready. Just press send.');
    }
    const copy = async () => { try { await navigator.clipboard.writeText(body); } catch { /* clipboard blocked: the DM still works */ } };
    await copy();
    const dm = el('a', { className: 'btn btn-primary', href: cfg.dmUrl, target: '_blank', rel: 'noopener', textContent: 'DM "GROW" on Instagram ↗' });
    done('One last step', 'Online requests are not connected yet. Your details are copied: paste them in an Instagram DM and I\'ll reply within 24 hours.', dm);
  });
}
