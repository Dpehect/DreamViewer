# DreamViewer AI

Developed and verified by [Softbridge Solutions](https://softbridge-solutions-main-web-app-iota.vercel.app).

**Live Demo:** https://dream-viewer-five.vercel.app/  
**Repository:** https://github.com/Dpehect/DreamViewer

**DreamViewer AI** is a production-oriented single-page application built by [Softbridge Solutions](https://softbridge-solutions-main-web-app-iota.vercel.app) that transforms free-form dream narratives into (1) a single high-quality generative image and (2) a multi-section, language-aware interpretive report. The codebase emphasizes typed domain boundaries, cancellable async orchestration, secret-safe third-party API access, graceful degradation, and a performance-conscious React UI.


---

## Table of Contents

1. [Product Capabilities](#product-capabilities)
2. [System Sequence](#system-sequence)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Module Boundaries](#module-boundaries)
6. [Domain Model](#domain-model)
7. [Session State Machine](#session-state-machine)
8. [Async Concurrency Control](#async-concurrency-control)
9. [Dream Analysis Engine](#dream-analysis-engine)
10. [Image Prompt Compiler](#image-prompt-compiler)
11. [Image Generation Pipeline](#image-generation-pipeline)
12. [Server Proxy Contract](#server-proxy-contract)
13. [Internationalization](#internationalization)
14. [UI Composition Model](#ui-composition-model)
15. [Rendering and Layout Strategy](#rendering-and-layout-strategy)
16. [Performance Techniques](#performance-techniques)
17. [Error Taxonomy and Resilience](#error-taxonomy-and-resilience)
18. [Security Model](#security-model)
19. [Project Structure](#project-structure)
20. [Data Contracts (TypeScript)](#data-contracts-typescript)
21. [Engineering Competencies Mapping](#engineering-competencies-mapping)
22. [Extension Points](#extension-points)

---

## Product Capabilities

| Capability | Technical behavior |
| --- | --- |
| Dream composer | Controlled textarea, minimum length gate (`MIN_LEN = 8`), progress affordance, example prompt injection |
| One-shot generation | Single primary action produces analysis report + one image |
| Provider preference | Primary: **xAI Grok Imagine**; fallback: **Pollinations Flux** |
| Variation | Integer `variation` offsets hash seed and prompt preamble for alternate compositions |
| Localization | UI strings + analysis prose in `en` / `tr`; language switch re-analyzes without image refetch |
| Media UX | Skeleton shimmer, blur-up/fade-in on `load`, lightbox, lazy decoding attributes |
| Session reset | Aborts in-flight work, increments run id, clears form + session atomically |

---

## System Sequence

```
ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ     ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ     ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ     ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ     ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ
Ôöé  User   ÔöéÔöÇÔöÇÔöÇÔöÇÔû║Ôöé App / UI ÔöéÔöÇÔöÇÔöÇÔöÇÔû║Ôöé  useDream   ÔöéÔöÇÔöÇÔöÇÔöÇÔû║Ôöé analyzeDream ÔöéÔöÇÔöÇÔöÇÔöÇÔû║Ôöé Dream   Ôöé
Ôöé         Ôöé     Ôöé          Ôöé     Ôöé  (hook)     Ôöé     Ôöé  (pure)      Ôöé     Ôöé Report  Ôöé
ÔööÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöİ     ÔööÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöİ     ÔööÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔö¼ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöİ     ÔööÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöİ     ÔööÔöÇÔöÇÔöÇÔöÇÔö¼ÔöÇÔöÇÔöÇÔöÇÔöİ
                                        Ôöé                                       Ôöé
                                        Ôöé  imagePrompt                          Ôöé
                                        Ôû╝                                       Ôöé
                                 ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ                               Ôöé
                                 Ôöé imagineDream ÔöéÔùäÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöİ
                                 Ôöé  (client)    Ôöé
                                 ÔööÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔö¼ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöİ
                                        Ôöé
                    ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔö╝ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ
                    Ôû╝                   Ôû╝                   Ôû╝
             POST /api/imagine    timeout/retry        fluxFallback
                    Ôöé             on 5xx/abort         (seeded URL)
                    Ôû╝
              xAI Images API
         grok-imagine-image-quality
         ÔåÆ grok-imagine-image
```

Secondary sequences:

| User action | Effect |
| --- | --- |
| Generate again | `variation := variation + 1`, same `dreamText`, full re-weave |
| New dream | `abort()` + `runId++` + clear session/form + `phase = idle` |
| Language change | `analyzeDream(session.dreamText, newLang, variation)` only; `image` retained |

---

## Tech Stack

| Layer | Technology | Role in this codebase |
| --- | --- | --- |
| View | React 19 | Function components, hooks, memoized leaves |
| Types | TypeScript | Cross-layer contracts (`DreamReport`, `Phase`, ÔÇĞ) |
| Tooling | Vite 8 | Dev server, production bundling, custom middleware plugin |
| CSS | Tailwind CSS v4 + custom design CSS | Tokens, responsive layout, ambient visuals |
| Motion | Framer Motion | Enter/exit, stagger, springs, layout-id language pill |
| Lint | Oxlint | Static analysis |

External systems:

| System | Protocol | Auth |
| --- | --- | --- |
| xAI Image Generations | `POST https://api.x.ai/v1/images/generations` | Bearer `XAI_API_KEY` (server only) |
| Pollinations Flux | `GET https://image.pollinations.ai/prompt/{encoded}` | None (public demo fallback) |

---

## Architecture

Layered frontend with a thin composition root:

```
App.tsx
  ÔööÔöÇ presents UI only; no direct provider HTTP
hooks/useDream.ts
  ÔööÔöÇ owns session lifecycle, abort, phase transitions
lib/analyze.ts
  ÔööÔöÇ pure: text ÔåÆ DreamReport (+ imagePrompt)
lib/imagine.ts
  ÔööÔöÇ impure: network, timeout, retry, fallback
vite plugin (/api/imagine)
  ÔööÔöÇ secret-bearing BFF-style proxy for xAI
types/dream.ts
  ÔööÔöÇ shared domain types
```

### Principles

1. **Pure core / impure edges** ÔÇö analysis is deterministic and side-effect free; I/O is isolated.
2. **Single session owner** ÔÇö only `useDream` mutates phase/session; children remain presentational.
3. **Fail open for demos** ÔÇö missing key still yields an image via Flux.
4. **Stale-safe concurrency** ÔÇö abort + run-id double gate against race conditions.
5. **Locale as input, not global mutable analysis state** ÔÇö language is a pure function parameter.

---

## Module Boundaries

| Module | Imports allowed | Must not |
| --- | --- | --- |
| `types/*` | nothing domain-specific | import React / fetch |
| `lib/analyze` | `types`, pure utils | call network |
| `lib/imagine` | `types` | touch React state |
| `lib/i18n` | `types` (Lang) | own session |
| `hooks/*` | `lib/*`, `types` | render DOM structure heavily |
| `components/*` | props, Framer, UI copy types | call xAI directly |
| `App.tsx` | hooks + components | embed provider secrets |

This boundary set mirrors ÔÇ£clean architectureÔÇØ expectations in mid/senior frontend roles without over-engineering a tiny SPA.

---

## Domain Model

### `DreamSession`

Atomic unit of completed or in-progress work:

| Field | Type | Notes |
| --- | --- | --- |
| `dreamText` | `string` | Canonical narrative used for regenerate |
| `variation` | `number` | Non-negative integer, increments on regenerate |
| `report` | `DreamReport` | Full analysis + engineered prompt |
| `image` | `ImagineResult \| null` | Null while loading or if cleared on hard error |

### `DreamReport`

| Field | Description |
| --- | --- |
| `seed` | FNV-1a-like 32-bit hash of normalized text (+ variation offset) |
| `title`, `mood`, `tags` | Presentation metadata derived from extractions |
| `imagePrompt` | Provider-facing English art direction string (capped ~1200 chars) |
| `imageNote` | Short UI caption of style intensity |
| `drama` | Continuous score in `[0, 1]` driving cinematic vs soft rendering |
| `emotionalAtmosphere` | Multi-paragraph prose |
| `symbols` | `SymbolReading[]` (name + meaning), capped |
| `psychology` | Depth-psychology style interpretation |
| `hiddenMessages` | Bullet-like latent invites |
| `personalAdvice` | Numbered practical guidance |
| `reflectionQuestions` | Localized question list |
| `thematicConnections` | Motif / mythic framing |

### `ImagineResult`

| Field | Values |
| --- | --- |
| `url` | Absolute HTTP(S) or data URL |
| `source` | `'grok-imagine' \| 'flux'` |
| `prompt` | Echo of prompt used (debug / transparency) |

### `Phase`

Finite state union:

```ts
type Phase = 'idle' | 'loading' | 'success' | 'error'
```

---

## Session State Machine

```
                 weave() / regenerate()
        ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ
        Ôöé                                  Ôöé
        Ôû╝                                  Ôöé
     ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ   valid text    ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ  Ôöé
     Ôöé idle Ôöé ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔû║ Ôöé loading ÔöéÔöÇÔöÇÔöİ
     ÔööÔöÇÔöÇÔö¼ÔöÇÔöÇÔöÇÔöİ                 ÔööÔöÇÔöÇÔöÇÔöÇÔö¼ÔöÇÔöÇÔöÇÔöÇÔöİ
        Ôöé                          Ôöé
        Ôöé reset()                  Ôö£ÔöÇ image ok ÔöÇÔöÇÔû║ success
        Ôöé                          Ôöé
        Ôöé                          ÔööÔöÇ hard fail ÔöÇÔû║ error
        Ôöé                                Ôöé
        ÔöéÔùäÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ reset() ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöñ
        ÔöéÔùäÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ reset() ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ success
```

| Transition | Guards / side effects |
| --- | --- |
| `idle ÔåÆ loading` | `trim(text).length >= 8`; abort previous; `runId++`; optimistic report with `image: null` |
| `loading ÔåÆ success` | `runId` still current; not aborted; image assigned |
| `loading ÔåÆ error` | non-abort failure; preserve previous successful image if any |
| `* ÔåÆ idle` | `reset()`: abort, clear form + session, `imageReady = false` |

Optimistic report during `loading` allows future UI extensions (show title while waiting) without changing the pure analysis path.

---

## Async Concurrency Control

Two complementary mechanisms prevent race conditions common in multi-click generation UIs:

### 1. `AbortController`

```ts
abortRef.current?.abort()
const ac = new AbortController()
abortRef.current = ac
// passed to imagineDream(..., ac.signal)
```

- New weave aborts the previous HTTP attempt.
- `reset` and unmount also abort.
- Nested timeout controller in `imagineDream` aborts hung requests after `TIMEOUT_MS = 90_000`.

### 2. Monotonic `runId`

```ts
const runId = ++runIdRef.current
// after await:
if (runId !== runIdRef.current || ac.signal.aborted) return
```

Even if an abort is late or a fallback resolves after a newer run started, state updates from the older run are dropped.

### Language race

`langRef.current` is read at completion time so a language switch mid-flight still produces a report localized to the latest UI language when the image returns.

---

## Dream Analysis Engine

File: `src/lib/analyze.ts`  
Signature: `analyzeDream(dreamText: string, lang: Lang, variation?: number): DreamReport`

### Pipeline stages

```
normalize text
    ÔåÆ lexicon scoring (emotions, places, creatures, objects, actions)
    ÔåÆ drama scoring
    ÔåÆ place inference (e.g. lions ÔåÆ savanna if place missing)
    ÔåÆ palette selection (drama-dependent)
    ÔåÆ title / mood / tags
    ÔåÆ imagePrompt compilation
    ÔåÆ six localized prose sections + symbols
```

### Lexicon scoring

Each lexicon entry has `keys: string[]` and optional weight `w`.  
Score for an entry:

```
score(entry) = ╬ú w  for each key found as substring of lowercased text
```

Entries with `score > 0` are sorted descending. Top hits feed scene construction.

Dimension sets (bilingual TR/EN keys):

| Dimension | Examples of signals |
| --- | --- |
| Emotions | fear, conflict, courage, love, freedom, urgency, anger, nostalgia |
| Places | forest, sea, sky, house, city, garden, savanna/plain, cosmos, arena |
| Creatures | lion, tiger, wolf, snake, cat, bird, horse, beast |
| Objects | door, mirror, weapon, water, fire, key, moon, bridge |
| Actions | fight, flee, run, fly, swim, fall, protect, find |

### Drama score

Initialized from actionÔÇÖs inherent drama (e.g. fight Ôëê 0.95), then raised by:

- high-intensity emotions (conflict, fear, anger, courage, urgency)
- predatory / mythic creatures (lion, tiger, wolf, beast)
- explicit combat keywords in free text  

Clamped to a usable band that later selects cinematic vs soft art direction.

### Place inference

If no place is detected:

- lion/tiger ÔåÆ savanna/plain scene
- high drama ÔåÆ arena-like mythic stage
- else ÔåÆ liminal ÔÇ£earth/skyÔÇØ dreamscape

### Deterministic hashing

A 32-bit FNV-1a-style hash of the lowercased dream text, combined with `variation * 7919`, yields `seed`. Used for:

- title selection among pools
- art-style string picks
- Flux URL seed (`seed + variation` on the client call path)

This keeps demos reproducible for a fixed input.

### Symbol resolution

Ordered id collection from creatures, objects, action (`fight`/`flight`), emotion (`shadow`), place (`forest`/`house`), always including `dreamer`. Looked up in `SYMBOL_DB` for localized name/meaning pairs; capped (e.g. 6) to keep the UI scannable.

### Report sections (implementation intent)

| Section | Construction strategy |
| --- | --- |
| Emotional Atmosphere | Dominant + secondary emotion, drama paragraph, creature amplifier, action-as-verb, place coupling, excerpt quote |
| Symbols | Encyclopedia entries bound only to detected ids |
| Psychology | Integration framing, affect triage, special-case lion-fight motif, place-as-stage, practical stance, high-arousal grounding |
| Hidden Messages | Conditional bullets (enemy-as-strength, thresholds, water-as-feeling, epic scale) |
| Advice + Questions | Numbered practices + 6 reflection questions; lion-specific question rewrite |
| Themes | Motif list + optional mythic echo for lion combat |

Content is **conditional on extractions**, not a single static templateÔÇödifferent dreams activate different branches.

---

## Image Prompt Compiler

Still inside `analyzeDream` / `buildImagePrompt`. The compiler emits a single English prompt for image models (providers perform better on English art direction even when the UI is Turkish).

### Prompt slots (ordered)

1. Variation preamble (`Alternate masterful composition #n` vs definitive masterpiece)
2. Faithful narrative excerpt (truncated for stability)
3. Primary action/state
4. Environment sentence
5. Creature visuals (anatomy/light notes)
6. Object visuals
7. Grounding tokens from user phrases
8. Emotional pastel palette with hex codes
9. Lighting recipe (volumetric cinematic vs soft bloom)
10. Medium/style string from drama-selected pool
11. Composition + tone (epic diagonal vs breathing negative space)
12. Quality bar + **negatives** (no text/watermark/cartoon/extra limbs/gore spam)

Length is hard-capped (~1200 characters) to reduce provider rejection and URL overflow on the Flux GET fallback.

---

## Image Generation Pipeline

File: `src/lib/imagine.ts`

### Constants

| Constant | Value | Purpose |
| --- | --- | --- |
| `TIMEOUT_MS` | `90000` | Per-attempt hang protection |
| `MAX_RETRIES` | `2` | Additional attempts after the first (loop `attempt <= MAX_RETRIES`) |

### Algorithm

```
if signal aborted ÔåÆ throw aborted
for attempt in 0..MAX_RETRIES:
  merge outer AbortSignal with timeout AbortController
  POST /api/imagine { prompt }
  if ok && url ÔåÆ return { source: 'grok-imagine' }
  if ok && !url ÔåÆ return null (triggers flux)  // e.g. no_api_key
  if 5xx and retries left ÔåÆ backoff sleep(400 * (attempt+1))
  if network/timeout and retries left ÔåÆ backoff
return fluxFallback(prompt, seed)
```

### Flux fallback URL construction

```
GET https://image.pollinations.ai/prompt/{encodeURIComponent(prompt)}
  ?width=1440&height=1440
  &nologo=true
  &enhance=true
  &seed={abs(seed) % 2^31-1}
  &model=flux
```

Prompt is clipped before encoding if extremely long. Fallback is treated as success for product continuity; UI labels `source` honestly.

### Typed errors

```ts
type ImagineErrorCode = 'network' | 'server' | 'aborted' | 'unknown'
class ImagineError extends Error { readonly code: ImagineErrorCode }
```

UI maps `network` vs generic messages; `aborted` is swallowed (not shown as user-facing failure).

---

## Server Proxy Contract

Implemented as a Vite plugin middleware (`vite.config.ts`):

### `POST /api/imagine`

**Request body**

```json
{ "prompt": "string" }
```

**Responses**

| Condition | Status | Body |
| --- | --- | --- |
| Missing prompt | 400 | `{ "error": "prompt required" }` |
| No `XAI_API_KEY` | 200 | `{ "url": null, "source": null, "reason": "no_api_key" }` |
| Upstream success | 200 | `{ "url": "...", "source": "grok-imagine" }` |
| Upstream failure after model fallback | 502 | `{ "error": "...", "detail": "..." }` |

### Upstream payload to xAI

```json
{
  "model": "grok-imagine-image-quality | grok-imagine-image",
  "prompt": "<engineered prompt>",
  "n": 1,
  "response_format": "url"
}
```

Model strategy: try **quality** first; on non-OK response, retry once with **standard** `grok-imagine-image`. Response may include `url` or `b64_json` (normalized to data URL when needed).

### Why a proxy

- Keeps `XAI_API_KEY` out of the browser bundle
- Centralizes model fallback and error logging
- Matches BFF / ÔÇ£never expose third-party secrets to the clientÔÇØ expectations in job specs

---

## Internationalization

| Concern | Mechanism |
| --- | --- |
| UI catalog | `ui: Record<Lang, UiCopy>` in `lib/i18n.ts` |
| Analysis language | `lang` argument to pure `analyzeDream` |
| Persistence | `localStorage['dw-lang']` |
| Default | saved value ÔåÆ else `navigator.language` prefix `tr` ÔåÆ else `en` |
| Switch semantics | `setLang` updates state + storage; effect rewrites `session.report` only |

Analysis and chrome never hard-code one language in components; components receive `t: UiCopy` and `report` already localized.

---

## UI Composition Model

| Component | Responsibility | Memo |
| --- | --- | --- |
| `AmbientBackground` | Fixed gradient orbs + particle motion | yes |
| `DreamComposer` | Controlled input, validation chrome, CTA, examples | yes |
| `LoadingState` | Generation ritual animation | yes |
| `ImageFrame` | Skeleton, blur-up image, caption, open lightbox | yes |
| `AnalysisPanel` | Six scrollable report sections | yes |
| `LanguageSwitch` | Segmented control with `layoutId` pill | yes |
| `App` | Wiring only: hook ÔåÆ props, lightbox, scroll into view | no |

Props flow downward; events flow upward via stable callbacks from `useDream` (`weave`, `regenerate`, `reset`).

---

## Rendering and Layout Strategy

### Density-aware chrome

- **Idle**: fuller hero (subtitle + feature pills)
- **Success**: hero collapses (`is-compact`) to reclaim vertical space after generation

### Result grid

```css
/* mobile */
.result-grid { display: grid; gap: 1.15rem; }

/* ÔëÑ900px */
.result-grid {
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  align-items: start;
}
```

Image column + sticky-feel analysis panel (`max-height` + internal scroll on desktop) keeps the viewport ÔÇ£fullÔÇØ without large empty bands.

### Motion policy

Prefer `opacity` / `transform` animations. Avoid animating layout properties on large text blocks. Analysis sections use `whileInView` with `viewport.once` to limit ongoing observers.

---

## Performance Techniques

| Technique | Location / effect |
| --- | --- |
| `React.memo` | Leaf components skip re-render when props shallow-equal |
| `useCallback` | Stable `weave` / `regenerate` / `reset` / `setLang` |
| `useMemo` | Particle field generation; pure analysis hook |
| No image refetch on locale change | Saves provider cost and latency |
| Lazy image attributes | `loading="lazy"`, `decoding="async"` |
| Lean runtime deps | No Three.js in current build path; ambient is CSS/Framer |
| Optimistic pure analysis | CPU-only step before network; fails fast on validation |
| Seeded fallback URL | Avoids random uncached churn when re-opening same variation |

---

## Error Taxonomy and Resilience

| Failure class | Detection | User-visible outcome |
| --- | --- | --- |
| Validation | `length < 8` | No request; progress/meta hint only |
| Aborted | `ImagineError('aborted')` or stale `runId` | Silent (expected) |
| Network / timeout | fetch throw / abort timeout | Localized network or generic error; phase `error` |
| Upstream 4xx/5xx | HTTP status from proxy | Retry then Flux or error |
| No API key | `url: null, reason: no_api_key` | Flux path, still success if image loads |
| Image element failure | (UI) skeleton until load; broken image path can be extended | Caption still shows source |

Session policy on hard error: if a previous successful `image` exists, keep it; otherwise clear partial session to avoid empty success UI.

---

## Security Model

| Threat / concern | Mitigation |
| --- | --- |
| API key exfiltration | Key only in server env; never `import.meta.env` to client for secrets |
| Accidental commit of secrets | `.env` gitignored; `.env.example` placeholder only |
| Prompt injection into provider | Still possible (inherent to LLM/image APIs); negatives + single-purpose proxy reduce scope |
| Cost abuse | Not rate-limited in demo form; production should add auth + quotas on the BFF |
| XSS via image URL | URLs rendered in `src` only; no `dangerouslySetInnerHTML` for analysis |

---

## Project Structure

```
src/
  App.tsx                     # Composition root
  main.tsx                    # createRoot bootstrap
  index.css                   # Design system + layout density
  types/
    dream.ts                  # Lang, Phase, DreamReport, Session, ImagineResult
  hooks/
    useDream.ts               # Session FSM + abort + regenerate/reset
    useDreamAnalysis.ts       # Memoized pure analysis helper
  lib/
    analyze.ts                # Lexicons, drama, prompt compiler, report prose
    imagine.ts                # Client transport, retry, Flux fallback
    i18n.ts                   # UiCopy catalogs + lang persistence
  components/
    AmbientBackground.tsx
    DreamComposer.tsx
    ImageFrame.tsx
    AnalysisPanel.tsx
    LanguageSwitch.tsx
    LoadingState.tsx
vite.config.ts                # React + Tailwind + /api/imagine middleware
```

---

## Data Contracts (TypeScript)

```ts
type Lang = 'en' | 'tr'
type Phase = 'idle' | 'loading' | 'success' | 'error'
type ImageSource = 'grok-imagine' | 'flux'

type SymbolReading = { name: string; meaning: string }

type DreamReport = {
  seed: number
  variation: number
  title: string
  mood: string
  tags: string[]
  imagePrompt: string
  imageNote: string
  emotionalAtmosphere: string
  symbols: SymbolReading[]
  psychology: string
  hiddenMessages: string
  personalAdvice: string
  reflectionQuestions: string[]
  thematicConnections: string
  drama: number
}

type ImagineResult = {
  url: string
  source: ImageSource
  prompt: string
}

type DreamSession = {
  dreamText: string
  variation: number
  report: DreamReport
  image: ImagineResult | null
}
```

`useDream` public surface:

```ts
type UseDreamReturn = {
  lang: Lang
  setLang: (l: Lang) => void
  dreamText: string
  setDreamText: (v: string) => void
  phase: Phase
  error: string | null
  session: DreamSession | null
  report: DreamReport | null
  image: ImagineResult | null
  imageReady: boolean
  setImageReady: (v: boolean) => void
  canSubmit: boolean
  isLoading: boolean
  weave: () => Promise<void>
  regenerate: () => Promise<void>
  reset: () => void
}
```

---

## Engineering Competencies Mapping

| Common job-post requirement | Implementation evidence |
| --- | --- |
| Advanced React (hooks, composition) | Custom session hook; memoized component tree |
| Strong TypeScript | Shared domain types; typed errors; strict phase unions |
| Async / concurrent UI correctness | AbortController + runId stale guards |
| REST API integration | xAI Images API via BFF middleware |
| Error handling & resilience | Retries, timeouts, provider fallback, localized errors |
| State management | Explicit FSM; single session aggregate |
| Performance | Memo/callback, lazy images, no locale image refetch |
| Responsive CSS | Density-aware hero; CSS grid split at 900px |
| i18n | Dual catalogs; analysis recompute on locale |
| Security awareness | Server-only secrets; gitignore discipline |
| AI product engineering | Structured extraction ÔåÆ prompt compiler |
| UX completeness | idle / loading / success / error affordances |
| Maintainable structure | types / lib / hooks / components layering |
| Tooling fluency | Vite plugins, Tailwind v4, TS project build |

---

## Extension Points

| Goal | Suggested change |
| --- | --- |
| Replace lexicon analysis with LLM | Keep `DreamReport` shape; swap `analyzeDream` body for a server route that returns the same JSON |
| Production BFF | Lift `/api/imagine` to serverless/Node; add rate limits + auth |
| Persistence | Serialize `DreamSession[]` to IndexedDB or backend |
| Multi-image storyboard | Extend `ImagineResult` to `images: ImagineResult[]`; adjust grid |
| Tests | Unit-test `analyzeDream` fixtures; integration-test phase transitions with mocked `fetch` |
| Observability | Log `source`, latency, drama score (never prompts with PII in cleartext without policy) |
| Content safety | Pre-filter dream text and post-filter image URLs per provider policy |

---

## Summary

DreamViewer AI is a compact SPA that still exercises the full vertical of modern frontend product work: **typed domain modeling**, **pure analysis compilation**, **secret-safe generative API integration**, **cancellable async orchestration**, **fallback strategies**, **bilingual UX**, and a **dense, responsive presentation layer**. The architecture is intentionally small enough to read in one sitting, yet structured enough to grow into a multi-provider AI studio without rewriting the session model.
