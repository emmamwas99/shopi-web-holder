"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ClipboardPaste,
  Download,
  Images,
  Link2,
  Music2,
  Video,
} from "lucide-react";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import type { Dictionary } from "@/i18n/getDictionary";
import { trackTiktokSaver } from "@/lib/analytics";
import {
  extractTiktokUrl,
  formatBytes,
  formatDuration,
  tiktokFileName,
  type TiktokAsset,
  type TiktokPostInfo,
  type TiktokSaverError,
  type TiktokSaverMode,
} from "@/lib/tiktokSaver";
import { fetchWithFallback, saveBlob, zipFiles } from "./saverDownloads";

type Strings = Dictionary["tiktokSaver"];
type Status = "idle" | "loading" | "ready" | "error";
type Group = "video" | "audio" | "photo";

const GROUP_ORDER: Record<TiktokSaverMode, Group[]> = {
  video: ["video", "photo", "audio"],
  audio: ["audio", "video", "photo"],
  photo: ["photo", "video", "audio"],
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * TikTok saver: paste a TikTok link, preview the post, then save the video
 * (H.264 MP4, or HEVC HD when TikTok has it), its sound as MP3, or a photo
 * post's images, one by one or as a ZIP. Rendered on the three TikTok tool
 * pages; `mode` is the page's job and decides which download leads.
 *
 * Strings come from the dictionary so the tool is localised even where the
 * surrounding page copy is not.
 */
export function TiktokSaverTool({
  t,
  mode = "video",
}: {
  t: Strings;
  mode?: TiktokSaverMode;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<TiktokSaverError | null>(null);
  const [info, setInfo] = useState<TiktokPostInfo | null>(null);
  // The link `info` was looked up for; fallback downloads re-resolve it.
  const [postUrl, setPostUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitLabel =
    mode === "audio" ? t.buttonAudio : mode === "photo" ? t.buttonPhoto : t.button;

  const errorText: Record<TiktokSaverError, string> = {
    invalid_url: t.errorInvalid,
    unavailable: t.errorUnavailable,
    fetch_failed: t.errorBusy,
    photo_post: t.photoInVideoMode,
  };

  async function lookup(raw: string) {
    const link = extractTiktokUrl(raw);
    if (!link) {
      setStatus("error");
      setError("invalid_url");
      trackTiktokSaver("tiktok_saver_lookup", {
        mode,
        outcome: "error",
        error: "invalid_url",
      });
      return;
    }

    setUrl(link);
    setStatus("loading");
    setError(null);
    setInfo(null);
    setNotice(null);

    const endpoint = `/api/tiktok-save?url=${encodeURIComponent(link)}`;
    try {
      let res = await fetch(endpoint);
      // The lookup service allows about one request a second; one quick
      // retry covers a double tap or a busy moment.
      if (res.status === 502) {
        await wait(1_500);
        res = await fetch(endpoint);
      }
      if (!res.ok) {
        throw res.status === 400
          ? "invalid_url"
          : res.status === 404
            ? "unavailable"
            : "fetch_failed";
      }
      const data = (await res.json()) as TiktokPostInfo;
      setInfo(data);
      setPostUrl(link);
      setStatus("ready");
      trackTiktokSaver("tiktok_saver_lookup", {
        mode,
        kind: data.kind,
        outcome: "success",
      });
    } catch (caught) {
      const kind: TiktokSaverError =
        typeof caught === "string" ? (caught as TiktokSaverError) : "fetch_failed";
      setStatus("error");
      setError(kind);
      trackTiktokSaver("tiktok_saver_lookup", { mode, outcome: "error", error: kind });
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const link = extractTiktokUrl(event.clipboardData.getData("text"));
    if (!link) return; // let an ordinary paste through
    event.preventDefault();
    setUrl(link);
    if (status !== "loading") void lookup(link);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const link = extractTiktokUrl(text);
      if (link) {
        setUrl(link);
        void lookup(link);
        return;
      }
      if (text.trim()) setUrl(text.trim());
    } catch {
      // Clipboard access refused or unsupported: the keyboard still works.
    }
    inputRef.current?.focus();
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setInfo(null);
    setPostUrl("");
    setUrl("");
    setBusy(null);
    setProgress(null);
    setNotice(null);
    inputRef.current?.focus();
  }

  const fallbackUrl = (asset: TiktokAsset, index?: number) =>
    `/api/tiktok-save?url=${encodeURIComponent(postUrl)}&download=${asset}${
      asset === "image" ? `&i=${index ?? 0}` : ""
    }`;

  async function download(asset: TiktokAsset, directUrl: string, index?: number) {
    if (!info || busy) return;
    setBusy(asset === "image" ? `image-${index}` : asset);
    setProgress(null);
    setNotice(null);
    try {
      const blob = await fetchWithFallback(directUrl, fallbackUrl(asset, index), setProgress);
      saveBlob(blob, tiktokFileName(info.id, asset, index, blob.type));
      setNotice({ text: t.saved, ok: true });
      trackTiktokSaver("tiktok_saver_download", {
        mode,
        kind: info.kind,
        asset,
        outcome: "success",
      });
    } catch {
      setNotice({ text: t.errorSave, ok: false });
      trackTiktokSaver("tiktok_saver_download", {
        mode,
        kind: info.kind,
        asset,
        outcome: "error",
      });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function downloadAllPhotos() {
    if (!info || busy || info.images.length === 0) return;
    setBusy("zip");
    setProgress(0);
    setNotice(null);
    try {
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < info.images.length; i++) {
        const blob = await fetchWithFallback(info.images[i], fallbackUrl("image", i));
        files.push({ name: tiktokFileName(info.id, "image", i, blob.type), blob });
        setProgress((i + 1) / info.images.length);
      }
      saveBlob(await zipFiles(files), `shopi-tiktok-${info.id ?? "post"}-photos.zip`);
      setNotice({ text: t.saved, ok: true });
      trackTiktokSaver("tiktok_saver_download", {
        mode,
        kind: info.kind,
        asset: "zip",
        outcome: "success",
      });
    } catch {
      setNotice({ text: t.errorSave, ok: false });
      trackTiktokSaver("tiktok_saver_download", {
        mode,
        kind: info.kind,
        asset: "zip",
        outcome: "error",
      });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  function renderGroup(group: Group, primary: boolean): ReactNode {
    if (!info) return null;

    if (group === "video" && info.video) {
      const video = info.video;
      const hd = info.videoHd;
      return (
        <div key="video" className="flex flex-col gap-2">
          <ActionButton
            primary={primary}
            icon={<Video size={16} aria-hidden />}
            label={t.saveVideo}
            meta={formatBytes(video.size)}
            busy={busy === "video"}
            progress={progress}
            savingLabel={t.saving}
            disabled={busy !== null}
            onClick={() => void download("video", video.url)}
          />
          {hd ? (
            <>
              <ActionButton
                icon={<Download size={16} aria-hidden />}
                label={t.saveHd}
                meta={formatBytes(hd.size)}
                busy={busy === "hd"}
                progress={progress}
                savingLabel={t.saving}
                disabled={busy !== null}
                onClick={() => void download("hd", hd.url)}
              />
              <p className="px-1 text-xs leading-relaxed text-muted">{t.hdNote}</p>
            </>
          ) : null}
        </div>
      );
    }

    if (group === "photo" && info.images.length > 0) {
      return (
        <div key="photo" className="flex flex-col gap-2">
          <ActionButton
            primary={primary}
            icon={<Images size={16} aria-hidden />}
            label={t.saveAllPhotos}
            busy={busy === "zip"}
            progress={progress}
            savingLabel={t.saving}
            disabled={busy !== null}
            onClick={() => void downloadAllPhotos()}
          />
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {info.images.map((src, i) => (
              <li
                key={src}
                className="relative overflow-hidden rounded-lg border border-border bg-elevated"
              >
                {/* Plain <img>: TikTok CDN images aren't in the next/image
                    allowlist, and this is a transient preview. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${t.savePhoto} ${i + 1}`}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="aspect-3/4 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => void download("image", src, i)}
                  disabled={busy !== null}
                  aria-label={`${t.savePhoto} ${i + 1}`}
                  className="absolute right-1.5 bottom-1.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white disabled:cursor-default disabled:opacity-60"
                >
                  {busy === `image-${i}` ? (
                    <InterlockingBalls size={13} />
                  ) : (
                    <Download size={15} aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="px-1 text-xs leading-relaxed text-muted">{t.iphonePhotoTip}</p>
        </div>
      );
    }

    if (group === "audio" && info.audio) {
      const audio = info.audio;
      const soundName = [audio.title, audio.author].filter(Boolean).join(" · ");
      return (
        <div key="audio" className="flex flex-col gap-2">
          <ActionButton
            primary={primary}
            icon={<Music2 size={16} aria-hidden />}
            label={t.saveAudio}
            meta={formatDuration(audio.duration)}
            busy={busy === "audio"}
            progress={progress}
            savingLabel={t.saving}
            disabled={busy !== null}
            onClick={() => void download("audio", audio.url)}
          />
          {soundName ? (
            <p className="truncate px-1 text-xs text-muted">
              {fill(t.soundBy, { title: soundName })}
            </p>
          ) : null}
        </div>
      );
    }

    return null;
  }

  function renderResult(post: TiktokPostInfo) {
    const groups = GROUP_ORDER[mode].filter((group) =>
      group === "video"
        ? Boolean(post.video)
        : group === "photo"
          ? post.images.length > 0
          : Boolean(post.audio),
    );
    const handle = post.authorUsername ? `@${post.authorUsername}` : post.author;
    const duration = formatDuration(post.duration);
    const mismatch =
      mode === "photo" && post.kind === "video"
        ? t.videoInPhotoMode
        : mode === "video" && post.kind === "photo"
          ? t.photoInVideoMode
          : null;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-3">
          {post.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover}
              alt=""
              referrerPolicy="no-referrer"
              className="h-16 w-12 shrink-0 rounded-lg object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[0.7rem] font-semibold">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                {post.kind === "photo" ? t.photoBadge : t.videoBadge}
              </span>
              {post.kind === "photo" ? (
                <span className="text-muted">
                  {fill(t.photoCount, { count: post.images.length })}
                </span>
              ) : null}
              {duration ? <span className="text-muted">{duration}</span> : null}
              {post.videoHd ? <span className="text-muted">HD</span> : null}
            </div>
            <p className="truncate text-sm font-semibold text-default">
              {post.title || "TikTok"}
            </p>
            {handle ? <p className="truncate text-xs text-muted">{handle}</p> : null}
          </div>
        </div>

        {mismatch ? (
          <p className="rounded-xl bg-elevated px-3 py-2 text-xs leading-relaxed text-muted">
            {mismatch}
          </p>
        ) : null}

        {groups.map((group, i) => renderGroup(group, i === 0))}

        <div aria-live="polite" className="min-h-0">
          {notice ? (
            <p
              role={notice.ok ? "status" : "alert"}
              className={`px-1 text-sm font-medium ${notice.ok ? "text-default" : "text-error"}`}
            >
              {notice.text}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={reset}
          className="cursor-pointer self-start px-1 text-xs font-medium text-muted underline underline-offset-2 hover:text-default"
        >
          {t.tryAnother}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[1.1rem] border border-border bg-surface p-3 sm:p-4">
      {status === "ready" && info ? (
        renderResult(info)
      ) : (
        <form
          // The browser's own URL check would reject pasted share text
          // ("Check this out https://vm.tiktok.com/…") and scheme-less links,
          // which extractTiktokUrl handles; lookup() reports bad input itself.
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (status !== "loading" && url.trim()) void lookup(url);
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-col gap-2 rounded-[1.5rem] border border-border bg-elevated p-2 sm:flex-row sm:items-center sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Link2 size={16} className="hidden shrink-0 text-muted sm:block" aria-hidden />
              <input
                ref={inputRef}
                type="url"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="go"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onPaste={handlePaste}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base text-default outline-none placeholder:text-placeholder sm:px-0 sm:py-0"
              />
              <button
                type="button"
                onClick={() => void pasteFromClipboard()}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-default"
              >
                <ClipboardPaste size={14} aria-hidden />
                {t.paste}
              </button>
            </div>
            <button
              type="submit"
              disabled={status === "loading" || !url.trim()}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white disabled:cursor-default disabled:opacity-50 sm:w-auto sm:shrink-0"
            >
              {status === "loading" ? (
                <>
                  <InterlockingBalls size={15} />
                  {t.fetching}
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
          {status === "error" && error ? (
            <p role="alert" className="px-2 text-sm font-medium text-error">
              {errorText[error]}
            </p>
          ) : null}
        </form>
      )}
      <p className="mt-3 px-2 text-xs text-muted">{t.disclaimer}</p>
    </div>
  );
}

function ActionButton({
  label,
  meta,
  icon,
  onClick,
  busy,
  progress,
  savingLabel,
  primary = false,
  disabled = false,
}: {
  label: string;
  meta?: string | null;
  icon: ReactNode;
  onClick: () => void;
  busy: boolean;
  progress: number | null;
  savingLabel: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  const percent = busy && progress != null ? ` ${Math.round(progress * 100)}%` : "";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-default disabled:opacity-60 ${
        primary
          ? "bg-primary text-white"
          : "border border-border bg-elevated text-default"
      }`}
    >
      {busy ? <InterlockingBalls size={15} /> : icon}
      <span>{busy ? `${savingLabel}${percent}` : label}</span>
      {!busy && meta ? <span className="text-xs font-normal opacity-80">· {meta}</span> : null}
    </button>
  );
}
