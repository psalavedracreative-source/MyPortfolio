/**
 * Intent matching for the on-site assistant. Runs fully in the browser.
 *  1. keywords (whole-word / phrase hits after normalizing, incl. common Taglish)
 *  2. fuzzy match against each intent's example questions (Fuse.js)
 *  3. semantic similarity (MiniLM embeddings), when the model has loaded
 * The signals are blended; below the threshold the fallback answer is used.
 */
import Fuse from 'fuse.js';

export type Intent = {
  id: string;
  examples: string[];
  keywords: string[];
  answer: string;
  chips: string[];
  action?: 'open_booking' | 'go_work' | 'show_lead_form' | string;
};

export type MatchResult = { intent: Intent | null; score: number; signals: Record<string, number> };

// Taglish → English hints, appended to the message (the original words are kept too).
const TAGLISH: Record<string, string> = {
  magkano: 'how much price', presyo: 'price', halaga: 'price cost', bayad: 'payment pay', magbayad: 'pay payment',
  paano: 'how', pano: 'how', ilan: 'how many', ilang: 'how many', kailan: 'when', saan: 'where', taga: 'where based',
  pwede: 'can', puwede: 'can', gusto: 'want', kailangan: 'need', serbisyo: 'services', gawa: 'work samples',
  tagal: 'how long', matagal: 'how long', mabilis: 'fast', sagot: 'reply', usap: 'talk call', tawag: 'call',
  kumusta: 'kumusta hello', musta: 'kumusta hello', salamat: 'thanks', libre: 'free',
};
const FILLER = new Set(['po', 'ba', 'naman', 'lang', 'nga', 'pa', 'na', 'yung', 'ang', 'ng', 'sa', 'mo', 'nyo', 'niyo']);

export function normalize(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = base.split(' ').filter((w) => w && !FILLER.has(w));
  const extra = words.map((w) => TAGLISH[w]).filter(Boolean);
  // light plural folding so "edits" meets "edit" and "posts" meets "post"
  const fold = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
  return [...words, ...extra].join(' ').split(' ').map(fold).join(' ');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class Matcher {
  private fuse: Fuse<{ id: string; text: string }>;
  private keywordRes: { id: string; re: RegExp; phrase: boolean }[];
  readonly byId: Map<string, Intent>;
  threshold = 0.6;
  semanticMin = 0.63;

  readonly intents: Intent[];

  constructor(intents: Intent[]) {
    this.intents = intents;
    this.byId = new Map(intents.map((i) => [i.id, i]));
    this.fuse = new Fuse(
      intents.flatMap((i) => i.examples.map((e) => ({ id: i.id, text: normalize(e) }))),
      { keys: ['text'], includeScore: true, threshold: 0.45, ignoreLocation: true, minMatchCharLength: 2 },
    );
    this.keywordRes = intents.flatMap((i) =>
      i.keywords.map((k) => {
        const nk = normalize(k);
        return { id: i.id, re: new RegExp(`(^|\\s)${escapeRe(nk)}(\\s|$)`), phrase: nk.includes(' ') };
      }),
    );
  }

  keywordScores(norm: string): Map<string, number> {
    const hits = new Map<string, { best: number; count: number }>();
    for (const k of this.keywordRes) {
      if (!k.re.test(norm)) continue;
      const h = hits.get(k.id) ?? { best: 0, count: 0 };
      h.best = Math.max(h.best, k.phrase ? 1 : 0.75);
      h.count++;
      hits.set(k.id, h);
    }
    const out = new Map<string, number>();
    for (const [id, h] of hits) {
      let s = h.best + 0.04 * Math.min(h.count - 1, 3);
      if (id === 'greeting') s *= 0.85; // a "hi" in front of a real question shouldn't win
      out.set(id, s);
    }
    return out;
  }

  fuzzyScores(norm: string): Map<string, number> {
    const out = new Map<string, number>();
    for (const r of this.fuse.search(norm)) {
      const s = 1 - (r.score ?? 1);
      if (s > (out.get(r.item.id) ?? 0)) out.set(r.item.id, s);
    }
    return out;
  }

  /** semantic: intent id → best cosine similarity (optional). */
  match(message: string, semantic?: Map<string, number>): MatchResult {
    const norm = normalize(message);
    if (!norm) return { intent: null, score: 0, signals: {} };
    const kw = this.keywordScores(norm);
    const fz = this.fuzzyScores(norm);

    let best: MatchResult = { intent: null, score: 0, signals: {} };
    for (const intent of this.intents) {
      const k = kw.get(intent.id) ?? 0;
      const f = fz.get(intent.id) ?? 0;
      const c = semantic?.get(intent.id) ?? 0;
      const fUse = f >= 0.6 ? f : 0;
      // cosine 0.63 → 0.7, 0.8 → 0.9: a strong meaning match beats a lone generic keyword
      const cUse = c >= this.semanticMin ? 0.7 + (c - this.semanticMin) * 1.2 : 0;
      const agree = [k > 0, fUse > 0, cUse > 0].filter(Boolean).length;
      const score = Math.max(k, fUse * 0.95, cUse) + 0.08 * Math.max(0, agree - 1);
      if (score > best.score) best = { intent, score, signals: { keyword: k, fuzzy: +f.toFixed(3), cosine: +c.toFixed(3) } };
    }
    if (best.score < this.threshold) return { ...best, intent: null };
    return best;
  }
}
