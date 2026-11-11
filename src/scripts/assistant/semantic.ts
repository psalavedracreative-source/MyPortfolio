/**
 * Semantic matching with Transformers.js (Xenova/all-MiniLM-L6-v2), loaded only when the chat opens.
 * Example-question embeddings are computed once and cached in IndexedDB.
 */
import type { Intent } from './match';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
type Extractor = (texts: string | string[], opts: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;

let extractor: Extractor | null = null;
let loading: Promise<Extractor | null> | null = null;
let vectors: { id: string; v: Float32Array }[] = [];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};

// ---------- tiny IndexedDB key/value store ----------
const idb = <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> =>
  new Promise((resolve) => {
    try {
      const open = indexedDB.open('pbg-assistant', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('kv');
      open.onerror = () => resolve(undefined);
      open.onsuccess = () => {
        const tx = open.result.transaction('kv', mode);
        const req = fn(tx.objectStore('kv'));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      };
    } catch { resolve(undefined); }
  });

async function embed(texts: string[]): Promise<Float32Array[]> {
  const out = await extractor!(texts, { pooling: 'mean', normalize: true });
  const dim = out.dims[out.dims.length - 1];
  return texts.map((_, i) => out.data.slice(i * dim, (i + 1) * dim));
}

/** Start loading the model (idempotent). Resolves to null if it can't load (offline, old browser…). */
export function loadSemantic(intents: Intent[]): Promise<Extractor | null> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      extractor = (await pipeline('feature-extraction', MODEL, { dtype: 'q8' })) as unknown as Extractor;

      const pairs = intents.flatMap((i) => i.examples.map((e) => ({ id: i.id, text: e })));
      const key = `emb:${MODEL}:${hash(JSON.stringify(pairs))}`;
      const cached = await idb<{ id: string; v: number[] }[]>('readonly', (s) => s.get(key));
      if (cached?.length === pairs.length) {
        vectors = cached.map((c) => ({ id: c.id, v: Float32Array.from(c.v) }));
      } else {
        const vs = await embed(pairs.map((p) => p.text));
        vectors = pairs.map((p, i) => ({ id: p.id, v: vs[i] }));
        await idb('readwrite', (s) => s.put(vectors.map((x) => ({ id: x.id, v: Array.from(x.v) })), key));
      }
      return extractor;
    } catch (err) {
      console.info('[assistant] semantic matching unavailable, using keywords only.', err);
      return null;
    }
  })();
  return loading;
}

export const semanticReady = () => !!extractor && vectors.length > 0;

/** intent id → best cosine similarity between the message and that intent's examples. */
export async function semanticScores(message: string): Promise<Map<string, number> | undefined> {
  if (!semanticReady()) return undefined;
  const [q] = await embed([message]);
  const out = new Map<string, number>();
  for (const { id, v } of vectors) {
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += v[i] * q[i];
    if (dot > (out.get(id) ?? -1)) out.set(id, dot);
  }
  return out;
}
