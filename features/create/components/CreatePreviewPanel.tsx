"use client";

import { ImageIcon, MapPin, Globe, Users, Lock } from "lucide-react";
import { useCreateStore } from "@/stores/create";
import { useAuthStore } from "@/stores/auth";
import { getMediaPreviewSrc } from "@/features/create/utils/mediaPreview";
import { TikTokCreatePreview } from "./TikTokCreatePreview";

/**
 * Live post preview — the right-hand panel of the desktop create dialog.
 *
 * Renders a feed-card mock that updates in real time as the user fills in the
 * details step (StepEdit live-syncs its local form state into the create
 * store). Purely presentational: reads the store, never writes it.
 */
export function CreatePreviewPanel() {
  const {
    mediaItems,
    tiktokEmbed,
    title,
    caption,
    hashtags,
    price,
    isFree,
    currency,
    location,
    categoryName,
    visibilityMode,
  } = useCreateStore();
  const user = useAuthStore((s) => s.user);

  const cover = mediaItems[0];
  const coverSrc = getMediaPreviewSrc(cover);
  const extraCount = mediaItems.length - 1;

  const displayName =
    user?.profile?.firstName || user?.email?.split("@")[0] || "You";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";

  const priceLabel =
    isFree || !price ? "Free" : `${currency} ${price.toLocaleString()}`;

  const VisibilityIcon =
    visibilityMode === "private"
      ? Lock
      : visibilityMode === "friends_only"
        ? Users
        : Globe;
  const visibilityLabel =
    visibilityMode === "private"
      ? "Only me"
      : visibilityMode === "friends_only"
        ? "Friends only"
        : "Everyone";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <span
        className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide"
        style={{
          fontSize: "var(--text-xs)",
          color: "rgb(var(--color-text-muted))",
        }}
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ backgroundColor: "rgb(var(--brand-primary))" }}
        />
        Live preview
      </span>

      {/* ── Post card mock ── */}
      <div
        className="w-full max-w-[300px] overflow-hidden rounded-3xl"
        style={{
          backgroundColor: "rgb(var(--color-bg-elevated))",
          border: "1px solid rgb(var(--color-border))",
          boxShadow: "0 18px 44px rgb(0 0 0 / 0.14)",
        }}
      >
        {/* Seller row */}
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
            style={{ backgroundColor: "rgb(var(--brand-primary))" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate font-semibold leading-tight"
              style={{
                fontSize: "var(--text-sm)",
                color: "rgb(var(--color-text))",
              }}
            >
              {displayName}
            </p>
            <p
              className="flex items-center gap-1 truncate leading-tight"
              style={{
                fontSize: "var(--text-xs)",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              {location ? (
                <>
                  <MapPin size={11} className="shrink-0" />
                  <span className="truncate">{location.placeName}</span>
                </>
              ) : (
                "Location appears here"
              )}
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium"
            style={{
              fontSize: "10px",
              backgroundColor: "rgb(var(--color-bg-subtle))",
              border: "1px solid rgb(var(--color-border))",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            <VisibilityIcon size={10} />
            {visibilityLabel}
          </span>
        </div>

        {/* Media */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "4 / 5",
            backgroundColor: "rgb(var(--color-bg-subtle))",
          }}
        >
          {tiktokEmbed ? (
            <TikTokCreatePreview
              embed={tiktokEmbed}
              className="absolute inset-0 h-full w-full"
              sizes="300px"
            />
          ) : cover?.type === "video" && cover.localUri ? (
            <video
              src={cover.localUri}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "rgb(var(--brand-primary) / 0.1)" }}
              >
                <ImageIcon
                  size={22}
                  style={{ color: "rgb(var(--brand-primary))" }}
                />
              </span>
              <p className="px-6" style={{ fontSize: "var(--text-xs)" }}>
                Your photos or video will show here
              </p>
            </div>
          )}

          {/* Price chip */}
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 font-bold text-white"
            style={{
              fontSize: "var(--text-xs)",
              backgroundColor: "rgb(var(--brand-primary))",
              boxShadow: "0 6px 16px rgb(var(--brand-primary) / 0.45)",
            }}
          >
            {priceLabel}
          </span>

          {extraCount > 0 && (
            <span
              className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-semibold text-white "
              style={{ fontSize: "var(--text-xs)" }}
            >
              1/{mediaItems.length}
            </span>
          )}

          {/* Bottom gradient + title overlay */}
          <div
            className="absolute inset-x-0 bottom-0 px-3.5 pb-3 pt-10"
            style={{
              background:
                "linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0))",
            }}
          >
            <p
              className="line-clamp-2 font-bold leading-snug text-white"
              style={{
                fontSize: "var(--text-base)",
                opacity: title ? 1 : 0.55,
              }}
            >
              {title || "Your title appears here"}
            </p>
          </div>
        </div>

        {/* Caption + tags */}
        <div className="flex flex-col gap-2 px-3.5 py-3">
          <p
            className="line-clamp-2 leading-snug"
            style={{
              fontSize: "var(--text-sm)",
              color: caption
                ? "rgb(var(--color-text))"
                : "rgb(var(--color-text-muted))",
            }}
          >
            {caption || "Add a description to tell buyers more…"}
          </p>

          {(hashtags.length > 0 || categoryName) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryName && (
                <span
                  className="rounded-full px-2 py-0.5 font-semibold"
                  style={{
                    fontSize: "10px",
                    backgroundColor: "rgb(var(--color-bg-subtle))",
                    border: "1px solid rgb(var(--color-border))",
                    color: "rgb(var(--color-text-muted))",
                  }}
                >
                  {categoryName}
                </span>
              )}
              {hashtags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 font-medium"
                  style={{
                    fontSize: "10px",
                    backgroundColor: "rgb(var(--brand-primary) / 0.1)",
                    color: "rgb(var(--brand-primary))",
                  }}
                >
                  #{tag}
                </span>
              ))}
              {hashtags.length > 4 && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "rgb(var(--color-text-muted))",
                  }}
                >
                  +{hashtags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <p
        className="max-w-70 text-center"
        style={{
          fontSize: "var(--text-xs)",
          color: "rgb(var(--color-text-muted))",
        }}
      >
        This is how your post will look on the feed
      </p>
    </div>
  );
}
