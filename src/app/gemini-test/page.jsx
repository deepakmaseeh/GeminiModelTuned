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
    else if (label.includes("rarity")) out.rarity = content;
    else if (label.includes("material")) out.materials = content;
    else if (label.includes("dimension")) out.dimensions = content;
    else if (label.includes("age") || label.includes("period")) out.age = content;
    else if (label.includes("maker") || label.includes("origin")) out.maker = content;
    else if (label.includes("detail") || label.includes("description")) out.details = content;
    else if (label.includes("damage") || label.includes("flaw")) out.damage = content;
    else if (label.includes("market")) out.marketNotes = content;
    else if (label.includes("value") || label.includes("price") || label.includes("estimate")) out.price = content;
  }
  // Fallbacks for price when the model doesn't follow the bold label exactly.
  if (!out.price) {
    // Lines like: "Price: $10–$20" or "Estimated value - $50 to $80"
    const priceLineMatch = t.match(/^(?:\s*(?:price|value|estimate|valuation)[^:\n]*[:\-]\s*)(.+)$/gim);
    if (priceLineMatch && priceLineMatch.length > 0) {
      const firstLine = priceLineMatch[0].replace(/^(?:\s*(?:price|value|estimate|valuation)[^:\n]*[:\-]\s*)/i, "").trim();
      if (firstLine) out.price = firstLine;
    } else {
      // As a last resort, grab the first line that clearly looks like a money value.
      const priceLikeLine = t
        .split("\n")
        .map((line) => line.trim())
        .find((line) => /(\$|€|£|₹|rs\.?|inr|\d+\s*(usd|eur|gbp))/i.test(line));
      if (priceLikeLine) out.price = priceLikeLine;
    }
  }
  // Normalize empty/placeholder prices so we don't show the price block
  if (out.price && !/^[\s\-—]+$|^(n\/a|none|—|-|not (given|available|provided)|unknown)$/i.test(out.price.trim())) {
    out.price = out.price.trim();
  } else {
    out.price = null;
  }
  if (Object.keys(out).length > 0) return out;
  return { raw: t };
}

/** Split model response: first block = group summary (if multiple), rest = per-item. Trim "Per-item breakdown:" from any block. */
function splitMultiItemResponse(text) {
  if (!text || !text.trim()) return [text || ""];
  const delimiter = /---\s*Next item\s*---/i;
  let parts = text.trim().split(delimiter).map((s) => s.trim()).filter(Boolean);
  parts = parts.map((s) => s.replace(/^Per-item breakdown:\s*/i, "").trim()).filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

function DetailRow({ label, value }) {
  if (!value || value === "N/A") return null;
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 last:pb-0 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function ProductDetailsCard({ text }) {
  const parsed = parseProductDetails(text);
  if (!parsed) return <p className="text-slate-400 italic text-sm">No response.</p>;
  if (parsed.raw) {
    return (
      <div className="whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
        {parsed.raw}
      </div>
    );
  }
  const [expanded, setExpanded] = useState(false);
  const longText =
    (parsed.details && parsed.details.length > 220) ||
    (parsed.marketNotes && parsed.marketNotes.length > 220) ||
    (parsed.damage && parsed.damage.length > 220);
  const hasPrice = parsed.price && parsed.price.length > 0;
  const hasRarity = parsed.rarity && parsed.rarity !== "N/A";
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
      {parsed.itemName && (
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-800 dark:text-slate-100">{parsed.itemName}</h3>
            {hasRarity && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                {parsed.rarity}
              </span>
            )}
          </div>
        </div>
      )}
      <div className={`${expanded ? "max-h-none" : "max-h-72"} overflow-y-auto px-4 py-3`}>
        <DetailRow label="Condition" value={parsed.condition} />
        <DetailRow label="Materials" value={parsed.materials} />
        <DetailRow label="Dimensions" value={parsed.dimensions} />
        <DetailRow label="Age / Period" value={parsed.age} />
        <DetailRow label="Maker / Origin" value={parsed.maker} />
        <DetailRow label="Details" value={parsed.details} />
        <DetailRow label="Damage / Flaws" value={parsed.damage} />
        <DetailRow label="Market notes" value={parsed.marketNotes} />
      </div>
      {longText && (
        <div className="border-t border-slate-100 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
      {hasPrice && (
        <div className="border-t border-slate-200 bg-slate-800 px-4 py-3 dark:border-slate-700">
          <p className="text-lg font-semibold tracking-tight text-white">{parsed.price}</p>
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
  const [modelBadge, setModelBadge] = useState("Vertex AI");
  const [theme, setTheme] = useState("light");
  const [compact, setCompact] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastSentRef = useRef(null);
  const loadingStageTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(m.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "end" });
  }, [messages, loading, prefersReducedMotion]);

  useEffect(() => {
    try {
      const t = localStorage.getItem("auctionai.theme");
      const c = localStorage.getItem("auctionai.compact");
      if (t === "dark" || t === "light") setTheme(t);
      if (c === "1" || c === "0") setCompact(c === "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("auctionai.theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("auctionai.compact", compact ? "1" : "0");
    } catch {
      // ignore
    }
  }, [compact]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auctionai.sessions");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setSessions(parsed);
      const active = localStorage.getItem("auctionai.activeSessionId");
      if (active) setActiveSessionId(active);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) return;
    const id = (globalThis.crypto && globalThis.crypto.randomUUID && globalThis.crypto.randomUUID()) || String(Date.now());
    setActiveSessionId(id);
    try {
      localStorage.setItem("auctionai.activeSessionId", id);
    } catch {
      // ignore
    }
  }, [activeSessionId]);

  useEffect(() => {
    const ids = sessions.map((s) => s.id);
    if (!activeSessionId || ids.includes(activeSessionId)) return;
    if (sessions.length > 0) {
      const first = sessions[0];
      setActiveSessionId(first.id);
      setMessages(first.messages ?? []);
      try {
        localStorage.setItem("auctionai.activeSessionId", first.id);
      } catch {
        // ignore
      }
    } else {
      const newId = (globalThis.crypto && globalThis.crypto.randomUUID && globalThis.crypto.randomUUID()) || String(Date.now());
      setActiveSessionId(newId);
      setMessages([]);
      try {
        localStorage.setItem("auctionai.activeSessionId", newId);
      } catch {
        // ignore
      }
    }
  }, [sessions]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/gemini-config", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data && data.label) setModelBadge(data.label);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    try {
      const now = Date.now();
      const titleFromFirstUser = messages.find((m) => m.role === "user" && m.text)?.text?.slice(0, 48) || "New session";
      setSessions((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((s) => s.id === activeSessionId);
        const existing = idx >= 0 ? next[idx] : null;
        const keepTitle = existing?.title && existing.title !== "New session";
        const session = {
          id: activeSessionId,
          title: keepTitle ? existing.title : titleFromFirstUser,
          updatedAt: now,
          messages,
        };
        if (idx >= 0) next[idx] = { ...next[idx], ...session };
        else next.unshift(session);
        const trimmed = next.slice(0, 25);
        try {
          localStorage.setItem("auctionai.sessions", JSON.stringify(trimmed));
          localStorage.setItem("auctionai.activeSessionId", activeSessionId);
        } catch {
          // ignore
        }
        return trimmed;
      });
    } catch {
      // ignore
    }
  }, [messages, activeSessionId]);

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    if (!f) return;
    if (!f.type || !f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    const maxBytes = 3.5 * 1024 * 1024; // keep under Vercel's 4MB limit
    if (f.size > maxBytes) {
      setError("Image is too large for this demo (max ~3.5MB). Please choose a smaller file.");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function attachImageFile(f) {
    if (!f || !f.type || !f.type.startsWith("image/")) {
      setError("Please paste or drop an image file.");
      return;
    }
    const maxBytes = 3.5 * 1024 * 1024;
    if (f.size > maxBytes) {
      setError("Image is too large for this demo (max ~3.5MB). Please choose a smaller file.");
      return;
    }
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function newSession() {
    const id = (globalThis.crypto && globalThis.crypto.randomUUID && globalThis.crypto.randomUUID()) || String(Date.now());
    setActiveSessionId(id);
    setMessages([]);
    setError(null);
    setEditingSessionId(null);
    try {
      localStorage.setItem("auctionai.activeSessionId", id);
    } catch {
      // ignore
    }
  }

  function renameSession(sessionId, newTitle) {
    const t = String(newTitle || "").trim() || "Session";
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === sessionId ? { ...s, title: t, updatedAt: Date.now() } : s));
      try {
        localStorage.setItem("auctionai.sessions", JSON.stringify(next.slice(0, 25)));
      } catch {
        // ignore
      }
      return next;
    });
    setEditingSessionId(null);
    setEditingTitle("");
  }

  function deleteSession(sessionId) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem("auctionai.sessions", JSON.stringify(next.slice(0, 25)));
      } catch {
        // ignore
      }
      return next;
    });
    setEditingSessionId(null);
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  function handleClearChat() {
    newSession();
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

  function exportConversation(format) {
    const lines = [];
    if (format === "md") {
      lines.push("# Auction AI chat export", "");
      for (const m of messages) {
        const who = m.role === "user" ? "User" : "Assistant";
        lines.push(`## ${who}`, "");
        if (m.role === "user" && m.imageUrl) lines.push("_[image attached]_", "");
        lines.push(String(m.text || "").trim() || "_(empty)_", "");
      }
    } else {
      lines.push("Auction AI chat export", "");
      for (const m of messages) {
        const who = m.role === "user" ? "User" : "Assistant";
        lines.push(`${who}:`);
        if (m.role === "user" && m.imageUrl) lines.push("[image attached]");
        lines.push(String(m.text || "").trim() || "(empty)");
        lines.push("");
      }
    }
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auction-ai-chat.${format === "md" ? "md" : "txt"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function handleRetry() {
    const last = lastSentRef.current;
    if (!last || loading) return;
    setError(null);
    setMessages((prev) => prev.slice(0, -1));
    setMessages((prev) => [...prev, { role: "assistant", text: null, loading: true, type: last.type || "analysis", stage: "analyzing" }]);
    setLoading(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    try {
      const formData = new FormData();
      if (last.file) formData.append("image", last.file);
      formData.append("text", last.text);
      const res = await fetch("/api/gemini-test", { method: "POST", body: formData, signal });
      let data;
      let rawText = "";
      try {
        data = await res.json();
      } catch {
        try {
          rawText = await res.text();
        } catch {
          rawText = "";
        }
      }
      if (!res.ok) {
        const msgText = data && data.error
          ? data.error
          : (rawText && rawText.startsWith("Request Entity Too Large"))
            ? "Image is too large for the server. Please try a smaller file."
            : rawText || `Error ${res.status}`;
        setError(msgText);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text: "Error: " + msgText, loading: false };
          return next;
        });
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", text: data.text ?? "", loading: false };
        return next;
      });
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text: "Stopped.", loading: false };
          return next;
        });
        return;
      }
      const offline = typeof navigator !== "undefined" && navigator && navigator.onLine === false;
      setError(offline ? "You appear to be offline. Check your connection and try again." : (err.message ?? "Request failed"));
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", text: "Error: " + (err.message || "Request failed"), loading: false };
        return next;
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
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
    const type = file ? "analysis" : "chat";
    lastSentRef.current = { text: userText, file: file || null, type };
    setMessages((prev) => [
      ...prev,
      { role: "user", text: displayText, imageUrl: imageDataUrl || undefined },
      { role: "assistant", text: null, loading: true, type, stage: "sending" },
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
      if (loadingStageTimerRef.current) clearTimeout(loadingStageTimerRef.current);
      loadingStageTimerRef.current = setTimeout(() => {
        setMessages((prev) => {
          const next = [...prev];
          const lastMsg = next[next.length - 1];
          if (lastMsg?.role === "assistant" && lastMsg?.loading) {
            next[next.length - 1] = { ...lastMsg, stage: "analyzing" };
          }
          return next;
        });
      }, 350);
      const formData = new FormData();
      if (file) formData.append("image", file);
      formData.append("text", userText);
      const res = await fetch("/api/gemini-test", {
        method: "POST",
        body: formData,
        signal,
      });
      let data;
      let rawText = "";
      try {
        data = await res.json();
      } catch {
        try {
          rawText = await res.text();
        } catch {
          rawText = "";
        }
      }
      if (!res.ok) {
        const msgText = data && data.error
          ? data.error
          : (rawText && rawText.startsWith("Request Entity Too Large"))
            ? "Image is too large for the server. Please try a smaller file."
            : rawText || `Error ${res.status}`;
        setError(msgText);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last?.loading) {
            next[next.length - 1] = { role: "assistant", text: "Error: " + msgText, loading: false };
          }
          return next;
        });
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last?.loading) {
          next[next.length - 1] = { ...last, role: "assistant", text: data.text ?? "", loading: false };
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
      const offline = typeof navigator !== "undefined" && navigator && navigator.onLine === false;
      const msg =
        offline
          ? "You appear to be offline. Check your connection and try again."
          : (String(err.message || "").includes("Failed to fetch") ? "Network error. Please try again." : (err.message ?? "Request failed"));
      setError(msg);
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
      if (loadingStageTimerRef.current) clearTimeout(loadingStageTimerRef.current);
      loadingStageTimerRef.current = null;
      setTimeout(() => textAreaRef.current?.focus(), 0);
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]" suppressHydrationWarning>
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 py-2 shadow-sm dark:border-slate-800/80 dark:bg-slate-950 sm:px-5 sm:py-3" aria-label="App header">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-slate-100 sm:h-8 sm:w-8"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-[17px]">Auction AI</h1>
            <p className="hidden truncate text-[11px] text-slate-500 dark:text-slate-400 sm:block">Product analysis · Condition & price</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {messages.length > 0 && !loading && (
            <>
              <button
                type="button"
                onClick={() => exportConversation("md")}
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
                title="Export chat (.md)"
                aria-label="Export chat as Markdown"
              >
                Export MD
              </button>
              <button
                type="button"
                onClick={() => exportConversation("txt")}
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
                title="Export chat (.txt)"
                aria-label="Export chat as text"
              >
                Export TXT
              </button>
              <button
                type="button"
                onClick={handleRetry}
                disabled={!lastSentRef.current}
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
                title="Regenerate last reply"
                aria-label="Regenerate last reply"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 9A8 8 0 006.28 6.28L4 10m0 5a8 8 0 0013.72 2.72L20 14" />
                </svg>
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleCopyLastResponse}
                disabled={!getLastAssistantText()}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
                title="Copy last response"
                aria-label="Copy last response"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
                title="Clear chat"
                aria-label="Clear chat"
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
              className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
              aria-label="Stop generating"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={() => setCompact((v) => !v)}
            className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
            title={compact ? "Comfortable view" : "Compact view"}
            aria-label={compact ? "Switch to comfortable view" : "Switch to compact view"}
          >
            {compact ? "Comfort" : "Compact"}
          </button>
          <button
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m0-11.314L7.05 7.05m9.9 9.9l1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900/50 dark:hover:text-slate-100 motion-reduce:transition-none"
            aria-label={sidebarOpen ? "Close tips and templates" : "Open tips and templates"}
            aria-expanded={sidebarOpen}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
            {modelBadge}
          </span>
        </div>
      </header>

      <div className="relative z-0 min-h-0 flex-1 flex overflow-hidden">
        {/* Main chat area */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const f = e.dataTransfer?.files?.[0];
            if (f) attachImageFile(f);
          }}
        >
          <div className={`mx-auto w-full max-w-2xl px-3 pt-4 sm:max-w-3xl sm:px-4 lg:px-6 ${compact ? "pb-3" : "pb-5"}`}>
            {messages.length === 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-950 sm:p-8">
              <header className="mb-4">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <svg className="h-6 w-6 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Auction AI</h2>
                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                  Upload an image or type a message to get product details and price estimates.
                </p>
              </header>
              <section className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Try asking</p>
                <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                  {[
                    "What is this item and what’s a fair price range?",
                    "Describe condition and any damage you see.",
                    "What auction category should I list this under?",
                  ].map((p) => (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => {
                          setText(p);
                          textAreaRef.current?.focus();
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-[12px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700 sm:max-w-[280px] sm:py-2"
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          <div className={`${compact ? "space-y-2" : "space-y-4"}`}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[95%] rounded-2xl px-4 py-3 sm:max-w-[88%] sm:px-5 sm:py-4 ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white shadow-md dark:bg-slate-900"
                      : "border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950"
                  }`}
                >
                  {msg.role === "user" && (
                    <>
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt=""
                          className="mb-3 max-h-36 cursor-zoom-in rounded-lg object-contain ring-1 ring-white/10"
                          onClick={() => setImageModalUrl(msg.imageUrl)}
                        />
                      )}
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100">
                        {msg.text}
                      </p>
                    </>
                  )}
                  {msg.role === "assistant" &&
                    (msg.loading ? (
                      <div className="flex items-center gap-2 py-1 text-slate-500" aria-live="polite" aria-busy="true">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none [animation-delay:300ms]" />
                        <span className="ml-2 text-[15px]">{msg.stage === "sending" ? "Sending…" : "Analyzing…"}</span>
                      </div>
                    ) : (
                      (msg.type || "analysis") === "analysis" ? (
                        (() => {
                          const blocks = splitMultiItemResponse(msg.text || "");
                          const isGroupFirst = blocks.length > 1;
                          return (
                            <div className="space-y-4">
                              {blocks.map((block, idx) => (
                                <div key={idx} className={blocks.length > 1 ? "space-y-1" : ""}>
                                  {blocks.length > 1 && (
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                      {isGroupFirst && idx === 0 ? "Group overview" : `Card ${idx} of ${blocks.length - 1}`}
                                    </p>
                                  )}
                                  <ProductDetailsCard text={block} />
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                          {msg.text || ""}
                        </div>
                      )
                    ))}
                </div>
              </div>
            ))}
          </div>
            <div ref={chatEndRef} />
          </div>
        </div>

        {dragActive && (
          <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-black/20">
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              Drop an image to attach
            </div>
          </div>
        )}

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
            className={`fixed top-0 right-0 z-50 h-full w-72 shrink-0 border-l border-slate-200/90 bg-white shadow-xl transition-transform duration-200 motion-reduce:transition-none lg:static lg:z-auto lg:shadow-none dark:border-slate-800/80 dark:bg-slate-950 ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            } lg:translate-x-0`}
            aria-label="Tips and prompt templates"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 lg:border-0 lg:py-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Tips & templates</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900/50"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sticky top-0 space-y-5 p-4">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sessions</h3>
                  <button
                    type="button"
                    onClick={newSession}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/50"
                  >
                    New
                  </button>
                </div>
                <div className="space-y-1">
                  {sessions.slice(0, 8).map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 transition ${
                        s.id === activeSessionId
                          ? "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                      }`}
                    >
                      {editingSessionId === s.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameSession(s.id, editingTitle);
                            if (e.key === "Escape") {
                              setEditingSessionId(null);
                              setEditingTitle("");
                            }
                          }}
                          onBlur={() => renameSession(s.id, editingTitle)}
                          className="min-w-0 flex-1 rounded border-0 bg-transparent px-2 py-1 text-[12px] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:text-slate-100 dark:focus:ring-slate-500"
                          autoFocus
                          aria-label="Rename session"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setMessages(Array.isArray(s.messages) ? s.messages : []);
                            setError(null);
                            try { localStorage.setItem("auctionai.activeSessionId", s.id); } catch { /* ignore */ }
                          }}
                          className="min-w-0 flex-1 truncate py-1 text-left text-[12px] font-medium text-slate-700 dark:text-slate-200"
                        >
                          {s.title || "Session"}
                        </button>
                      )}
                      {editingSessionId !== s.id && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(s.id);
                              setEditingTitle(s.title || "Session");
                            }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label="Rename session"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof window !== "undefined" && window.confirm("Delete this session?")) deleteSession(s.id);
                            }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            aria-label="Delete session"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Prompt templates</h3>
                <p className="mb-3 text-[12px] text-slate-500 dark:text-slate-400">Click to use as your optional note.</p>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/70"
                      suppressHydrationWarning
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tips</h3>
                <ul className="space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
                  <li>• Use a clear, well-lit photo of the item.</li>
                  <li>• Include any labels, marks, or damage in frame.</li>
                  <li>• Add a note for category or lot type for better results.</li>
                  <li>• Response includes: name, condition, materials, dimensions, price.</li>
                </ul>
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
        <div className="shrink-0 border-t border-slate-200/80 bg-red-50/80 px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
          <p className="text-[13px] text-red-600">{error}</p>
          {lastSentRef.current && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={loading}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[12px] font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/80 sm:px-4 sm:py-4" suppressHydrationWarning>
        <div className="mx-auto w-full max-w-3xl">
          {preview && (
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:mb-3 sm:px-4 sm:py-2.5">
              <img src={preview} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-600 sm:h-12 sm:w-12" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-slate-600 dark:text-slate-300">{file?.name}</span>
              <button
                type="button"
                onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null); }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Remove image"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <div className="flex min-h-[52px] items-end gap-2 rounded-xl border border-slate-200 bg-white transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-slate-700 dark:bg-slate-900/50 dark:focus-within:border-slate-600 dark:focus-within:ring-slate-700 sm:min-h-[56px] sm:gap-3">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" id="img" />
            <label
              htmlFor="img"
              className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 sm:min-h-[48px] sm:min-w-[48px]"
              aria-label="Attach image"
              title="Attach image"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </label>
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!loading) handleSubmit(e); }
              }}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                  if (item.type && item.type.startsWith("image/")) {
                    const f = item.getAsFile();
                    if (f) attachImageFile(f);
                    e.preventDefault();
                    break;
                  }
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="min-h-[44px] max-h-36 min-w-0 flex-1 resize-none border-0 bg-transparent py-3 text-[15px] leading-relaxed text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder-slate-500 sm:min-h-[48px] sm:py-3.5 sm:text-base"
              suppressHydrationWarning
            />
            <button
              type="submit"
              disabled={loading || (!file && !text.trim())}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg bg-slate-700 text-white transition hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none dark:bg-slate-300 dark:text-slate-900 dark:hover:bg-slate-200 sm:min-h-[48px] sm:min-w-[48px]"
              aria-label="Send message"
              title="Send (Enter)"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 sm:mt-2">
            {file ? "Image attached" : "Enter to send · Shift+Enter for new line"}
          </p>
        </div>
      </form>

      {imageModalUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setImageModalUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90vh] w-full max-w-3xl">
            <button
              type="button"
              onClick={() => setImageModalUrl(null)}
              className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg hover:bg-slate-50"
              aria-label="Close image"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={imageModalUrl} alt="" className="max-h-[90vh] w-full rounded-xl bg-black object-contain" />
          </div>
        </div>
      )}
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
