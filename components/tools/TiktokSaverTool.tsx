"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import { Download, Link2 } from "lucide-react";
import type { Dictionary } from "@/i18n/getDictionary";

type VideoInfo = {
  id: string | null;
  title: string | null;
  author: string | null;
  authorUsername: string | null;
  cover: string | null;
  duration: number | null;
};

/**
 * TikTok saver: paste a TikTok link, preview it, then save the clean
 * (no-watermark) MP4 to the device via /api/tiktok-save. Rendered on
 * /[lang]/tiktok-downloader; strings come from the dictionary so the tool is
 * localised even where the surrounding page copy is not.
 */
export function TiktokSaverTool({ t }: { t: Dictionary["tiktokSaver"] }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || state === "loading") return;

    setState("loading");
    setInfo(null);
    try {
      const res = await fetch(
        `/api/tiktok-save?url=${encodeURIComponent(trimmed)}`,
      );
      if (!res.ok) throw new Error("fetch_failed");
      setInfo((await res.json()) as VideoInfo);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  function reset() {
    setState("idle");
    setInfo(null);
    setUrl("");
    setSaving(false);
    setSaveFailed(false);
  }

  /** Fetch the file ourselves so we know when the download actually succeeded —
   *  only then clear the tool. A plain <a download> gives no completion signal. */
  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      const res = await fetch(
        `/api/tiktok-save?url=${encodeURIComponent(url.trim())}&download=1`,
      );
      if (!res.ok) throw new Error("download_failed");
      const blob = await res.blob();

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `shopi-tiktok-${info?.id ?? "video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      reset();
    } catch {
      setSaving(false);
      setSaveFailed(true);
    }
  }

  return (
    <div className="rounded-[1.1rem] border border-border bg-surface p-3 sm:p-4">
      {state !== "ready" ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 rounded-[1.5rem] border border-border bg-elevated p-2 sm:flex-row sm:items-center sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-4">
            <Link2 size={16} className="hidden shrink-0 text-muted sm:block" />
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base text-default outline-none placeholder:text-placeholder sm:px-0 sm:py-0"
            />
            <button
              type="submit"
              disabled={state === "loading" || !url.trim()}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white disabled:cursor-default disabled:opacity-50 sm:w-auto sm:shrink-0"
            >
              {state === "loading" ? (
                <>
                  <InterlockingBalls size={15} />
                  {t.fetching}
                </>
              ) : (
                t.button
              )}
            </button>
          </div>
          {state === "error" && (
            <p role="alert" className="px-2 text-sm font-medium text-error">
              {t.error}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-elevated p-3 sm:flex-row sm:items-center">
            {info?.cover ? (
              // Plain <img>: TikTok CDN covers aren't in the next/image
              // remote-pattern allowlist, and this is a transient preview.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={info.cover}
                alt=""
                className="h-16 w-12 shrink-0 rounded-lg object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-default">
                {info?.title || "TikTok video"}
              </p>
              {info?.authorUsername || info?.author ? (
                <p className="truncate text-xs text-muted">
                  {info.authorUsername
                    ? `@${info.authorUsername}`
                    : info.author}
                </p>
              ) : null}
              <button
                onClick={reset}
                className="mt-1 cursor-pointer text-xs font-medium text-muted underline underline-offset-2 hover:text-default"
              >
                {t.tryAnother}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white disabled:cursor-default disabled:opacity-70 sm:w-auto sm:shrink-0"
            >
              {saving ? (
                <InterlockingBalls size={15} />
              ) : (
                <Download size={15} />
              )}
              {saving ? t.fetching : t.save}
            </button>
          </div>
          {saveFailed && (
            <p role="alert" className="px-2 text-sm font-medium text-error">
              {t.error}
            </p>
          )}
        </div>
      )}
      <p className="mt-3 px-2 text-xs text-muted">{t.disclaimer}</p>
    </div>
  );
}
