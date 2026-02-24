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
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Please select an image.");
      return;
    }
    const userText = text.trim();
    const imageDataUrl = await readFileAsDataUrl(file);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText || "Analyze this item.", imageUrl: imageDataUrl },
      { role: "assistant", text: null, loading: true },
    ]);
    setText("");
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("text", userText);
      const res = await fetch("/api/gemini-test", {
        method: "POST",
        body: formData,
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
    }
  }

  return (
    <main className="flex h-screen flex-col bg-slate-100">
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
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Vertex AI
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-5">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">Upload an image to analyze</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Add optional notes. You’ll receive product details, condition, and price estimate.
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

      {error && (
        <div className="shrink-0 border-t border-slate-200/80 bg-red-50/80 px-4 py-2">
          <p className="text-center text-[13px] text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200/90 bg-white px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
              placeholder="Optional note (e.g. category, lot type…)"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
            <button
              type="submit"
              disabled={loading || !file}
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
