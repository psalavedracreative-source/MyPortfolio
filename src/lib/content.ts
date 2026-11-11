/**
 * All site content comes from the JSON files in /content (and /brand).
 * Media paths in that JSON ("assets/...") are resolved here at build time, so
 * dropping a file into /assets and pointing the JSON at it is all it takes.
 */
import type { ImageMetadata } from 'astro';
import siteJson from '../../content/site.json';
import servicesJson from '../../content/services.json';
import workJson from '../../content/work.json';
import aboutJson from '../../content/about.json';
import faqJson from '../../content/assistant-faq.json';
import brandJson from '../../brand/brand.json';

export const site = siteJson;
export const services = servicesJson;
export const work = workJson;
export const about = aboutJson;
export const faq = faqJson;
export const brand = brandJson;

export type WorkItem = {
  id: string;
  type: string;
  title: string;
  client: string;
  stat?: string;
  video?: string;
  /** Frame shape, e.g. "9:16", "16:9", "4:5", "1:1". Defaults: video 9:16, everything else 4:5. */
  ratio?: string;
  /** AI Video only: UGC | BGC | EGC | IGC | AGC (see ai_video.styles in work.json). */
  style?: string;
  /** Set to false when a video has no audio track, to hide the sound button. */
  sound?: boolean;
  poster?: string;
  slides?: string[];
  image?: string;
  featured?: boolean;
};
export type ProofCard = (typeof workJson)['proof_coverflow'][number];

/** True when a value still holds a [BRACKETED] placeholder. */
export const isPlaceholder = (value: unknown): boolean =>
  typeof value !== 'string' || value.trim() === '' || /\[[^\]]*\]/.test(value);

/** A link is usable when it is a real http(s)/mailto URL with no placeholder in it. */
export const isRealUrl = (url: unknown): url is string =>
  typeof url === 'string' && !isPlaceholder(url) && /^(https?:\/\/|mailto:)/i.test(url);

/** Booking link; until the calendar link is set, fall back to the DM link so the button still works. */
export const bookingUrl: string = isRealUrl(site.cta_primary.url) ? site.cta_primary.url : site.cta_dm.url;
export const bookingIsPlaceholder = !isRealUrl(site.cta_primary.url);
export const dmUrl: string = site.cta_dm.url;
export const email: string | null = isPlaceholder(site.links.email) ? null : site.links.email;
export const formEndpoint: string | null = isRealUrl(site.form_endpoint) ? site.form_endpoint : null;

// ---------- media ----------
const imageModules = import.meta.glob<ImageMetadata>('/assets/**/*.{png,jpg,jpeg,webp,avif,gif,PNG,JPG,JPEG,WEBP}', {
  eager: true,
  import: 'default',
});
const svgModules = import.meta.glob<string>('/assets/**/*.svg', { eager: true, query: '?url', import: 'default' });
const videoModules = import.meta.glob<string>('/assets/**/*.{mp4,webm,mov,MP4,MOV}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const key = (path: string) => '/' + path.replace(/^\.?\/*/, '');

/** Optimizable image for a JSON path like "assets/photos/x.png", or undefined if it isn't there (yet). */
export const imageFor = (path: unknown): ImageMetadata | undefined =>
  typeof path === 'string' && !isPlaceholder(path) ? imageModules[key(path)] : undefined;

/** Plain URL for an SVG (logos). */
export const svgFor = (path: unknown): string | undefined =>
  typeof path === 'string' && !isPlaceholder(path) ? svgModules[key(path)] : undefined;

/** Served URL for a video file. */
export const videoFor = (path: unknown): string | undefined =>
  typeof path === 'string' && !isPlaceholder(path) ? videoModules[key(path)] : undefined;

// ---------- work ----------
export const workTypes = ['Reels', 'Carousels', 'AI Video', 'Ads', 'Websites'] as const;
export const workItems = work.items as WorkItem[];
export type AiStyle = { code: string; name: string; who: string; example: string };
export const aiVideo = work.ai_video as { note: string; styles: AiStyle[] };
export const allLimit = Number(work.all_limit) > 0 ? Number(work.all_limit) : 8;
/** The filter a work item belongs to: AI videos go under their content style (UGC, BGC…), everything else under its type. */
export const filterFor = (w: WorkItem) => (w.type === 'AI Video' && w.style ? w.style : w.type);
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
