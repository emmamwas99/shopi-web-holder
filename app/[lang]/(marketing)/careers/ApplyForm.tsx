"use client";

import { useRef, useState } from "react";
import { Send, Paperclip, CheckCircle2, X, Loader2 } from "lucide-react";

const ROLE = "Customer Service Representative";
const CAREERS_EMAIL = "tech.team@shopi.co.ke";
const MAX_CV_BYTES = 5 * 1024 * 1024;

const ACCEPTED_CV =
  ".pdf,.doc,.docx,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ApplyForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_CV_BYTES) {
      setError("Your CV is larger than 5 MB. Please upload a smaller file.");
      e.target.value = "";
      setCv(null);
      return;
    }
    setError(null);
    setCv(file);
  }

  function clearFile() {
    setCv(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    if (!cv) {
      setError("Attach your CV as a PDF or Word document.");
      return;
    }

    const form = new FormData(e.currentTarget);
    form.set("role", ROLE);
    form.set("cv", cv);

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/careers/apply`,
        { method: "POST", body: form },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        setError(
          data?.error ??
            "We could not send your application. Please try again shortly.",
        );
        setStatus("idle");
        return;
      }

      setStatus("sent");
    } catch {
      setError(
        "We could not reach the server. Check your connection and try again.",
      );
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-6">
        <CheckCircle2 className="mt-[0.1rem] size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="mb-1 text-[0.875rem] font-semibold text-foreground">
            Application received
          </p>
          <p className="text-[0.8rem] leading-[1.7] text-muted">
            Thank you. Our team has your CV and details, and will be in touch if
            your profile matches what we&apos;re looking for.
          </p>
        </div>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            required
            name="name"
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label="Email address">
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Phone number" optional>
        <input type="tel" name="phone" autoComplete="tel" className={inputClass} />
      </Field>

      <Field label="Why are you a good fit? (2–3 sentences)">
        <textarea
          required
          name="message"
          rows={4}
          className={`${inputClass} resize-y`}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.75rem] font-semibold tracking-[0.03em] text-foreground">
          CV / Resume
        </span>
        <input
          ref={fileInputRef}
          type="file"
          name="cv"
          accept={ACCEPTED_CV}
          onChange={handleFileChange}
          className="sr-only"
          id="careers-cv"
        />
        {cv ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-elevated px-3.5 py-2.5">
            <Paperclip className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[0.8rem] text-foreground">
              {cv.name}
            </span>
            <span className="shrink-0 text-[0.75rem] text-muted">
              {formatBytes(cv.size)}
            </span>
            <button
              type="button"
              onClick={clearFile}
              aria-label="Remove attached CV"
              className="shrink-0 text-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <label
            htmlFor="careers-cv"
            className="flex cursor-pointer items-center gap-2.5 rounded-md border border-dashed border-border bg-elevated px-3.5 py-3 text-[0.8rem] text-muted hover:border-primary"
          >
            <Paperclip className="size-4 shrink-0" aria-hidden />
            Attach your CV — PDF or Word, up to 5 MB
          </label>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-border bg-surface px-4 py-3 text-[0.8rem] leading-[1.6] text-foreground"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-[0.875rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          {sending ? "Sending…" : "Submit application"}
        </button>
        <p className="text-[0.75rem] leading-[1.6] text-muted">
          Goes straight to {CAREERS_EMAIL}.
        </p>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-elevated px-3.5 py-2.5 text-[0.875rem] text-foreground outline-none focus:border-primary";

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.75rem] font-semibold tracking-[0.03em] text-foreground">
        {label}
        {optional && (
          <span className="ml-1.5 font-normal text-muted">(optional)</span>
        )}
      </span>
      {children}
    </label>
  );
}
