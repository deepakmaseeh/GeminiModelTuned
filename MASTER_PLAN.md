# Auction AI – Master Plan

**Single source of truth** for features, speed, multi-user, and implementation order. Detailed auction-domain research (sellers, buyers, market research, education) is in [AUCTION_FEATURE_RESEARCH_PLAN.md](./AUCTION_FEATURE_RESEARCH_PLAN.md).

Aligned with **GCP Vertex AI** docs: [Generative AI on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs), [quotas](https://cloud.google.com/vertex-ai/generative-ai/docs/quotas), [Standard PayGo](https://cloud.google.com/vertex-ai/generative-ai/docs/standard-paygo), [inference (generateContent / streamGenerateContent)](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference).

---

## 1. Document Map (No Duplication)

| Topic | Where it lives in this doc |
|-------|----------------------------|
| **Speed (streaming, auth, tokens, image)** | §2 |
| **Multi-user (429, rate limit, quotas, global endpoint)** | §3 |
| **UI/UX (input, history, layout, errors, discovery, a11y)** | §4 |
| **Auction domain (sellers, buyers, research, modes)** | §5 |
| **Education & trust (glossary, learn, disclaimers)** | §6 |
| **Single implementation order** | §7 |
| **GCP/Vertex references** | §8 |

---

## 2. Faster Response (Consolidated)

### 2.1 Streaming (Vertex AI)

- **API:** Use `streamGenerateContent` instead of `generateContent`.
  - **REST:** Same base URL, path suffix `:streamGenerateContent` (e.g. `.../models/{model}:streamGenerateContent`). Request body is identical to non-streaming.
  - **Ref:** [Generate content with Gemini – inference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference).
- **Next.js:** Route handler returns a `ReadableStream`; read Vertex stream and forward chunks to the client.
- **Frontend:** Consume stream (e.g. `fetch` + `getReader()`), append chunks to the assistant message. Keep “Analyzing…” until first chunk. Accumulate full text for Copy/Export and for `parseProductDetails()` when stream ends.

**Result:** Time to first token ~1–3 s; perceived speed much better.

### 2.2 Auth

- **Cache access token** in module scope with expiry (e.g. reuse if `expiresAt > now + 5 min`). Saves ~100–400 ms when the same serverless instance serves another request.

### 2.3 Generation config

- **maxOutputTokens:** Cap at 2048 (or 1536); auction replies rarely need more.
- **Model:** Prefer Gemini Flash (e.g. `gemini-1.5-flash` / `gemini-2.0-flash`) for latency; already in env.
- **temperature:** Keep low (0.2–0.3).

### 2.4 Image

- **Optional:** Client-side resize (e.g. max 1024 px) + compress before upload to reduce payload and input tokens.

### 2.5 UI (perceived speed)

- Progressive states: “Uploading…” → “Analyzing…” → streamed text.
- Timeout (e.g. 60 s) + “Request took too long” and **Retry** (same as “Retry on error” in §4).

---

## 3. Multi-User & Concurrency (Consolidated)

### 3.1 How it works

- **Vercel:** Stateless; each request can run in a new or existing instance. Multiple users are supported by default.
- **Limits:** Vertex AI **quotas** (RPM, TPM) and **cost**. Per [Vertex AI quotas](https://cloud.google.com/vertex-ai/generative-ai/docs/quotas) and [Standard PayGo](https://cloud.google.com/vertex-ai/generative-ai/docs/standard-paygo):
  - **RPM:** System limit **30,000 RPM per model per region**.
  - **TPM:** By tier (e.g. Flash Tier 1: 2M TPM, Tier 2: 4M, Tier 3: 10M). Traffic can burst; during high demand, excess may be throttled (429).
  - **429:** Indicates temporary resource contention, not a fixed quota. Official recommendation: **exponential backoff** + **global endpoint** + **traffic smoothing** (avoid sharp spikes).

### 3.2 429 handling (GCP-recommended)

- **Detect:** In API route, treat `res.status === 429` (and Vertex error messages like “resource exhausted”) as throttle.
- **Response:** Return clear JSON error to client, e.g. `"Service busy. Please try again in a moment."` with HTTP 503 (or 429).
- **Frontend:** Show “Too many people using the app right now. Please try again in a minute.” + **Retry** button (same control as “Retry on error”).
- **Optional:** One automatic retry with **exponential backoff** (e.g. 2–5 s delay) for 429 only; document in plan so it’s consistent with [handling 429](https://cloud.google.com/vertex-ai/generative-ai/docs/standard-paygo#resource_exhausted_429_errors).

### 3.3 Global endpoint (GCP best practice)

- **Option:** Use Vertex **global** endpoint for Gemini when data residency is not required: `location = 'global'`, base `https://aiplatform.googleapis.com/`. Larger shared capacity and better availability.
- **Ref:** [Standard PayGo – 429](https://cloud.google.com/vertex-ai/generative-ai/docs/standard-paygo#resource_exhausted_429_errors); [Deployments and endpoints](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations).
- **Implementation:** Env var e.g. `VERTEX_USE_GLOBAL_ENDPOINT=true`; when set, build URL with `locations/global` and `aiplatform.googleapis.com`. Note: custom **endpoints** (tuned models) may be regional only—keep existing endpoint URL when using `VERTEX_ENDPOINT_ID`.

### 3.4 Rate limiting (app-level)

- **Purpose:** Protect Vertex quota and cost; prevent one client/bot from exhausting capacity.
- **Simple:** Per-IP limit (e.g. 10–20 requests/minute) in API route. Use `x-forwarded-for` or `x-real-ip` on Vercel. In-memory per-container count with 1‑minute window.
- **Strict:** Global limit via Redis/Vercel KV/Upstash for cross-instance count.
- **Response:** When over limit return 429/503 with “You’re sending requests too quickly. Please wait a minute.”

### 3.5 Cost & observability

- Set GCP budget alerts; monitor usage in [Cloud Billing](https://console.cloud.google.com/billing) and [Metrics Explorer](https://console.cloud.google.com/monitoring/metrics-explorer) (Standard PayGo doc). Optional: response cache by hash(prompt + image) with TTL to reduce duplicate calls.

---

## 4. UI/UX

- **Input:** Enter to send; Shift+Enter new line; drag & drop image; paste image (Ctrl/Cmd+V); optional multiple images; “Image optional” label; max length hint.
- **Responses & history:** Export chat (.txt/.md); copy last (plain + optional markdown); **Regenerate** last reply; **Edit & resend**; session history in sidebar (localStorage), click to load.
- **Layout:** Collapse long replies; full-screen image lightbox; dark mode; compact/comfortable toggle; sticky header.
- **Errors & loading:** **Retry on error** (single control for network, timeout, 429); loading steps “Sending…” → “Analyzing…”; offline message “Check your connection.”
- **Discovery:** First-time hints; keyboard shortcuts panel (“?”); example prompts in empty state; model/endpoint badge (e.g. “Vertex AI · gemini-1.5-flash”).
- **Accessibility:** Focus after send; “Skip to message input”; ARIA labels on icon buttons; respect `prefers-reduced-motion`.

---

## 5. Auction Domain

- **Modes:** Role selector “I’m selling” / “I’m buying” / “Just researching” → different default prompts and templates.
- **Sellers:** Listing-optimized prompt (title, description, keywords, condition disclaimer); reserve/opening bid suggestion; export for eBay/auction (CSV/JSON); “What would improve value?” follow-up; seller templates in sidebar.
- **Buyers:** “Should I bid?” summary; red flags / authenticity notes; condition grade (e.g. A–D); “What to check in person?”; hammer vs total cost explainer + buyer’s premium calculator.
- **Research:** Text-only “Trends for this category” / “How does this compare to similar sold?”; research mode (no image); stronger “Market notes” in prompt.
- **Multi-turn:** Send last N turns (user + assistant) in `contents` for follow-up questions (“Why?”, “What about restoration?”). Respect token budget; optional context window cap.

---

## 6. Education & Trust (Consolidated)

- **Disclaimers (single place):**
  - Estimate: “AI-generated estimate for guidance only. Not a formal appraisal. Actual value depends on venue, timing, and buyer interest.”
  - Not for insurance/legal; in-person inspection may differ; analysis based only on provided image(s).
- **Where:** On or under the price/estimate card; footer or “Learn” link; optional short “Limitations” in Learn.
- **Learn hub:** `/learn` with: Glossary (hammer, buyer’s premium, reserve, estimate, lot, bought-in, absentee bid, provenance); “Understanding estimates”; “How we analyze”; “How to bid” / “How to sell” short guides; term tooltips in ProductDetailsCard (e.g. “Market notes”, “Estimate”).
- **Transparency:** Model badge (“Vertex AI · model name”); “How it works” (image + AI, structured format, no human appraiser).
- **Safety:** Rate limiting (§3.4); optional content moderation for text-only; user-friendly messages for quota/network/invalid image.

---

## 7. Single Implementation Order (Best Solution)

Phases are ordered so **speed + multi-user** come first (foundation), then **UX and auction features**, then **education and scale**. Each phase is shippable.

### Phase 1 – Foundation (speed + multi-user + errors)

1. **Auth cache** – Reuse token in module scope with expiry.
2. **Generation config** – `maxOutputTokens` 2048 (or 1536).
3. **429 handling** – Detect 429, return clear message; frontend “Service busy, try again” + **Retry**.
4. **Timeout** – 60 s server + client; “Request took too long” + **Retry**.
5. **Retry on error** – One “Retry” control for failed/429/timeout (frontend).
6. **Optional:** Global endpoint – `VERTEX_USE_GLOBAL_ENDPOINT` for publisher models (not tuned endpoint).
7. **Optional:** One retry with exponential backoff for 429 in API.

### Phase 2 – Perceived speed (streaming)

8. **Vertex streaming** – Use `:streamGenerateContent` (same body as `generateContent`).
9. **API stream** – Route returns `ReadableStream`; pipe Vertex chunks to client.
10. **Frontend stream** – Consume stream, show text progressively; accumulate full text for Copy/Export and parsing when done.
11. **Progressive loading** – “Uploading…” → “Analyzing…” until first chunk.

### Phase 3 – UX quick wins (from Feature Plan)

12. Enter to send; Shift+Enter new line; focus after send.
13. Export chat; Copy last response; ARIA labels; collapse long replies; sticky header.
14. Example prompts in empty state; first-time hints; model badge.
15. Session history (localStorage); load/save in sidebar.

### Phase 4 – Trust & education

16. **Disclaimers** – Estimate + not insurance/legal + image limitation (on card or footer + Learn).
17. **Learn hub** – `/learn` with glossary (top 10 terms), “Understanding estimates”, “How we analyze”, Limitations.
18. Tooltips on card fields (“What this means” for Condition, Market notes, Price).

### Phase 5 – Auction domain

19. **Role selector** – Seller / Buyer / Research; adjust default prompts and sidebar templates.
20. **Prompt upgrades** – Buyer summary, authenticity/red flags, reserve/opening bid, stronger Market notes; condition grade in prompt + parsed badge.
21. **Listing mode** – “Generate listing” (title, description, keywords, condition disclaimer); export for listing (CSV/JSON).
22. **Follow-ups** – “What would improve value?”; “What to check in person?”; “Compare to similar sold” (text-only).

### Phase 6 – Multi-user hardening & input

23. **Rate limit** – Per-IP in-memory (e.g. 15 req/min); 429/503 when over.
24. **Input** – Drag & drop image; paste image; optional multi-image (2–4); max length hint.
25. **Optional:** Global rate limit (Redis/KV); image resize on client; response cache by hash.

### Phase 7 – Education depth & optional scale

26. Full glossary page; term tooltips in AI response; hammer vs total calculator; short guides (how to bid, how to sell).
27. Multi-turn: send conversation history in `contents`; context window cap.
28. Multi-photo (2–4 images) in one request; comparables placeholder; quota docs link in UI/support.

---

## 8. GCP / Vertex AI References (For Planning & Coding)

| Topic | Link | Use |
|-------|------|-----|
| **Generate content (non-stream + stream)** | [Model reference – inference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference) | Request/response body, `contents`, `generationConfig`, multi-turn |
| **Streaming** | Same doc: `streamGenerateContent` | Path `:streamGenerateContent`; same request as `generateContent` |
| **Quotas** | [Generative AI quotas](https://cloud.google.com/vertex-ai/generative-ai/docs/quotas) | Tuned model = base model quota; other product quotas |
| **Standard PayGo (TPM, 429, global)** | [Standard PayGo](https://cloud.google.com/vertex-ai/generative-ai/docs/standard-paygo) | Tiers, 429 handling, global endpoint, traffic smoothing |
| **429 handling** | [A guide to handling 429](https://cloud.google.com/blog/products/ai-machine-learning/learn-how-to-handle-429-resource-exhaustion-errors-in-your-llms) | Exponential backoff, best practices |
| **Locations / global endpoint** | [Deployments and endpoints](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations) | `locations/global` for higher availability |
| **REST reference** | [Vertex AI REST – publishers models](https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.publishers.models) | Exact endpoint paths (generateContent, streamGenerateContent) |
| **Quickstart (multimodal)** | [Quickstart multimodal](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal) | Sample code, auth, request shape |

---

## 9. Best Solutions Summary

| Goal | Best solution |
|------|----------------|
| **Faster response** | Streaming (`streamGenerateContent`) + auth cache + lower `maxOutputTokens` + optional image resize. |
| **Multi-user** | Rely on stateless scaling; add 429 handling + user message + Retry; optional global endpoint + exponential backoff; per-IP rate limit to protect quota. |
| **Single Retry** | One “Retry” button for network error, timeout, and 429 (no separate “Retry” vs “Service busy”). |
| **Single disclaimers** | One set of estimate + not insurance/legal + image limitation; reuse in card, footer, and Learn. |
| **Order** | Foundation (speed + 429 + timeout + Retry) → Streaming → UX → Trust/Learn → Auction domain → Rate limit/input → Education depth. |

This merged plan removes duplication, aligns with GCP Vertex AI docs, and gives one clear order to implement features and coding tasks.
