"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ClipboardPaste, Download, Link2, Video } from "lucide-react";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import type { Dictionary } from "@/i18n/getDictionary";
import { trackFacebookSaver } from "@/lib/analytics";
import { recordFacebookSaverEvent } from "@/lib/facebook-saver-analytics";
import {
  CODEC_NAME,
  attachmentUrl,
  extractFacebookUrl,
  facebookFileName,
  facebookSaveEndpoint,
  looksLikeTiktokLink,
  playsEverywhere,
  qualityLabel,
  type FacebookAsset,
  type FacebookSaverError,
  type FacebookVideoFile,
  type FacebookVideoInfo,
} from "@/lib/facebookSaver";
import { formatBytes, formatDuration } from "@/lib/tiktokSaver";
import { fetchWithFallback, saveBlob } from "./saverDownloads";

type Strings = Dictionary["facebookSaver"];
type Status = "idle" | "loading" | "ready" | "error";

/**
 * Files above this are not pulled into memory as a blob: a long Facebook video
 * can be gigabytes, which would crash a phone's tab. The browser saves them
 * itself from the CDN (`dl=1`), keeping Facebook's file name.
 */
const BLOB_LIMIT_BYTES = 150 * 1024 * 1024;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function statusToError(status: number): FacebookSaverError {
  if (status === 400) return "invalid_url";
  if (status === 403) return "login_required";
  if (status === 404) return "unavailable";
  if (status === 429) return "rate_limited";
  return "fetch_failed";
}

/** Hands a URL to the browser's own download manager. */
function startBrowserDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Facebook video downloader: paste a Facebook video or Reel link, preview it,
 * then save the SD MP4 (H.264, plays everywhere) or the HD file, whose codec
 * the tool names because Facebook often serves HD as VP9 or AV1.
 *
 * The lookup is the Shopi API's /tools/facebook-save. Files come straight
 * from Facebook's CDN; the API streams them only when that fails.
 */
export function FacebookSaverTool({ t, tiktokHref }: { t: Strings; tiktokHref: string }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<FacebookSaverError | null>(null);
  const [info, setInfo] = useState<FacebookVideoInfo | null>(null);
  // The link `info` was looked up for; proxied downloads re-resolve it.
  const [postUrl, setPostUrl] = useState("");
  const [busy, setBusy] = useState<FacebookAsset | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const errorText: Record<FacebookSaverError, ReactNode> = {
    invalid_url: t.errorInvalid,
    tiktok_link: (
      <>
        {t.errorTiktok}{" "}
        <Link href={tiktokHref} className="underline underline-offset-2">
          {t.errorTiktokLink}
        </Link>
      </>
    ),
    unavailable: t.errorUnavailable,
    login_required: t.errorLogin,
    fetch_failed: t.errorBusy,
    rate_limited: t.errorLimit,
  };

  /** `link` only once it's known to be a Facebook link; pasted text is never sent. */
  function fail(kind: FacebookSaverError, link?: string) {
    setStatus("error");
    setError(kind);
    trackFacebookSaver("facebook_saver_lookup", { outcome: "error", error: kind });
    recordFacebookSaverEvent({ type: "LOOKUP", outcome: "error", error: kind, url: link });
  }

  async function lookup(raw: string) {
    const link = extractFacebookUrl(raw);
    if (!link) {
      // Not a Facebook link, so nothing is sent anywhere.
      fail(looksLikeTiktokLink(raw) ? "tiktok_link" : "invalid_url");
      return;
    }
    const endpoint = facebookSaveEndpoint(link);
    if (!endpoint) {
      fail("fetch_failed", link);
      return;
    }

    setUrl(link);
    setStatus("loading");
    setError(null);
    setInfo(null);
    setNotice(null);

    try {
      let res = await fetch(endpoint, { credentials: "omit" });
      // A Facebook hiccup is usually gone a moment later; retry once.
      if (res.status === 502) {
        await wait(1_500);
        res = await fetch(endpoint, { credentials: "omit" });
      }
      if (!res.ok) throw statusToError(res.status);
      const data = (await res.json()) as FacebookVideoInfo;
      setInfo(data);
      setPostUrl(link);
      setStatus("ready");
      trackFacebookSaver("facebook_saver_lookup", {
        outcome: "success",
        hasHd: Boolean(data.videoHd),
        codec: data.videoHd?.codec ?? data.video.codec ?? undefined,
      });
      recordFacebookSaverEvent({ type: "LOOKUP", url: link, video: data });
    } catch (caught) {
      fail(typeof caught === "string" ? (caught as FacebookSaverError) : "fetch_failed", link);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const link = extractFacebookUrl(event.clipboardData.getData("text"));
    if (!link) return; // let an ordinary paste through
    event.preventDefault();
    setUrl(link);
    if (status !== "loading") void lookup(link);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const link = extractFacebookUrl(text);
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

  async function download(asset: FacebookAsset, file: FacebookVideoFile) {
    if (!info || busy) return;
    const codec = file.codec ?? undefined;

    if (file.size !== null && file.size > BLOB_LIMIT_BYTES) {
      startBrowserDownload(attachmentUrl(file.url));
      setNotice({ text: t.savedBig, ok: true });
      trackFacebookSaver("facebook_saver_download", {
        outcome: "success",
        asset,
        codec,
        delivery: "attachment",
      });
      recordFacebookSaverEvent({
        type: "DOWNLOAD",
        asset,
        codec: file.codec,
        delivery: "attachment",
        url: postUrl,
        video: info,
      });
      return;
    }

    setBusy(asset);
    setProgress(null);
    setNotice(null);
    try {
      const { blob, delivery } = await fetchWithFallback(
        file.url,
        facebookSaveEndpoint(postUrl, asset) ?? file.url,
        setProgress,
      );
      saveBlob(blob, facebookFileName(info.id, asset));
      setNotice({ text: t.saved, ok: true });
      trackFacebookSaver("facebook_saver_download", {
        outcome: "success",
        asset,
        codec,
        delivery,
      });
      recordFacebookSaverEvent({
        type: "DOWNLOAD",
        asset,
        codec: file.codec,
        delivery,
        url: postUrl,
        video: info,
      });
    } catch {
      setNotice({ text: t.errorSave, ok: false });
      trackFacebookSaver("facebook_saver_download", { outcome: "error", asset, codec });
      recordFacebookSaverEvent({
        type: "DOWNLOAD",
        outcome: "error",
        error: "save_failed",
        asset,
        url: postUrl,
        video: info,
      });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  function fileMeta(file: FacebookVideoFile) {
    return [qualityLabel(file), formatBytes(file.size)].filter(Boolean).join(" · ") || null;
  }

  function renderResult(post: FacebookVideoInfo) {
    const hd = post.videoHd;
    const duration = formatDuration(post.duration);
    const isReel = post.permalink?.includes("/reel/") ?? false;
    const landscape =
      post.video.width && post.video.height ? post.video.width > post.video.height : false;
    const hdNote = !hd
      ? null
      : playsEverywhere(hd)
        ? t.hdNoteH264
        : hd.codec
          ? fill(t.hdNoteCodec, { codec: CODEC_NAME[hd.codec] })
          : t.hdNoteUnknown;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-3">
          {post.cover ? (
            // Plain <img>: Facebook CDN images aren't in the next/image
            // allowlist, and this is a transient preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover}
              alt=""
              referrerPolicy="no-referrer"
              className={`shrink-0 rounded-lg object-cover ${landscape ? "h-14 w-24" : "h-16 w-12"}`}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[0.7rem] font-semibold">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                {isReel ? t.reelBadge : t.videoBadge}
              </span>
              {duration ? <span className="text-muted">{duration}</span> : null}
              {hd ? <span className="text-muted">HD</span> : null}
            </div>
            <p className="line-clamp-2 text-sm font-semibold text-default">
              {post.title || "Facebook video"}
            </p>
            {post.author ? <p className="truncate text-xs text-muted">{post.author}</p> : null}
          </div>
        </div>

        <ActionButton
          primary
          icon={<Video size={16} aria-hidden />}
          label={t.saveVideo}
          meta={fileMeta(post.video)}
          busy={busy === "video"}
          progress={progress}
          savingLabel={t.saving}
          disabled={busy !== null}
          onClick={() => void download("video", post.video)}
        />
        {hd ? (
          <>
            <ActionButton
              icon={<Download size={16} aria-hidden />}
              label={t.saveHd}
              meta={[fileMeta(hd), hd.codec && !playsEverywhere(hd) ? CODEC_NAME[hd.codec] : null]
                .filter(Boolean)
                .join(" · ")}
              busy={busy === "hd"}
              progress={progress}
              savingLabel={t.saving}
              disabled={busy !== null}
              onClick={() => void download("hd", hd)}
            />
            <p className="px-1 text-xs leading-relaxed text-muted">{hdNote}</p>
          </>
        ) : null}

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
          // The browser's own URL check would reject pasted share text and
          // scheme-less links, which extractFacebookUrl handles.
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
                t.button
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
  // Quality, size and codec go on their own line: on a 360 px phone they don't
  // fit beside "Download video (MP4)".
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full px-5 py-2 text-sm font-semibold disabled:cursor-default disabled:opacity-60 ${
        primary ? "bg-primary text-white" : "border border-border bg-elevated text-default"
      }`}
    >
      {busy ? <InterlockingBalls size={15} /> : icon}
      <span className="flex flex-col items-start leading-tight">
        <span>{busy ? `${savingLabel}${percent}` : label}</span>
        {!busy && meta ? <span className="text-xs font-normal opacity-80">{meta}</span> : null}
      </span>
    </button>
  );
}
