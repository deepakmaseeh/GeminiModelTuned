# Feature plan – Auction AI

Status of the master plan: what’s done vs what’s still pending.

---

## Done

| Feature | Where |
|--------|--------|
| **Image + text analysis** | Upload image, optional note → product details + price |
| **Text-only chat** | Send message without image |
| **Stop** | Cancel in-flight request (header when loading) |
| **Copy last response** | Header button → clipboard + “Copied” feedback |
| **Clear chat** | Header button → new conversation |
| **Retry on error** | Retry button when request fails (error bar) |
| **Sidebar** | Prompt templates (Furniture, Ceramics, etc.) + Tips; mobile slide-over |
| **Price parsing** | Bold labels + fallbacks for price line / money-like text |
| **Vercel deploy** | `GCP_SERVICE_ACCOUNT_KEY` for auth; no key file on serverless |
| **Hydration fix** | `suppressHydrationWarning` on elements touched by extensions |

---

## Pending (from plan)

### Input & sending
| Feature | Description | Effort |
|--------|----------------|--------|
| **Enter to send** | Enter = send, Shift+Enter = new line | Low |
| **Drag & drop image** | Drop image on chat/input to attach | Medium |
| **Paste image** | Ctrl+V / Cmd+V to paste image from clipboard | Medium |
| **Max length hint** | Show character count or limit near input | Low |

### Responses & history
| Feature | Description | Effort |
|--------|----------------|--------|
| **Export chat** | Download full conversation as `.txt` or `.md` | Low |
| **Regenerate** | “Regenerate” on last assistant message → same input, new reply | Low |
| **Session history** | List past conversations in sidebar (e.g. localStorage), click to load | Medium |

### Layout & display
| Feature | Description | Effort |
|--------|----------------|--------|
| **Collapse long replies** | Long product-detail blocks start collapsed, “Show more” | Low |
| **Full-screen image** | Click user image → lightbox/zoom | Low |
| **Dark mode** | Toggle theme, persist in `localStorage` | Medium |
| **Compact view** | Toggle tighter vs comfortable spacing | Low |

### Errors & loading
| Feature | Description | Effort |
|--------|----------------|--------|
| **Loading steps** | “Sending…” → “Analyzing…” or simple progress | Low |
| **Offline message** | “Check your connection” when fetch fails (network) | Low |

### Discovery & help
| Feature | Description | Effort |
|--------|----------------|--------|
| **Example prompts** | Empty state: 2–3 clickable examples (“What’s this worth?”, “Describe condition”) | Low |
| **Keyboard shortcuts panel** | “?” or icon → overlay with Enter / Shift+Enter / Esc | Low |
| **Model badge** | Header/footer: “Using: Vertex endpoint” (read-only from env) | Low |

### Accessibility & polish
| Feature | Description | Effort |
|--------|----------------|--------|
| **Focus after send** | After sending, focus stays on text input | Low |
| **ARIA labels** | Proper labels on icon-only buttons (Image, Send, Stop, Copy, Clear) | Low |
| **Reduced motion** | Respect `prefers-reduced-motion` for animations | Low |

---

## Suggested order to implement next

1. **Quick wins:** Enter to send, export chat, focus after send, example prompts in empty state.
2. **UX:** Collapse long replies, full-screen image, dark mode.
3. **Input:** Drag & drop image, paste image.
4. **History:** Session list in sidebar (localStorage).

Pick any row(s) from the tables above and we can implement them step by step.
