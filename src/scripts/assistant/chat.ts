/** Chat panel UI for the on-site assistant. */
import { Matcher, type Intent } from './match';
import { loadSemantic, semanticScores } from './semantic';

type Data = {
  faq: {
    assistant_name: string;
    greeting: string;
    starter_chips: string[];
    fallback: { answer: string; chips: string[] };
    intents: Intent[];
  };
  bookingUrl: string;
  dmUrl: string;
  email: string | null;
  formEndpoint: string | null;
  owner: string;
};
type Msg = { who: 'bot' | 'me'; text: string; action?: string };

const STORE = 'pbg-chat';
const OPEN = 'pbg-chat-open';
const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
};
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const openTab = (url: string) => {
  const w = window.open(url, '_blank');
  if (w) w.opener = null;
  return !!w;
};

export function initChat(root: HTMLElement) {
  const data: Data = JSON.parse(root.querySelector('[data-assistant-data]')!.textContent || '{}');
  const { faq } = data;
  const matcher = new Matcher(faq.intents);

  const launcher = root.querySelector<HTMLButtonElement>('[data-launcher]')!;
  const panel = root.querySelector<HTMLElement>('[data-panel]')!;
  const log = root.querySelector<HTMLElement>('[data-log]')!;
  const chipsEl = root.querySelector<HTMLElement>('[data-chips]')!;
  const form = root.querySelector<HTMLFormElement>('[data-form]')!;
  const input = root.querySelector<HTMLInputElement>('[data-input]')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('[data-close]')!;

  let history: Msg[] = [];
  let busy = false;

  const save = () => ss.set(STORE, JSON.stringify(history.slice(-40)));
  const scroll = () => log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' });

  // ---------- rendering ----------
  const bubble = (m: Msg) => {
    const el = document.createElement('div');
    el.className = `msg ${m.who}`;
    el.textContent = m.text;
    if (m.who === 'bot' && m.action === 'open_booking') {
      const a = document.createElement('a');
      a.className = 'btn btn-primary btn-sm msg-action';
      a.href = data.bookingUrl; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Open the booking calendar ↗';
      el.append(document.createElement('br'), a);
    }
    if (m.who === 'bot' && m.action === 'go_work') {
      const a = document.createElement('a');
      a.className = 'btn btn-primary btn-sm msg-action';
      a.href = '/work';
      a.textContent = 'Go to the Work page →';
      el.append(document.createElement('br'), a);
    }
    log.append(el);
    if (m.who === 'bot' && m.action === 'show_lead_form') log.append(leadForm());
  };

  const setChips = (chips: string[]) => {
    chipsEl.replaceChildren(...chips.map((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      b.addEventListener('click', () => ask(c));
      return b;
    }));
  };

  const push = (m: Msg) => { history.push(m); bubble(m); save(); scroll(); };

  // ---------- lead form ----------
  const leadForm = () => {
    const f = document.createElement('form');
    f.className = 'lead-form';
    f.noValidate = true;
    const id = Math.random().toString(36).slice(2, 7);
    f.innerHTML = `
      <label for="ln-${id}">Name</label><input id="ln-${id}" name="name" autocomplete="name" required>
      <label for="le-${id}">Email</label><input id="le-${id}" name="email" type="email" autocomplete="email" required>
      <label for="lm-${id}">A line about your brand</label><textarea id="lm-${id}" name="message"></textarea>
      <p class="lead-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-sm" type="submit">Send to ${data.owner}</button>`;
    const err = f.querySelector<HTMLElement>('.lead-err')!;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const name = String(fd.get('name') || '').trim();
      const mail = String(fd.get('email') || '').trim();
      const message = String(fd.get('message') || '').trim();
      if (!name || !/^\S+@\S+\.\S+$/.test(mail)) {
        err.textContent = 'Please add your name and a valid email.';
        err.hidden = false;
        return;
      }
      err.hidden = true;
      const btn = f.querySelector<HTMLButtonElement>('button')!;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      if (data.formEndpoint) {
        try {
          fd.set('source', 'Website chat assistant');
          const res = await fetch(data.formEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(String(res.status));
          f.replaceChildren(Object.assign(document.createElement('p'), { className: 'lead-ok', textContent: `Thanks, ${name}! ${data.owner} will reply within 24 hours.` }));
          scroll();
          return;
        } catch {
          err.textContent = "That didn't send. Please try again, or book a call instead.";
          err.hidden = false;
          btn.disabled = false;
          btn.textContent = `Send to ${data.owner}`;
          return;
        }
      }
      // No form service connected yet: hand off to email, or to Instagram DMs.
      const body = `${message}\n\n${name}\n${mail}`;
      if (data.email) {
        location.href = `mailto:${data.email}?subject=${encodeURIComponent('GROW: website enquiry')}&body=${encodeURIComponent(body)}`;
        f.replaceChildren(Object.assign(document.createElement('p'), { className: 'lead-ok', textContent: 'Your email app should open with your message ready to send.' }));
      } else {
        const a = Object.assign(document.createElement('a'), { className: 'btn btn-primary btn-sm', href: data.dmUrl, target: '_blank', rel: 'noopener', textContent: 'DM "GROW" on Instagram ↗' });
        const p = Object.assign(document.createElement('p'), { textContent: 'Online messages are not connected yet. Please send your message on Instagram:' });
        f.replaceChildren(p, a);
      }
      scroll();
    });
    return f;
  };

  // ---------- answering ----------
  const logUnmatched = (q: string) => {
    if (!import.meta.env.DEV) return;
    try {
      const k = 'pbg-assistant-unmatched';
      const list: { q: string; at: string }[] = JSON.parse(localStorage.getItem(k) || '[]');
      list.push({ q, at: new Date().toISOString() });
      localStorage.setItem(k, JSON.stringify(list.slice(-200)));
      console.info('[assistant] unmatched question logged to localStorage["pbg-assistant-unmatched"]:', q);
    } catch { /* ignore */ }
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    busy = true;
    input.value = '';
    // keep focus inside the panel when the chip that was clicked disappears
    if (chipsEl.contains(document.activeElement)) input.focus({ preventScroll: true });
    setChips([]);
    push({ who: 'me', text: q });

    // Keyword matching is instant, so a clear booking request can open the calendar
    // straight away, while the click still counts as the visitor's own action (no popup blocker).
    let bookingOpened = false;
    if (matcher.match(q).intent?.action === 'open_booking') {
      bookingOpened = openTab(data.bookingUrl);
    }

    const typing = document.createElement('div');
    typing.className = 'msg bot typing';
    typing.setAttribute('aria-label', 'Typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.append(typing);
    scroll();

    const [sem] = await Promise.all([
      semanticScores(q).catch(() => undefined),
      new Promise((r) => setTimeout(r, 500)),
    ]);
    const result = matcher.match(q, sem);
    typing.remove();

    if (result.intent) {
      const it = result.intent;
      push({ who: 'bot', text: it.answer, action: it.action });
      setChips(it.chips);
      if (it.action === 'open_booking' && !bookingOpened) openTab(data.bookingUrl);
      if (it.action === 'go_work' && location.pathname !== '/work') {
        ss.set(OPEN, '1');
        setTimeout(() => { location.href = '/work'; }, 1400);
      }
    } else {
      logUnmatched(q);
      push({ who: 'bot', text: faq.fallback.answer });
      setChips(faq.fallback.chips);
    }
    busy = false;
  };

  // ---------- open / close, focus trap ----------
  const focusables = () =>
    [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);

  const toggle = (open = panel.hidden) => {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    ss.set(OPEN, open ? '1' : '0');
    if (open) {
      document.body.classList.add('chat-open');
      input.focus({ preventScroll: true });
      scroll();
      loadSemantic(faq.intents); // start fetching the language model in the background
    } else {
      document.body.classList.remove('chat-open');
      launcher.focus({ preventScroll: true });
    }
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  closeBtn.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); toggle(false); }
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ---------- start: restore this visit's conversation, or greet ----------
  try { history = JSON.parse(ss.get(STORE) || '[]'); } catch { history = []; }
  if (history.length) {
    history.forEach(bubble);
    const lastBot = [...history].reverse().find((m) => m.who === 'bot');
    const it = lastBot && faq.intents.find((i) => i.answer === lastBot.text);
    setChips(it ? it.chips : faq.starter_chips);
  } else {
    push({ who: 'bot', text: faq.greeting });
    setChips(faq.starter_chips);
  }

  return { toggle };
}
