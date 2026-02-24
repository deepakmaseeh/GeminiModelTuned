"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

function parseProductDetails(text) {
  if (!text || !text.trim()) return null;
  const t = text.trim();
  const out = {};
  const blockRegex = /(?:\*\*)([^*]+)(?:\*\*)\s*[:\-]?\s*\n?([\s\S]*?)(?=(?:\*\*)[^*]+\*\*|$)/gi;
  let m;
  while ((m = blockRegex.exec(t)) !== null) {
    const label = (m[1] || "").trim().toLowerCase();
    const content = (m[2] || "").trim();
    if (!content) continue;
    if (label.includes("item name") || (label.includes("name") && !label.includes("market"))) out.itemName = content;
    else if (label.includes("condition")) out.condition = content;
    else if (label.includes("material")) out.materials = content;
    else if (label.includes("dimension")) out.dimensions = content;
    else if (label.includes("age") || label.includes("period")) out.age = content;
    else if (label.includes("maker") || label.includes("origin")) out.maker = content;
    else if (label.includes("detail") || label.includes("description")) out.details = content;
    else if (label.includes("damage") || label.includes("flaw")) out.damage = content;
    else if (label.includes("market")) out.marketNotes = content;
    else if (label.includes("value") || label.includes("price") || label.includes("estimate")) out.price = content;
  }
  if (Object.keys(out).length > 0) return out;
  return { raw: t };
}

function DetailRow({ label, value }) {
  if (!value || value === "N/A") return null;
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}

function ProductDetailsCard({ text }) {
  const parsed = parseProductDetails(text);
  if (!parsed) return <p className="text-slate-400 italic text-sm">No response.</p>;
  if (parsed.raw) {
    return (
      <div className="whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-700">
        {parsed.raw}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      {parsed.itemName && (
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-800">{parsed.itemName}</h3>
        </div>
      )}
      <div className="max-h-72 overflow-y-auto px-4 py-3">
        <DetailRow label="Condition" value={parsed.condition} />
        <DetailRow label="Materials" value={parsed.materials} />
        <DetailRow label="Dimensions" value={parsed.dimensions} />
        <DetailRow label="Age / Period" value={parsed.age} />
        <DetailRow label="Maker / Origin" value={parsed.maker} />
        <DetailRow label="Details" value={parsed.details} />
        <DetailRow label="Damage / Flaws" value={parsed.damage} />
        <DetailRow label="Market notes" value={parsed.marketNotes} />
      </div>
      {parsed.price && (
        <div className="border-t border-slate-200 bg-slate-800 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Price</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-white">{parsed.price}</p>
        </div>
      )}
    </div>
  );
}

export default function GeminiTestPage() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    if (f && f.type.startsWith("image/")) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  function handleClearChat() {
    setMessages([]);
    setError(null);
  }

  function getLastAssistantText() {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && !messages[i].loading && messages[i].text) {
        return messages[i].text;
      }
    }
    return null;
  }

  async function handleCopyLastResponse() {
    const last = getLastAssistantText();
    if (!last) return;
    try {
      await navigator.clipboard.writeText(last);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      setError("Copy failed.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const userText = text.trim();
    if (!file && !userText) {
      setError("Add an image or type a message to chat.");
      return;
    }
    const displayText = userText || (file ? "Analyze this item." : "");
    let imageDataUrl = null;
    if (file) {
      imageDataUrl = await readFileAsDataUrl(file);
    }
    setMessages((prev) => [
      ...prev,
      { role: "user", text: displayText, imageUrl: imageDataUrl || undefined },
      { role: "assistant", text: null, loading: true },
    ]);
    setText("");
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const formData = new FormData();
      if (file) formData.append("image", file);
      formData.append("text", userText);
      const res = await fetch("/api/gemini-test", {
        method: "POST",
        body: formData,
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last?.loading) {
            next[next.length - 1] = { role: "assistant", text: "Error: " + (data.error || res.status), loading: false };
          }
          return next;
        });
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last?.loading) {
          next[next.length - 1] = { role: "assistant", text: data.text ?? "", loading: false };
        }
        return next;
      });
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last?.loading) {
            next[next.length - 1] = { role: "assistant", text: "Stopped.", loading: false };
          }
          return next;
        });
        return;
      }
      setError(err.message ?? "Request failed");
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last?.loading) {
          next[next.length - 1] = { role: "assistant", text: "Error: " + (err.message || "Request failed"), loading: false };
        }
        return next;
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <main className="flex h-screen flex-col bg-slate-100" suppressHydrationWarning>
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-slate-800">Auction AI</h1>
            <p className="text-[11px] text-slate-500">Product analysis · Condition & price</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !loading && (
            <>
              <button
                type="button"
                onClick={handleCopyLastResponse}
                disabled={!getLastAssistantText()}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                title="Copy last response"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
                title="Clear chat"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            </>
          )}
          {loading && (
            <button
              type="button"
              onClick={handleStop}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 transition hover:bg-red-100"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={sidebarOpen ? "Close tips" : "Open tips"}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Vertex AI
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 flex overflow-hidden">
        {/* Main chat area */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-5">
            {messages.length === 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">Upload an image or type to chat</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Analyze an item with a photo, or ask a question with text only. Use Stop to cancel a request.
              </p>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white shadow-md"
                      : "border border-slate-200/90 bg-white shadow-sm"
                  }`}
                >
                  {msg.role === "user" && (
                    <>
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt=""
                          className="mb-3 max-h-36 rounded-lg object-contain ring-1 ring-white/10"
                        />
                      )}
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-100">
                        {msg.text}
                      </p>
                    </>
                  )}
                  {msg.role === "assistant" &&
                    (msg.loading ? (
                      <div className="flex items-center gap-2 py-1 text-slate-500">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                        <span className="ml-2 text-[13px]">Analyzing…</span>
                      </div>
                    ) : (
                      <ProductDetailsCard text={msg.text || ""} />
                    ))}
                </div>
              </div>
            ))}
          </div>
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Right sidebar: tips + prompt templates */}
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}
          <aside
            className={`fixed top-0 right-0 z-50 h-full w-72 shrink-0 border-l border-slate-200/90 bg-white shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:shadow-none ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            } lg:translate-x-0`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 lg:border-0 lg:py-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Tips & templates</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sticky top-0 space-y-5 p-4">
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Prompt templates</h3>
              <p className="mb-3 text-[12px] text-slate-500">Click to use as your optional note.</p>
              <div className="space-y-2" suppressHydrationWarning>
                {[
                  { label: "Furniture", note: "Category: Furniture. Focus on joinery, wood type, condition, and period." },
                  { label: "Ceramics", note: "Category: Ceramics. Note maker marks, glaze, chips, and age." },
                  { label: "Jewelry", note: "Category: Jewelry. Describe metals, stones, hallmarks, and wear." },
                  { label: "Art / Paintings", note: "Category: Art. Describe medium, signature, condition, and provenance if visible." },
                  { label: "General", note: "General antique or collectible. Full condition and value assessment." },
                ].map(({ label, note }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setText(note)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    suppressHydrationWarning
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tips</h3>
              <ul className="space-y-2 text-[12px] text-slate-600">
                <li>• Use a clear, well-lit photo of the item.</li>
                <li>• Include any labels, marks, or damage in frame.</li>
                <li>• Add a note for category or lot type for better results.</li>
                <li>• Response includes: name, condition, materials, dimensions, price.</li>
              </ul>
            </section>
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Credentials (Vercel)</h3>
              <p className="text-[12px] text-slate-600">
                For deploy: set <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono">GCP_SERVICE_ACCOUNT_KEY</code> to the <strong>full JSON</strong> of your service account file (copy the entire file contents). See <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono">VERCEL_DEPLOY.md</code>.
              </p>
            </section>
            </div>
          </aside>
        </>
      </div>

      {copyFeedback && (
        <div className="shrink-0 border-t border-slate-200/80 bg-emerald-50/90 px-4 py-2">
          <p className="text-center text-[13px] font-medium text-emerald-700">Copied to clipboard.</p>
        </div>
      )}
      {error && !copyFeedback && (
        <div className="shrink-0 border-t border-slate-200/80 bg-red-50/80 px-4 py-2">
          <p className="text-center text-[13px] text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200/90 bg-white px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" suppressHydrationWarning>
        <div className="mx-auto max-w-2xl">
          {preview && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <img src={preview} alt="" className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200" />
              <span className="text-[13px] text-slate-600 truncate flex-1">{file?.name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
              id="img"
            />
            <label
              htmlFor="img"
              className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
              Image
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message or add a note (image optional for chat)"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              suppressHydrationWarning
            />
            <button
              type="submit"
              disabled={loading || (!file && !text.trim())}
              className="h-11 shrink-0 rounded-xl bg-slate-800 px-5 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
