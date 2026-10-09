"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useEffect, useRef, useState } from "react";
import { Link2, Play, Trash2 } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSavedTiktoks } from "@/features/create/hooks/useSavedTiktoks";
import { downloadTiktokVideo } from "@/features/create/utils/tiktokDownload";
import {
  getSavedTiktokFile,
  saveTiktok,
  type SavedTiktok,
} from "@/features/create/utils/tiktokLibrary";
import {
  extractTiktokUrl,
  formatDuration,
  formatSavedOn,
  sameTiktokUrl,
} from "@/features/create/utils/tiktokImport";
import { OrDivider } from "./OrDivider";

const LINK_ERROR =
  "That doesn't look like a TikTok link. In TikTok tap Share, then Copy link.";
const DOWNLOAD_ERROR =
  "Couldn't download that video. Check the link and try again.";
const GONE_ERROR =
  "That saved video is no longer on this device. Paste its link again.";

type Status =
  | { kind: "idle" }
  | { kind: "downloading"; progress: number | null }
  | { kind: "opening"; key: string | null };

/**
 * TikTok import surface: paste a link to download a video (through
 * /api/tiktok-save, the same endpoint as /tiktok-downloader), or reuse one
 * already downloaded on this device - no link, no second download.
 *
 * `onSelect` receives the video as a File, ready for the normal upload flow
 * (which handles processing in the background). Errors are the caller's to report.
 */
export function TikTokLibrary({
  onSelect,
}: {
  onSelect: (file: File) => void | Promise<void>;
}) {
  const { user } = useAuthSession();
  const userId = user?.id ?? null;
  const { videos, loading, refresh, remove } = useSavedTiktoks(userId);

  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      // Closing the sheet mid-download abandons it rather than starting a post later.
      abortRef.current?.abort();
    };
  }, []);

  const busy = status.kind !== "idle";

  async function handOff(file: File, key: string | null) {
    setStatus({ kind: "opening", key });
    try {
      await onSelect(file);
    } catch {
      // The caller reports its own failures; just release the UI.
    }
  }

  async function selectSaved(video: SavedTiktok) {
    if (busyRef.current) return;
    busyRef.current = true;
    setLinkError(null);
    setStatus({ kind: "opening", key: video.key });
    try {
      const file = await getSavedTiktokFile(video);
      if (!file) {
        void remove(video.key);
        setLinkError(GONE_ERROR);
        return;
      }
      await handOff(file, video.key);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setStatus({ kind: "idle" });
    }
  }

  async function submitLink(raw: string) {
    if (busyRef.current) return;
    const url = extractTiktokUrl(raw);
    if (!url) {
      setLinkError(LINK_ERROR);
      return;
    }
    setLinkError(null);

    // Already downloaded on this device: skip the network entirely.
    const existing = videos.find((video) =>
      sameTiktokUrl(video.originalUrl, url),
    );
    if (existing) {
      setLink("");
      await selectSaved(existing);
      return;
    }

    busyRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "downloading", progress: null });
    try {
      const { blob, meta } = await downloadTiktokVideo(url, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (aliveRef.current) setStatus({ kind: "downloading", progress });
        },
      });
      if (!aliveRef.current) return;

      const file = new File([blob], `shopi-tiktok-${meta.id ?? Date.now()}.mp4`, {
        type: "video/mp4",
      });
      // Remember it for next time, independent of what the caller does with it.
      if (userId) {
        void saveTiktok({ userId, originalUrl: url, meta, blob }).then(() => {
          if (aliveRef.current) void refresh();
        });
      }
      setLink("");
      await handOff(file, null);
    } catch {
      if (!controller.signal.aborted && aliveRef.current) {
        setLinkError(DOWNLOAD_ERROR);
      }
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      if (aliveRef.current) setStatus({ kind: "idle" });
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setLinkError("Your clipboard is empty. Copy a TikTok link first.");
        inputRef.current?.focus();
        return;
      }
      setLink(text.trim());
      await submitLink(text);
    } catch {
      // Clipboard access denied or unavailable - fall back to manual paste.
      inputRef.current?.focus();
    }
  }

  const hasLink = link.trim().length > 0;
  const downloading = status.kind === "downloading" ? status : null;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitLink(link);
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated p-1.5 transition-colors focus-within:border-primary">
          <Link2 size={18} className="ml-2 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              if (linkError) setLinkError(null);
            }}
            disabled={busy}
            placeholder="Paste a TikTok link"
            aria-label="TikTok link"
            className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-base text-foreground outline-none placeholder:text-muted disabled:opacity-60"
          />
          <button
            type={hasLink ? "submit" : "button"}
            onClick={hasLink ? undefined : () => void handlePaste()}
            disabled={busy}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {hasLink ? "Get video" : "Paste"}
          </button>
        </div>
        {linkError ? (
          <p role="alert" className="px-1 text-sm font-medium text-error">
            {linkError}
          </p>
        ) : null}
      </form>

      {downloading || (status.kind === "opening" && status.key === null) ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <InterlockingBalls size={18} className="shrink-0" />
            <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
              {downloading ? "Downloading from TikTok..." : "Adding to your post..."}
            </p>
            {downloading ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="shrink-0 text-xs font-semibold text-muted underline underline-offset-2 hover:text-foreground"
              >
                Cancel
              </button>
            ) : null}
          </div>
          {downloading ? (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-label="Download progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                downloading.progress == null
                  ? undefined
                  : Math.round(downloading.progress * 100)
              }
            >
              <div
                className={`h-full rounded-full bg-primary transition-[width] duration-200 ${
                  downloading.progress == null ? "w-1/3 animate-pulse" : ""
                }`}
                style={
                  downloading.progress == null
                    ? undefined
                    : { width: `${Math.round(downloading.progress * 100)}%` }
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex animate-pulse items-center gap-3 rounded-xl px-2 py-2"
            >
              <span className="h-16 w-12 rounded-lg bg-surface" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="h-3 w-3/4 rounded bg-surface" />
                <span className="h-3 w-1/2 rounded bg-surface" />
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {videos.length > 0 ? (
        <section
          aria-label="Saved TikTok videos"
          className="flex flex-col gap-2"
        >
          <OrDivider label="or reuse a saved video" />
          <ul className="flex flex-col">
            {videos.map((video) => {
              const meta = [
                video.authorUsername ? `@${video.authorUsername}` : null,
                formatSavedOn(video.savedAt),
              ]
                .filter(Boolean)
                .join(" · ");
              const isOpening =
                status.kind === "opening" && status.key === video.key;
              return (
                <li key={video.key} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void selectSaved(video)}
                    disabled={busy}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface active:bg-surface disabled:opacity-60"
                  >
                    <Thumb video={video} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {video.title || "TikTok video"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {meta}
                      </span>
                    </span>
                    {isOpening ? (
                      <InterlockingBalls size={18} className="shrink-0" />
                    ) : (
                      <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-strong dark:text-primary">
                        Use
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(video.key)}
                    disabled={busy}
                    aria-label="Remove saved video"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="px-1 text-xs leading-5 text-muted">
        Only use videos you created or have permission to reuse. Downloaded
        videos are kept on this device so you can reuse them.
      </p>
    </div>
  );
}

function Thumb({ video }: { video: SavedTiktok }) {
  const duration = formatDuration(video.duration);
  return (
    <span className="relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-muted">
      {video.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumb}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <Play size={16} />
      )}
      {duration ? (
        <span className="absolute right-0.5 bottom-0.5 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
          {duration}
        </span>
      ) : null}
    </span>
  );
}
