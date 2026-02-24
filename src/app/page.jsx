import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md text-center">
        <div className="mb-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          Vertex AI
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          Gemini Tuned Model
        </h1>
        <p className="mb-8 text-slate-600">
          Test your Vertex AI Gemini model with an image and auction lot info.
        </p>
        <Link
          href="/gemini-test"
          className="btn-primary inline-flex items-center gap-2"
        >
          Open Gemini test
          <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  );
}
