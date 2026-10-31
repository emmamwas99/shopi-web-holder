/**
 * Helpers for the `next/og` share cards.
 *
 * ImageResponse renders through satori, which decodes PNG, JPEG and GIF only —
 * it has no WebP or AVIF decoder, and it draws an undecodable source as an
 * empty box rather than failing loudly.
 *
 * Shopi's image host (images.shopi.co.ke) serves *every* variant as .webp —
 * large.webp, original.webp, thumb.webp — and offers no format parameter, so
 * the original "pick a candidate satori can decode" approach found nothing to
 * pick and every share card fell back to its placeholder. Listings shared to
 * WhatsApp showed a shopping-bag emoji where the product photo should be.
 *
 * So we decode it ourselves: fetch the bytes, re-encode to JPEG with sharp, and
 * hand satori a data URI. Everything is best-effort — any failure returns null
 * and the caller's placeholder stands, because a card with no photo still beats
 * a route that 500s and leaves the share with no image at all.
 */

/** First non-empty candidate, whatever its format. */
function firstUrl(candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Re-encode a rendered card as JPEG.
 *
 * `ImageResponse` only ever emits PNG, which is the wrong codec for a card that
 * is three-quarters photograph: the listing card measured 64 KB with the
 * placeholder and 791 KB once a real photo was drawn into it. WhatsApp is
 * unreliable about fetching link images much above a couple of hundred KB, so
 * the photo fix would have swapped a missing image for a missing preview. JPEG
 * brings the same card back under 150 KB.
 *
 * Falls back to the original PNG response if the re-encode fails, because a
 * heavy card still previews on most platforms and a 500 previews on none.
 */
export async function ogJpegResponse(
  rendered: Response,
  { quality = 86 }: { quality?: number } = {},
): Promise<Response> {
  try {
    const png = Buffer.from(await rendered.clone().arrayBuffer());
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(png).jpeg({ quality, mozjpeg: true }).toBuffer();

    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        // Matches the route's own `revalidate`, and lets a CDN keep serving
        // the old card while a new one is generated.
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return rendered;
  }
}

/** Give up on a slow image host rather than hanging the whole card render. */
const FETCH_TIMEOUT_MS = 4000;
/** Source images above this are not worth the decode for a 1200×630 card. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

/** Fetch an image's bytes, or null when it is missing, slow or too large. */
async function fetchImageBytes(url: string): Promise<Buffer | null> {
  try {
    // No `cache` option: the default fetches once per render without storing
    // the bytes, and the card itself is cached on its route's revalidate.
    // `cache: "no-store"` must not come back — it sets the whole route's
    // revalidate to 0, so every request served a stale card and redrew it
    // (satori + sharp) in the background, which defeats the ISR cache.
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_SOURCE_BYTES) return null;

    const source = Buffer.from(await response.arrayBuffer());
    if (source.byteLength === 0 || source.byteLength > MAX_SOURCE_BYTES) {
      return null;
    }
    return source;
  } catch {
    return null;
  }
}

/**
 * Fetch an image and return a data URI satori can draw, converting when needed.
 *
 * `box` is the space the image will occupy on the card. The source is resized
 * to cover it before encoding, which is what keeps the conversion cheap and the
 * data URI small — a full-size original re-encoded as JPEG would add hundreds of
 * kilobytes to a card that only ever displays it at card size.
 *
 * Returns null when there is nothing usable, so callers keep their fallback.
 */
export async function ogImageDataUri(
  candidates: (string | null | undefined)[],
  box: { width: number; height: number },
): Promise<string | null> {
  const url = firstUrl(candidates);
  if (!url) return null;

  try {
    const source = await fetchImageBytes(url);
    if (!source) return null;

    // sharp ships with Next for image optimisation, but it is a native module
    // and this route must not fall over if it is ever absent. Imported here
    // rather than at module scope so that failure is catchable, and so a
    // caller that only needs the URL helpers above does not pull it in.
    const sharp = (await import("sharp")).default;

    const jpeg = await sharp(source, { failOn: "none" })
      .rotate() // honour EXIF orientation before we discard the metadata
      .resize(box.width, box.height, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The standard large link-preview frame (Facebook, WhatsApp, X, LinkedIn). */
export const OG_PHOTO_SIZE = { width: 1200, height: 630 };

/**
 * A photo at least this much wider than tall (about 4:3 and wider) fills the
 * frame - cropping it to 1.91:1 costs a quarter of the image or less. Anything
 * taller is shown whole instead, because the sides of a portrait phone photo
 * are exactly where a product sits.
 */
const COVER_MIN_ASPECT = 1.4;
/** WhatsApp is unreliable about fetching link images much past this. */
const MAX_PHOTO_BYTES = 230 * 1024;
const PHOTO_QUALITIES = [84, 76, 68, 58];
/** Candidates to try before giving up, so one dead URL doesn't sink the card. */
const MAX_PHOTO_ATTEMPTS = 3;

/**
 * The real photo, prepared as a link preview - what a marketplace puts in
 * `og:image`, rather than a designed card.
 *
 * The image host serves only .webp, which WhatsApp and some other scrapers
 * render unreliably (or not at all), so the photo is re-encoded as a JPEG kept
 * under MAX_PHOTO_BYTES and framed at 1200x630 so every platform shows the same
 * large card. Wide photos fill the frame; portrait and square ones are shown
 * whole over a blurred, darkened copy of themselves.
 *
 * Tries each candidate in order and returns null when none yields a usable
 * image, so callers keep a fallback.
 */
export async function ogPhotoJpeg(
  candidates: (string | null | undefined)[],
  box: { width: number; height: number } = OG_PHOTO_SIZE,
): Promise<Buffer | null> {
  const urls = [
    ...new Set(
      candidates.map((c) => c?.trim()).filter((c): c is string => Boolean(c)),
    ),
  ].slice(0, MAX_PHOTO_ATTEMPTS);

  for (const url of urls) {
    const source = await fetchImageBytes(url);
    if (!source) continue;
    try {
      return await frameAsPhotoCard(source, box);
    } catch {
      // Undecodable or sharp unavailable - try the next candidate.
    }
  }
  return null;
}

async function frameAsPhotoCard(
  source: Buffer,
  { width, height }: { width: number; height: number },
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const open = () => sharp(source, { failOn: "none" }).rotate();

  const meta = await sharp(source, { failOn: "none" }).metadata();
  // EXIF orientations 5-8 swap the axes; `rotate()` applies them on output.
  const turned = (meta.orientation ?? 1) >= 5;
  const w = (turned ? meta.height : meta.width) ?? 0;
  const h = (turned ? meta.width : meta.height) ?? 0;
  if (!w || !h) throw new Error("Unreadable image dimensions");

  let flat: Buffer;
  if (w / h >= COVER_MIN_ASPECT) {
    flat = await open()
      .resize(width, height, { fit: "cover", position: "centre" })
      .removeAlpha()
      .raw()
      .toBuffer();
  } else {
    // Blur a small copy and scale it back up: same look as blurring the full
    // frame, at a fraction of the cost.
    const backdrop = await open()
      .resize(Math.round(width / 6), Math.round(height / 6), { fit: "cover" })
      .blur(6)
      .modulate({ brightness: 0.7 })
      .resize(width, height)
      .toBuffer();
    const foreground = await open()
      .resize(width, height, { fit: "inside" })
      .png()
      .toBuffer();
    flat = await sharp(backdrop)
      .composite([{ input: foreground, gravity: "centre" }])
      .removeAlpha()
      .raw()
      .toBuffer();
  }

  const raw = { width, height, channels: 3 as const };
  let jpeg: Buffer = Buffer.alloc(0);
  for (const quality of PHOTO_QUALITIES) {
    jpeg = await sharp(flat, { raw })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (jpeg.byteLength <= MAX_PHOTO_BYTES) break;
  }
  return jpeg;
}

/** Response headers for a share image; matches the routes' own revalidate. */
export const OG_PHOTO_HEADERS = {
  "Content-Type": "image/jpeg",
  "Cache-Control":
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};
