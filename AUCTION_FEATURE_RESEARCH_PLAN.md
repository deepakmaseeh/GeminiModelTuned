# Auction AI – Deep Feature & Research Plan

**Purpose:** A detailed, research-backed plan to make the app more helpful for **auction sellers**, **buyers**, **market research**, and **education** (new and experienced users), plus important information and considerations.

**Implementation:** All features here are in [MASTER_PLAN.md](./MASTER_PLAN.md) with one implementation order (including UI/UX, speed, and multi-user).

---

## 1. Current Codebase Summary

| Area | What Exists |
|------|-------------|
| **Stack** | Next.js 15, React 19, Tailwind, Vertex AI (Gemini) |
| **API** | `/api/gemini-test` – accepts image + text, uses Vertex generateContent; image path uses a fixed “auction specialist” prompt (item name, condition, materials, dimensions, age, maker, details, damage, market notes, **price**). Text-only path uses user prompt as-is. |
| **UI** | Single chat flow: upload image and/or type; AI returns structured product details; sidebar with category templates (Furniture, Ceramics, Jewelry, Art, General) and tips. Copy last response, Clear, Stop. |
| **Parsing** | `parseProductDetails()` in gemini-test page parses bold-label blocks and renders a **ProductDetailsCard** (condition, materials, dimensions, age, maker, details, damage, market notes, price). |
| **Auth/Data** | No auth; no persistence (no DB, no session history in backend). |

**Gaps vs. goal:** No explicit seller vs buyer flows, no market research tools, no education/glossary, no multi-turn “auction expert” chat, no comparables or price-history data, no disclaimers or learning paths.

---

## 2. Features for Auction Sellers

Sellers need: **listing prep**, **pricing**, **descriptions**, and **market insight**.

### 2.1 Listing & Description Tools

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Listing-optimized prompt** | Optional “mode”: “Generate a seller listing” – title (SEO), short description, full description, key bullet points, suggested category. | Low | New prompt variant in API; same image+text input. |
| **Keyword / tag suggestions** | From analysis, output suggested search keywords and tags for marketplace listing. | Low | Add to system prompt or post-process. |
| **Condition statement generator** | One-click “Generate condition disclaimer” from the Damage/Flaws section (e.g. “Sold as seen”, “Wear consistent with age”). | Low | Template + AI fill from parsed damage. |
| **Multi-photo analysis** | Support 2–4 images per request; “Describe condition across all angles” or “List any damage visible in these photos.” | Medium | API: multi-part inlineData; UI: multi-file upload. |
| **Export for eBay/auction sites** | Export current analysis as CSV/structured JSON (title, description, condition, dimensions, estimate) for upload to eBay, Catawiki, etc. | Medium | Frontend export + optional backend template. |

### 2.2 Pricing & Valuation for Sellers

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Reserve / min price suggestion** | Add to prompt: “Suggest a reasonable reserve (minimum) and opening bid for a live auction.” | Low | Prompt + parse new bold block **Reserve/Opening bid**. |
| **Price range explanation** | When AI gives a range (e.g. $50–$80), add 1–2 sentence “why this range” for seller education. | Low | Already in “Market notes”; can make explicit. |
| **Seller-specific disclaimer** | “Estimate for seller guidance only; final price depends on venue, audience, and timing.” | Low | Static text + link to “Understanding estimates” in Learn. |
| **“What would improve value?”** | Follow-up prompt (or button): “What repairs, attribution, or documentation could increase the value?” | Low | Text-only follow-up in same chat. |

### 2.3 Seller-Focused Templates & Modes

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Seller mode toggle** | UI mode “I’m selling” vs “I’m buying” vs “Just researching” – adjusts default prompts and suggested templates. | Low | State + different default templates. |
| **Seller prompt templates** | e.g. “Prepare a listing”, “Suggest reserve and opening bid”, “Keywords for search”, “Condition disclaimer”. | Low | Add to sidebar; inject into prompt. |
| **Category-specific seller tips** | Per category (Furniture, Ceramics, etc.): “Sellers: mention joinery, wood type, restorations.” | Low | Copy in sidebar or tooltip. |

---

## 3. Features for Buyers

Buyers need: **authenticity**, **condition**, **fair value**, and **bidding strategy**.

### 3.1 Buying & Bidding Guidance

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Buyer mode / templates** | “I’m considering bidding” – prompt emphasizes: authenticity red flags, condition vs price, “worth it?” summary. | Low | Mode + prompt variant. |
| **“Should I bid?” summary** | Optional output block: **Buyer summary:** Pros, cons, risk level (e.g. “Condition issues”, “Unverified attribution”), suggested max bid range. | Low | Add to system prompt; parse new block in UI. |
| **Red flags / authenticity callouts** | Prompt: “List any authenticity or attribution concerns and suggest what to verify before bidding.” | Low | Could be **Authenticity notes** in existing format. |
| **Hammer vs total cost** | Short explainer + optional calculator: “If hammer is $100 and buyer’s premium is 20%, you pay $120.” | Low | Static Learn content + simple calculator component. |
| **Follow-up: “Compare to similar sold”** | Button or prompt: “How does this compare to typical sold prices for similar items?” (AI answer from general knowledge). | Low | Text-only follow-up. |

### 3.2 Condition & Transparency

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Condition grade** | Ask AI to give a simple grade (e.g. A–D or “Excellent/Good/Fair/Poor”) plus one-line summary. | Low | Add to prompt; parse and show badge in card. |
| **“What to check in person”** | “If viewing in person, what would you inspect?” (e.g. cracks, repairs, signatures). | Low | Follow-up or extra prompt block. |
| **Damage visibility note** | “Damage assessment is based only on provided images; actual condition may vary.” | Low | Static disclaimer near condition. |

---

## 4. Market Research & Data (Sellers + Buyers)

Today the app uses only the model’s general knowledge. “Market research” here means **better use of AI** and optional **structure** for future data.

### 4.1 AI-Driven Research (No External APIs)

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Market notes enhancement** | Strengthen prompt: “Market notes: recent demand, typical venues (online vs live), seasonal factors, comparable categories.” | Low | Prompt only. |
| **“Trends for this category”** | Text-only prompt (or button): “What are current market trends for [category]?” Reuse same model. | Low | New template or follow-up. |
| **Comparables narrative** | “Describe how similar items have performed at auction (general trends, not specific lots).” | Low | Prompt addition. |
| **Research mode** | Dedicated “Research” mode: no image required; questions like “What affects value of Art Deco furniture?” or “How to spot reproduction Ming?” | Low | New page or mode; text-only API. |

### 4.2 Structured Data (Future / Optional)

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Price history placeholder** | UI: “Price history for similar items” card – “Coming soon” or “Based on general market knowledge” with short AI summary. | Low | Sets expectation; no backend yet. |
| **Comparables API later** | If you add a comparables API (e.g. auction results aggregator), slot in “Similar sold” section. | High | External API + auth/cost. |
| **Saved estimates** | Let users “Save this estimate” to localStorage (or DB later): item name, date, estimate, category. Build simple “My estimates” list. | Medium | Frontend first; optional backend. |

---

## 5. Education & Onboarding (New and Experienced Users)

### 5.1 Glossary & Terminology

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **In-app glossary** | New route e.g. `/learn/glossary` with terms: **Hammer price**, **Buyer’s premium**, **Reserve**, **Estimate**, **Lot**, **Bought-in**, **Absentee bid**, **Provenance**, **Condition report**, etc. Searchable or by category. | Medium | Static content; optional search. |
| **Term tooltips** | In AI response, make first occurrence of “reserve”, “buyer’s premium”, “hammer” etc. clickable → tooltip or link to glossary. | Medium | Parse response; term list; small UI. |
| **“What this means” for fields** | In ProductDetailsCard, small (?) next to “Market notes”, “Estimate”, “Condition” → short definition. | Low | Tooltips + 1–2 sentence copy. |

### 5.2 Learning Paths & Guides

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Learn hub** | `/learn` landing: “New to auctions?”, “Selling?”, “Buying?”, “Understanding estimates”, “Condition & authenticity”. Each links to short guide. | Medium | Static pages or MDX. |
| **First-time tips** | On first visit to gemini-test: one-time overlay or banner: “Upload a photo for instant analysis. Use templates on the right. Estimates are guidance, not guarantees.” | Low | localStorage “hasSeenTips”. |
| **Short guides** | 1–2 page guides: “How to read an auction listing”, “How to set a reserve”, “How to bid safely”, “How we generate estimates”. | Medium | Content + simple layout. |
| **Video placeholders** | “How to photograph items for best results” – placeholder + link to external or future video. | Low | Link list in Learn. |
| **Category deep-dives** | Optional: “Furniture: what we look for”, “Ceramics: marks and periods”, “Jewelry: hallmarks”. | Medium | Content-heavy. |

### 5.3 In-Context Education

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Example prompts** | Empty state: clickable examples: “What’s this worth?”, “Describe condition for a listing”, “Any authenticity concerns?”, “Suggest a reserve price.” | Low | Already in FEATURE_PLAN; extend list. |
| **“Why did you say that?”** | Optional: “Explain in simple terms why this estimate range” – follow-up to last response. | Low | Send last AI reply + this question. |
| **Tips by role** | In sidebar: “Sellers: …” / “Buyers: …” / “Researchers: …” with 2–3 bullets each. | Low | Copy + optional role selector. |

---

## 6. Important Information & Trust

### 6.1 Disclaimers & Legal

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Estimate disclaimer** | Visible wherever price/estimate is shown: “This is an AI-generated estimate for guidance only. Not a formal appraisal. Actual value depends on venue, timing, and buyer interest.” | Low | Footer or banner on card. |
| **Not insurance/legal** | “Not for insurance or legal valuation. For formal appraisal, consult a qualified specialist.” Link from footer or Learn. | Low | One paragraph in Learn + link. |
| **Image limitation** | “Analysis is based only on the image(s) provided. In-person inspection may reveal different condition or authenticity.” | Low | Near analysis card or in tips. |
| **Terms of use / privacy** | If you collect any data or allow sharing later, add ToU and Privacy policy; mention AI and data retention. | Medium | Legal copy + routes. |

### 6.2 Transparency & Model Behavior

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Model badge** | Show “Powered by Vertex AI” or “Gemini” and optionally model name from env (e.g. gemini-1.5-flash). | Low | Already partially there; read from API or env. |
| **“How it works”** | Short “How we analyze”: image + AI model, no human appraiser, structured format. Link from footer. | Low | One page or section in Learn. |
| **Limitations** | “We may miss damage not visible in photos. Attribution and authenticity are best verified by experts.” | Low | Learn or tooltip. |

### 6.3 Safety & Quality

| Feature | Description | Effort | Notes |
|--------|-------------|--------|--------|
| **Content moderation** | If you allow free-text only (no image), consider basic moderation or rate limit to avoid abuse. | Medium | Backend + policy. |
| **Rate limiting** | Per IP or per session: limit requests per minute to protect API cost and availability. | Medium | Middleware or API. |
| **Error messages** | User-friendly messages for quota, network, invalid image; link to “Get help” or status. | Low | Already partly in place; refine. |

---

## 7. UX & Flow Improvements (Cross-Cutting)

- **Role selector:** “I’m a seller” / “I’m a buyer” / “Just researching” at top or in sidebar – influences default templates and optional output blocks (e.g. “Buyer summary”, “Listing suggestion”).
- **Conversation memory:** Multi-turn: send last N turns (user + assistant) to API so user can ask “Why?” or “What about restoration?” in follow-up. Requires sending `contents` array with history (and token budget).
- **Session history:** Save sessions in localStorage (or DB); “Past analyses” in sidebar. Per FEATURE_PLAN.
- **Export:** Export chat or last response as .txt/.md; optional “Export for listing” (structured). Per FEATURE_PLAN.
- **Regenerate / Retry:** Regenerate last AI reply; retry on error. Per FEATURE_PLAN.
- **Accessibility:** ARIA, keyboard, reduced motion. Per FEATURE_PLAN.

---

## 8. Suggested Implementation Order

### Phase 1 – Quick wins (1–2 weeks)

1. **Disclaimers:** Estimate disclaimer + “not for insurance/legal” + image limitation (on card or footer).
2. **Role selector + templates:** Seller / Buyer / Research modes; add 3–5 seller and buyer prompt templates in sidebar.
3. **Prompt upgrades:** “Buyer summary” / “Red flags” block; “Reserve/opening bid” for sellers; stronger “Market notes”.
4. **Example prompts:** Expand empty-state examples (listing, reserve, authenticity, “What’s this worth?”).
5. **Learn entry:** Single `/learn` page with: Glossary (top 10 terms), “Understanding estimates”, “How we analyze”, Limitations.

### Phase 2 – Education & clarity (2–3 weeks)

6. **Glossary page:** Full glossary with search; link from tooltips on first occurrence of key terms in response.
7. **Tooltips on card:** “What this means” for Condition, Market notes, Price/Estimate.
8. **First-time tips:** One-time onboarding banner or modal.
9. **Hammer vs total:** Short explainer + simple buyer’s premium calculator.

### Phase 3 – Seller & buyer depth (2–4 weeks)

10. **Listing mode:** “Generate listing” (title, description, keywords, condition disclaimer).
11. **Condition grade:** A–D or Excellent/Good/Fair/Poor in prompt + parsed badge.
12. **“What would improve value?”** and **“What to check in person?”** as follow-up actions.
13. **Export for listing:** Download structured data (CSV/JSON) for title, description, condition, estimate.
14. **Saved estimates:** “Save this estimate” → list in sidebar or “My estimates” page (localStorage first).

### Phase 4 – Research & scale (optional, 4+ weeks)

15. **Research mode:** Text-only “market trends” and “category insights” flows.
16. **Multi-turn:** Send conversation history to API for follow-up Q&A.
17. **Multi-photo:** 2–4 images per request for condition across angles.
18. **Rate limiting + moderation:** Protect API and users.
19. **Comparables placeholder:** “Similar sold” card with “Based on general knowledge” or “Coming soon.”

---

## 9. What to Consider (Summary)

- **Audience:** Who is primary (sellers vs buyers vs both)? Prioritize templates and copy for them.
- **Liability:** Clear disclaimers that estimates are guidance only and not formal appraisals; link to Learn.
- **Trust:** Explain how the AI works and its limitations; show model badge; avoid overclaiming.
- **Data:** If you later add saved sessions or accounts, add Privacy and ToU and secure storage.
- **Cost:** Token usage grows with multi-turn and long history; set context window limit and consider caching.
- **i18n:** If you target multiple languages, plan for glossary and Learn content translation.
- **Mobile:** Ensure image upload, sidebar, and long cards work well on small screens (already partly addressed).
- **Accessibility:** Keyboard, screen readers, and reduced motion (see FEATURE_PLAN).

---

## 10. References (Research)

- **Auction platforms:** AuctionMethod (analytics, bidder reports, export), eBay (product research, sourcing insights).
- **Auction terms:** Christie’s glossary, Invaluable, The Saleroom, VAA – hammer price, buyer’s premium, reserve, estimate, lot, bought-in, absentee bid.
- **AI valuation tools:** Antiquary, ValueScanner AI, SnapValu, EstimAI, InstAppraisal – image-based ID, condition, comparables narrative, “not a formal appraisal” disclaimers.

This plan is aligned with your existing [FEATURE_PLAN.md](./FEATURE_PLAN.md) and extends it with auction-domain features, education, and trust so the app is more helpful and reliable for sellers, buyers, and researchers.
