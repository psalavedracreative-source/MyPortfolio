# Patrick Brand Growth — website

Personal services site for Patrick Salavedra, freelance social media manager. Three pages (Home, Work, About), a built-in AI assistant that answers client questions in the browser, and a no-code content editor at `/admin`. Every page pushes visitors to **book a free call** or **DM "GROW"**.

Built with [Astro](https://astro.build) (static output), TypeScript and plain CSS. Hosted on Netlify's free tier. No backend, no paid APIs.

---

## Run it locally

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev       # http://localhost:4321, reloads as you edit
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

---

## Where everything lives

```
content/            ← ALL the words, links and numbers (edit these)
  site.json           business info, booking link, promises, process, client logos, testimonials, form endpoint
  services.json       the 6 service cards
  case-studies.json   case studies (Work page, their own pages, Home proof section)
  pricing.json        the 3 "starting from" packages
  work.json           work samples (Work page) + the home-page proof cover flow
  about.json          bio, stat tiles, documentary chapters, certificates, gallery
  assistant-faq.json  what the chat assistant knows
brand/brand.json    ← colors (editing these restyles the whole site)
assets/             ← your photos, videos, carousel slides, logos
public/admin/       ← the content editor (Decap CMS)
src/                ← the code (you shouldn't need to touch it)
  components/  pages/  layouts/  scripts/  styles/  lib/content.ts
netlify.toml        ← Netlify build settings
```

Content is never hard-coded: every page is rendered from the JSON files. Images referenced in JSON (`"assets/..."`) are optimized automatically at build time (AVIF/WebP, responsive sizes, lazy-loaded below the fold).

**Placeholders:** anything in `[BRACKETS]` is shown on the site exactly as written until you replace it. A path that points to a file that doesn't exist yet (for example `"[cover image]"`) shows a tidy dashed empty slot instead.

---

## Drafts and going live

Everything still waiting for your real content is drafted with `[PLACEHOLDERS]` so you can see the layout. One switch controls it, in `content/site.json` (or `/admin` → Site settings):

- `"show_drafts": true` (now): placeholders are shown, so you can review every section.
- `"show_drafts": false` (when you go live): anything still unfinished is hidden: draft case studies, prices, the intro video slot, the video-testimonial slot, platform badges, empty work slots and `[X]` stats, unfinished About certificates and gallery photos, the placeholder email, and `[...]` notes in the FAQ and chat answers. Each piece reappears on its own as soon as you fill it in.

---

## Updating content

You can edit the JSON files directly (then commit and push), or use the editor at `/admin` once it's set up (see below).

### Add a work sample

1. Put the file(s) in `assets/work/...` (any subfolder).
2. Add one object to `items` in `content/work.json`:

```jsonc
{
  "id": "acme-launch-reel",            // unique, no spaces
  "type": "Reels",                     // Reels | Carousels | AI Video | Ads | Websites
  "title": "Product launch reel",
  "client": "Acme Coffee",
  "video": "assets/work/reels/acme-launch.mp4",   // Reels (9:16 MP4)
  "poster": "assets/work/posters/acme-launch.jpg", // optional still shown before it plays
  "stat": "120K views",
  "featured": false                    // true = also show it in the home-page cover flow
}
```

- **Carousels:** use `"slides": ["assets/work/carousels/acme/01.png", "..."]` (1080×1350).
- **AI Video:** same as Reels (`"video"` + `"poster"`), plus `"style"`: `UGC`, `BGC`, `EGC`, `IGC` or `AGC`. Each style gets its own filter button on the Work page (UGC, BGC, IGC, AGC…), in the order of `ai_video.styles`; selecting one shows that style's full name, who creates it and an example. Styles with no clips get no button. Add `"ratio": "16:9"` for landscape clips (they take two columns on wider screens) and `"sound": false` for a silent clip (hides the sound button). The 11 AI clips live in `assets/work/ai-video/`, grouped by niche in the `client` line (Beauty, Fashion, Food & drink, Automotive, Real estate…).
- **Ads / Websites:** use `"image": "assets/..."` (or `"video"` for a video ad). Leave the media out to show an empty slot.
- `"stat"` is optional; leave it out when there's no real number to show.
- The filter chips and their counts update by themselves. Filters are shareable: `/work?type=reels`, `/work?type=ugc`.
- **All** shows the first `all_limit` samples (8) in `content/work.json` order, then a **Show more work** button reveals the rest. Put your strongest pieces first.

### Home-page proof cover flow

Edit `proof_coverflow` in `content/work.json`. Each card has `tag`, `client`, `cover` (an image path), `stat`, `unit` and the punchy `line` shown under the cards. Work items with `"featured": true` are added to the end of the cover flow.

### Case studies

Edit `content/case-studies.json` (or `/admin` → Case studies & pricing). Each case study gets:

- its own page at `/work/<slug>`: headline result, before → after numbers, where it started, what you did, analytics screenshots (click to enlarge), a before/after of the feed or profile, content samples, the client's quote, and a link to the next case study;
- a card in **Case studies** at the top of the Work page;
- a card in the Home page proof section when `"featured": true`, linking to its page.

Put images in `assets/case-studies/<slug>/` and point to them. Screenshots should show the dates. If `brand` matches a name in `client_logos`, that brand's logo is reused and its logo in the "Brands I've worked with" strip links to the case study.

### Pricing, intro video, free audit, FAQ, badges (Home page)

- **Packages:** `content/pricing.json`. Each package has a `price` shown as "from ₱…", what it includes, and `featured` to highlight one.
- **Intro video:** `intro_video` in `content/site.json`. Put the MP4 in `assets/intro/` and set `video` (and `ratio`: 9:16 for a phone video, 16:9 for landscape).
- **Free profile audit form:** `audit` in `content/site.json` holds the text. Requests go to `form_endpoint` (see *Lead form* below), the same as the chat assistant's form.
- **FAQ:** built from the assistant's answers. Any topic in `content/assistant-faq.json` with a `"faq"` question is shown, in `faq_order`. Editing an answer updates both the chat and the FAQ.
- **Platform badges:** `platform_badges` in `content/site.json`, shown under the testimonials as "Verified on". Add `url` to link to your profile. Only use badges you actually have.
- **Video testimonial:** a testimonial with a `video` (MP4 in `assets/testimonials/`) is shown beside the featured quote.

### Photos, certificates, gallery (About page)

Put photos in `assets/photos/` (certificates in `assets/photos/certificates/`, gallery shots in `assets/photos/gallery/`) and point to them from `content/about.json`. Every documentary chapter needs a `photo` and an `alt` (a short description for screen readers). Certificates and gallery photos open in a full-screen viewer when clicked.

### Client logos

Put SVG or PNG logos (transparent background) in `assets/logos/` and add `{ "name": "...", "logo": "assets/logos/....png" }` to `client_logos` in `content/site.json`. They drift sideways in a loop under "Brands I've worked with", each with its name underneath, and pause when hovered. Leave `logo` empty to show a round badge with the brand's initials instead (used for BikeAddict until it has its own logo).

### Teach the assistant a new answer

Add an intent to `content/assistant-faq.json`:

```json
{
  "id": "contracts",
  "examples": ["do you sign a contract", "is there a contract", "do we need an agreement"],
  "keywords": ["contract", "agreement"],
  "answer": "Yes. Every project starts with a simple agreement covering scope, timeline and payment.",
  "chips": ["Payment", "Book a call"]
}
```

- **examples**: 3 to 6 different ways a client might ask. More variety means better matching.
- **keywords**: words or short phrases that clearly mean this topic.
- **action** (optional): `open_booking` (opens your booking link), `go_work` (goes to the Work page) or `show_lead_form` (shows the name + email form).
- Answers are shown exactly as written; the assistant never makes anything up. Anything it can't match gets the `fallback` answer, which offers the email form and booking.

**Finding questions to add:** while running `npm run dev`, questions the assistant couldn't answer are saved in your browser. Open the browser console and run `JSON.parse(localStorage['pbg-assistant-unmatched'])` to see them.

**How it matches** (all in the visitor's browser, no API key): it normalizes the message (including common Taglish like *magkano*, *paano*, *pwede*), checks keywords, fuzzy-matches the example questions with Fuse.js, and, once the chat has been opened, compares meaning with a small language model (`Xenova/all-MiniLM-L6-v2` via Transformers.js, about 23 MB, downloaded once and cached; example embeddings are cached in IndexedDB). The thresholds are at the top of `src/scripts/assistant/match.ts`.

### Testimonials

Edit `testimonials` in `content/site.json`. Each has the `quote` (word for word), an optional `highlight` (a phrase copied exactly from the quote, shown in lime), optional `name` and `brand`, a `source` label such as "Endorsed by client", `platform` and `url` (adds a "View on Upwork"-style link that opens the review on the freelancing platform in a new tab; with no `platform` it reads "View original review"), `featured: true` for the one shown large at the top, and `show: false` to keep one off the site without deleting it.

### Colors

Edit `brand/brand.json`. The lime accent, background, card color, text and muted text all come from there.

---

## Deploy to Netlify (free)

1. Push this repository to GitHub.
2. On [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub**, pick this repo.
3. Netlify reads `netlify.toml`, so the build command (`npm run build`) and publish folder (`dist`) are already set. Click **Deploy**.
4. Every push to the main branch redeploys the site automatically.

**Custom domain:** add it under *Domain management*. Netlify sets the site URL used for the sitemap and social previews automatically; to force one, add an environment variable `SITE_URL=https://yourdomain.com`.

**Lead form:** create a free form on [Formspree](https://formspree.io) or [Web3Forms](https://web3forms.com) and paste its endpoint URL into `form_endpoint` in `content/site.json`. Until then, the assistant's form falls back to your email (once `links.email` is filled in), and otherwise to Instagram DMs.

**Booking link:** paste your Google Calendar appointment link into `cta_primary.url` in `content/site.json` (and into the `booking` answer in `assistant-faq.json`). Until then, every "Book a call" button opens your Instagram DM link so nothing is broken.

---

## Editing content without code (Decap CMS at `/admin`)

One-time setup, after the site is on Netlify:

1. In your Netlify site: **Site configuration → Identity → Enable Identity**.
2. Under **Identity → Registration**, set registration to **Invite only**.
3. Under **Identity → Services**, click **Enable Git Gateway**.
4. Under the **Identity** tab, click **Invite users** and invite your own email.
5. Open the invite email, follow the link, and set a password.
6. Go to `https://your-site.netlify.app/admin` and log in.

If your deploy branch isn't called `main`, change `branch:` at the top of `public/admin/config.yml`.

In the editor you can change the work library and cover flow, the About page (documentary, certificates, gallery), site settings (logos, testimonials, links) and the assistant's answers, and upload reels, carousel slides, photos and certificates. Each save is committed to the repo and Netlify redeploys within a minute or two. (`services.json` is a plain list, which the editor can't open, so edit that file directly.)

---

## Placeholders still to fill

**content/site.json**
- `cta_primary.url`: `[GOOGLE_CALENDAR_BOOKING_LINK]`
- `links.email`: `[YOUR_PUBLIC_EMAIL]`
- `client_logos`: BikeAddict has no logo file yet (shows a "BA" badge)
- `testimonials`: the video testimonial (`video`, `quote`, `name`, `brand`); no `platform` / `url` links to the original reviews yet; no client names or brands yet (optional `name` / `brand`; adding them makes the quotes more convincing)
- `form_endpoint`: `[FORM_ENDPOINT_URL e.g. Formspree or Web3Forms]`

- `intro_video`: `video` file and `length`
- `platform_badges` (2): platform, badge and detail, optional `url`

**content/case-studies.json**
- All 3 case studies are drafts: brand, platform, niche, headline, summary, period, results, where it started, what you did, screenshots, before/after, samples, quote. Delete any you don't need.

**content/pricing.json**
- Each package: `price`, `for`, the `[X]` inclusions, `[Other inclusion]`; the `badge` on the highlighted package

**content/work.json**
- Stats on the 4 samples: `[X] views` / `[X] saves`
- Empty slots: 2 × `[Your ad creative]` / `[Client]` (`[X] leads`, `[X] ROAS`), 1 × `[Client website]` / `[Client]` / `[Result]`
- `proof_coverflow` (5 cards): every `[Client name]`, every `[cover image]`, and the stats `[X]K+`, `[X]x`, `[X]K+`, `[X]+`

**content/about.json**
- Stat tiles: `[X]+` brands served, `[X]M+` views generated, `[X] yrs` experience
- Documentary: `[Year]` on chapters 1–3; chapter 1 text `[Degree], [School]. [What this moment meant to you.]`; chapter 2 `[Receiving my certificate]`, `[certification name]`, `[What you learned.]` (and a photo of you receiving it); chapter 3 `[First client win]`, `[Your first client and the result you got them.]`
- Certificates (3): `[Certificate name]`, `[Issuer]`, `[Year]`, photo `[assets/photos/certificates/...]`
- Gallery (4): photos `[assets/photos/gallery/...]` and captions `[On a shoot]`, `[Editing setup]`, `[With a client]`, `[Event or seminar]`

**content/assistant-faq.json**
- pricing: `[PACKAGE SUMMARY, e.g. Starter from ₱X / Growth from ₱X / Full from ₱X]`
- included: `[Add per-package details: number of posts, reels, stories, ad support.]`
- turnaround: `[Typical first-delivery time, e.g. first batch within X days.]`
- payment: `[Payment methods, e.g. GCash, bank transfer, PayPal.]`
- booking: `[GOOGLE_CALENDAR_BOOKING_LINK]`
- platforms: `[Add or remove platforms you cover.]`
- ads: `[Recommended minimum budget.]`
- websites: `[Add pricing or a package note.]`

---

## Quality checks

- Lighthouse (mobile): Home and Work score 100 in performance, accessibility, best practices and SEO; About scores 99 performance and 100 in the rest.
- Checked at 375, 768, 1280 and 1440 px wide.
- `prefers-reduced-motion` turns off the reaction bubbles, the drifting brand logos (they show as a still grid), cover-flow and carousel animation, reel autoplay and the documentary's Ken Burns zoom.
- `sitemap-index.xml` is generated on every build; each page has its own title, description and Open Graph image (`lime-portrait.png`).
