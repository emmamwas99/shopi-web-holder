// Pure helpers for the messaging feature. Extracted verbatim from the original
// InboxScreen monolith — no logic changes (Phase 0 refactor).

import type {
  DirectConversationUpdatedPayload,
  DirectMessageCreatedPayload,
  DirectMessageUpdatedPayload,
} from "@/lib/socket/socket-events";
import type { Conversation, Message, UserLite } from "../types";
import { timeAgoLong } from "@/lib/time";

export function normalizeEnum(value?: string | null): string {
  return (value ?? "").toLowerCase();
}

export function messageKind(
  value?: string | null,
): "text" | "image" | "video" | "location" {
  const normalized = normalizeEnum(value);
  if (normalized.includes("video")) return "video";
  if (normalized.includes("image")) return "image";
  if (normalized.includes("location")) return "location";
  return "text";
}

/**
 * Deep link to the pinned coordinates that opens the device's default maps app
 * (Apple Maps on iOS, Google Maps elsewhere / web). Using the `geo:`-style
 * Google query URL works as a universal link across platforms.
 */
export function mapsUrlFor(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * A single OpenStreetMap raster tile (keyless, reliable: tile.openstreetmap.org)
 * that contains the pin. The bubble overlays its own marker at the center, so we
 * pick a zoom where the location sits roughly mid-tile. Used as the location
 * message preview without needing any Maps API key or billing.
 *
 * If a Google key is set AND the Static Maps API is explicitly enabled via
 * NEXT_PUBLIC_USE_GOOGLE_STATIC_MAPS, prefer Google's nicer marked thumbnail.
 */
export function googleStaticMapUrl(
  latitude: number,
  longitude: number,
  { width = 320, height = 160, zoom = 15 } = {},
): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || process.env.NEXT_PUBLIC_USE_GOOGLE_STATIC_MAPS !== "true") {
    return null;
  }
  const center = `${latitude},${longitude}`;
  return (
    `https://maps.googleapis.com/maps/api/staticmap?center=${center}` +
    `&zoom=${zoom}&size=${width}x${height}&scale=2` +
    `&markers=color:red%7C${center}&key=${key}`
  );
}

/** Web-mercator tile coords for a lat/lng at a zoom level. */
function lngLatToTile(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((longitude + 180) / 360) * n);
  const latRad = (latitude * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

/**
 * Static map thumbnail for a location bubble. Prefers Google (when enabled),
 * else a keyless OSM tile. The bubble draws the marker on top, so a plain tile
 * is fine. Returns the image src.
 */
export function staticMapUrl(
  latitude: number,
  longitude: number,
  opts: { width?: number; height?: number; zoom?: number } = {},
): string | null {
  const google = googleStaticMapUrl(latitude, longitude, opts);
  if (google) return google;
  const zoom = opts.zoom ?? 15;
  const { x, y } = lngLatToTile(latitude, longitude, zoom);
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

// Matches http(s) URLs and bare domains like "jiji.co.ke" / "jiji.co.ke/x".
// The trailing class trims sentence punctuation so "see jiji.co.ke." links the
// domain without the period.
const URL_RE =
  /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

/** Ensure a detected URL has a scheme so it's a valid href. */
export function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** The first URL in a string (scheme added), or null. Used for link previews. */
export function firstUrl(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(URL_RE);
  return match?.[0] ? ensureHttp(match[0]) : null;
}

/**
 * Split text into plain + link segments so a bubble can render clickable links
 * inline. Each segment is either text or a link with its href.
 */
export function linkifyParts(
  text: string,
): Array<{ type: "text"; value: string } | { type: "link"; value: string; href: string }> {
  const parts: Array<
    { type: "text"; value: string } | { type: "link"; value: string; href: string }
  > = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ type: "link", value: match[0], href: ensureHttp(match[0]) });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

export function mediaStatus(value?: string | null): string {
  return normalizeEnum(value) || "pending";
}

/**
 * Grab a poster frame from a video File as a data URL, so we can show an actual
 * preview/buffer while the video uploads (a raw video blob can't render as an
 * <img>). Resolves to null if the frame can't be captured (caller falls back to
 * a plain skeleton). Returns a data URL (not an object URL) so it never needs
 * revoking and survives the message lifecycle.
 */
export function videoPosterFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const capture = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        finish(null);
      }
    };

    video.onloadeddata = () => {
      // Seek a touch past the very first frame (often black) for a better poster.
      const target = Math.min(0.1, (video.duration || 1) / 2);
      const onSeeked = () => capture();
      video.onseeked = onSeeked;
      try {
        video.currentTime = target;
      } catch {
        capture();
      }
    };
    video.onerror = () => finish(null);
    // Safety timeout so a stubborn file never hangs staging.
    setTimeout(() => finish(null), 3000);
  });
}

export function participantName(user?: UserLite | null): string {
  const first = user?.profile?.firstName?.trim();
  const last = user?.profile?.lastName?.trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || user?.username || "Shopi user";
}

export function initialsForUser(user?: UserLite | null): string {
  return participantName(user)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function avatarGradient(id: string) {
  const palette = [
    "from-primary to-highlight",
    "from-violet-500 to-fuchsia-500",
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-rose-500",
  ];
  const index = parseInt(id.slice(-1), 16) % palette.length;
  return palette[index];
}

export function conversationThumb(conversation?: Conversation | null): string | null {
  const media = conversation?.content?.media?.[0];
  return (
    media?.thumbnailUrl ??
    media?.muxMeta?.thumbnailUrl ??
    media?.imageUrl ??
    media?.r2Variants?.find((variant) => variant.variant === "medium")?.url ??
    media?.r2Variants?.[0]?.url ??
    conversation?.story?.media?.muxThumbnailUrl ??
    conversation?.story?.media?.thumbnailUrl ??
    conversation?.story?.media?.imageUrl ??
    null
  );
}

export function imageForMessage(message: Message): string | null {
  // Prefer the uploaded/processed URL once it exists — the local blob preview is
  // only a stand-in while the upload is in flight, and that blob gets revoked
  // after the message settles (which would otherwise show a broken image until a
  // refresh). Fall back to the blob only while still uploading.
  const uploaded =
    message.mediaAsset?.r2Variants?.find((variant) => variant.variant === "medium")?.url ??
    message.mediaAsset?.thumbnailUrl ??
    null;
  if (uploaded) return uploaded;
  return message.localPreviewUrl ?? null;
}

export function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return "";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency || "KES",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || "KES"} ${amount}`;
  }
}

export function shortTime(value?: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Midnight local time for the day a date falls on. */
function startOfLocalDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/**
 * Timestamp for a row in a list — conversations, notifications.
 *
 * Time of day alone is only meaningful for today. A message from last Tuesday
 * showing "14:32" tells you the hour and nothing else, so every older row in
 * both inbox tabs looked like it had just arrived. This is the ladder people
 * already know from WhatsApp:
 *
 *   today      → 14:32
 *   yesterday  → Yesterday
 *   this week  → Thursday
 *   older      → 03/09/2026
 *
 * Days are compared as local calendar days, not 24-hour windows, so something
 * sent at 23:50 reads "Yesterday" at 00:10 rather than still counting as today.
 *
 * Individual chat bubbles deliberately keep `shortTime`: inside a conversation
 * the day is already established by the thread, and the bubble only needs the
 * clock.
 */
export function listTimestamp(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dayDiff = Math.round(
    (startOfLocalDay(new Date()) - startOfLocalDay(date)) / 86_400_000,
  );

  // `<= 0` rather than `=== 0`: a clock a few seconds behind the server would
  // otherwise render a brand-new message as a future date.
  if (dayDiff <= 0) return shortTime(value);
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  // en-GB rather than the runtime locale, so the day/month order is the one
  // Kenya uses and cannot flip to US month/day on a differently configured
  // device.
  return date.toLocaleDateString("en-GB");
}

export function lastSeenLabel(conversation?: Conversation | null): string {
  if (!conversation?.otherParticipant) return "";
  if (conversation.otherParticipantOnline) return "Online";
  if (!conversation.otherParticipantLastSeenAt) return "Offline";
  // timeAgoLong already returns "just now" for very recent times (no "ago"),
  // which fixes the old "Last seen now ago" bug.
  const label = timeAgoLong(conversation.otherParticipantLastSeenAt);
  return label === "just now" ? "Last seen just now" : `Last seen ${label}`;
}

export function previewLabel(type?: string | null, text?: string | null): string {
  if (text?.trim()) return text;
  const kind = messageKind(type);
  if (kind === "image") return "Photo";
  if (kind === "video") return "Video";
  if (kind === "location") return "📍 Location";
  return "Message";
}

export function upsertConversation(
  items: Conversation[],
  payload: DirectConversationUpdatedPayload,
): Conversation[] {
  if (!payload.lastMessageId) {
    return removeConversation(items, payload.conversationId);
  }
  const index = items.findIndex((item) => item.id === payload.conversationId);
  if (index === -1) return items;

  const updated: Conversation = {
    ...items[index],
    lastMessageId: payload.lastMessageId,
    lastMessageText: payload.lastMessageText,
    lastMessageType: payload.lastMessageType,
    lastMessageSenderId: payload.lastMessageSenderId,
    lastMessageAt: payload.lastMessageAt,
    isPinned: payload.isPinned ?? items[index].isPinned,
    myUnreadCount: payload.myUnreadCount,
    blockedByMe: payload.blockedByMe ?? items[index].blockedByMe,
    blockedByOther: payload.blockedByOther ?? items[index].blockedByOther,
    canSendMessages: payload.canSendMessages ?? items[index].canSendMessages,
    // Deal state is sent in full on every update (reopening clears it), so set
    // it directly rather than coalescing — an absent value means "reopened".
    dealClosedAt: payload.dealClosedAt ?? null,
    dealClosedByUserId: payload.dealClosedByUserId ?? null,
  };

  const next = [...items];
  next[index] = updated;
  return next.sort((left, right) => {
    if (left.isPinned && !right.isPinned) return -1;
    if (!left.isPinned && right.isPinned) return 1;
    return (
      new Date(right.lastMessageAt ?? 0).getTime() -
      new Date(left.lastMessageAt ?? 0).getTime()
    );
  });
}

export function removeConversation(
  items: Conversation[],
  conversationId: string,
): Conversation[] {
  return items.filter((conversation) => conversation.id !== conversationId);
}

export function upsertMessage(messages: Message[], incoming: Message): Message[] {
  // Merge two media assets, keeping a renderable thumbnail from the previous one
  // when the incoming asset doesn't have its own yet. This is what keeps a video
  // poster (a client-side data URL) on screen after the server message arrives
  // by id but before the processed thumbnail is ready — otherwise the poster got
  // clobbered and the bubble went blank until a hard refresh.
  const mergeMediaAsset = (
    prev: Message["mediaAsset"],
    next: Message["mediaAsset"],
  ): Message["mediaAsset"] => {
    if (!next) return prev ?? next;
    if (!prev) return next;
    return {
      ...prev,
      ...next,
      thumbnailUrl: next.thumbnailUrl ?? prev.thumbnailUrl ?? null,
      muxMeta: next.muxMeta?.thumbnailUrl
        ? next.muxMeta
        : (next.muxMeta ?? prev.muxMeta),
      r2Variants: next.r2Variants ?? prev.r2Variants,
    };
  };

  // 1) Exact id match — already present (e.g. socket after mutation). Merge.
  const byId = messages.findIndex((m) => m.id === incoming.id);
  if (byId !== -1) {
    const next = [...messages];
    next[byId] = {
      ...next[byId],
      ...incoming,
      mediaAsset: mergeMediaAsset(next[byId].mediaAsset, incoming.mediaAsset),
      localPreviewUrl: incoming.localPreviewUrl ?? next[byId].localPreviewUrl ?? null,
    };
    return next;
  }

  // 2) Reconcile an optimistic row with the confirmed server message. Match by
  //    clientMessageId when present, otherwise fall back to a heuristic match on
  //    an unconfirmed optimistic row from me (socket events don't carry the
  //    clientMessageId). Either way we REPLACE the optimistic row in place so the
  //    media/text never shows twice.
  const optimisticIndex = messages.findIndex((m) => {
    if (!m.id.startsWith("optimistic:")) return false;
    if (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId) return true;
    // Heuristic fallback: same sender, same kind, same media or same text,
    // created within a short window.
    if (incoming.senderId && m.senderId !== incoming.senderId) return false;
    const sameMedia =
      incoming.mediaAssetId != null && m.mediaAssetId != null
        ? incoming.mediaAssetId === m.mediaAssetId
        : false;
    const sameText =
      !incoming.mediaAssetId && !m.mediaAssetId && (incoming.text ?? "") === (m.text ?? "");
    const closeInTime =
      Math.abs(new Date(incoming.createdAt).getTime() - new Date(m.createdAt).getTime()) < 60000;
    return (sameMedia || sameText) && closeInTime;
  });

  if (optimisticIndex !== -1) {
    const existing = messages[optimisticIndex];
    const next = [...messages];
    next[optimisticIndex] = {
      ...existing,
      ...incoming,
      pendingStatus: null,
      // Keep the instant local preview until the server's processed media is
      // actually renderable, so the image never flashes back to a spinner.
      localPreviewUrl: incoming.localPreviewUrl ?? existing.localPreviewUrl ?? null,
    };
    return next;
  }

  // 3) New message — append, keep chronological order.
  return [...messages, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function applyMessageUpdate(
  messages: Message[],
  payload: DirectMessageUpdatedPayload,
): Message[] {
  if (payload.kind === "deleted") {
    const deletedIds = new Set(payload.messageIds);
    return messages.filter((message) => !deletedIds.has(message.id));
  }

  return messages.map((message) => {
    if (!payload.messageIds.includes(message.id)) return message;

    if (payload.kind === "media" && payload.media) {
      return {
        ...message,
        mediaAsset: {
          ...(message.mediaAsset ?? { id: payload.media.mediaAssetId }),
          id: payload.media.mediaAssetId,
          type: payload.media.type.toUpperCase(),
          status: payload.media.status.toUpperCase(),
          thumbnailUrl: payload.media.thumbnailUrl ?? message.mediaAsset?.thumbnailUrl,
          errorMessage: payload.media.errorMessage ?? message.mediaAsset?.errorMessage,
          displayWidth: payload.media.displayWidth ?? message.mediaAsset?.displayWidth,
          displayHeight: payload.media.displayHeight ?? message.mediaAsset?.displayHeight,
          r2Variants: payload.media.url
            ? [{ url: payload.media.url, variant: "medium" }]
            : (message.mediaAsset?.r2Variants ?? null),
          muxMeta: {
            ...(message.mediaAsset?.muxMeta ?? {}),
            playbackId: payload.media.muxPlaybackId,
            duration: payload.media.duration,
            thumbnailUrl: payload.media.thumbnailUrl,
            aspectRatio: payload.media.aspectRatio,
          },
        },
      };
    }

    if (payload.kind === "read") {
      return {
        ...message,
        deliveredAt: payload.readAt ?? message.deliveredAt,
        readAt: payload.readAt ?? message.readAt,
        deliveryStatus: "read",
      };
    }

    if (payload.kind === "delivery") {
      return {
        ...message,
        deliveredAt: payload.deliveredAt ?? message.deliveredAt,
        deliveryStatus: message.readAt ? "read" : "delivered",
      };
    }

    return message;
  });
}

export function fromSocketMessage(
  payload: DirectMessageCreatedPayload,
  currentUserId?: string | null,
): Message {
  return {
    id: payload.messageId,
    conversationId: payload.conversationId,
    contentId: payload.contentId,
    senderId: payload.senderId,
    recipientId: payload.recipientId,
    type: payload.type.toUpperCase(),
    text: payload.text ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    locationLabel: payload.locationLabel ?? null,
    deliveredAt: payload.deliveredAt ?? null,
    readAt: payload.readAt ?? null,
    createdAt: payload.createdAt,
    isMine: payload.senderId === currentUserId,
    deliveryStatus: payload.readAt
      ? "read"
      : payload.deliveredAt
        ? "delivered"
        : "sent",
    mediaAsset: payload.media
      ? {
          id: payload.media.mediaAssetId,
          type: payload.media.type.toUpperCase(),
          status: payload.media.status.toUpperCase(),
          thumbnailUrl: payload.media.thumbnailUrl ?? null,
          displayWidth: payload.media.displayWidth ?? null,
          displayHeight: payload.media.displayHeight ?? null,
          errorMessage: payload.media.errorMessage ?? null,
          r2Variants: payload.media.url ? [{ url: payload.media.url, variant: "medium" }] : null,
          muxMeta: {
            playbackId: payload.media.muxPlaybackId ?? null,
            duration: payload.media.duration ?? null,
            thumbnailUrl: payload.media.thumbnailUrl ?? null,
            aspectRatio: payload.media.aspectRatio ?? null,
          },
        }
      : null,
  };
}
