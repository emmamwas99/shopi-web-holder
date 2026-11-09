/**
 * Browser-side download helpers for the TikTok saver.
 *
 * Files are fetched straight from TikTok's CDN, which answers with
 * `Access-Control-Allow-Origin: *` (checked 4 Nov 2026), and saved from a blob
 * URL so the `download` attribute applies — it is ignored on cross-origin
 * links. When the direct fetch fails (CSP, CORS change, an old browser) the
 * same file is streamed through /api/tiktok-save instead.
 */

type Progress = (fraction: number | null) => void;

async function fetchBlob(url: string, onProgress?: Progress): Promise<Blob> {
  const res = await fetch(url, {
    // No Referer: TikTok's CDN has no reason to see which page asked.
    referrerPolicy: "no-referrer",
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`http_${res.status}`);

  const total = Number(res.headers.get("Content-Length")) || 0;
  const type = res.headers.get("Content-Type") ?? "";
  if (!res.body || !total || !onProgress) {
    onProgress?.(null);
    return res.blob();
  }

  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
    received += value.byteLength;
    onProgress(Math.min(1, received / total));
  }
  return new Blob(chunks, { type });
}

/**
 * How the file arrived: straight from TikTok's CDN, or streamed through our
 * function (which spends Vercel bandwidth — worth watching in analytics).
 */
export type SaverDelivery = "direct" | "proxy";

/** Direct from the CDN first, then through our API. Throws when both fail. */
export async function fetchWithFallback(
  directUrl: string,
  fallbackUrl: string,
  onProgress?: Progress,
): Promise<{ blob: Blob; delivery: SaverDelivery }> {
  let blob: Blob | null = null;
  let delivery: SaverDelivery = "direct";
  try {
    blob = await fetchBlob(directUrl, onProgress);
  } catch {
    blob = null;
  }
  if (!blob || blob.size === 0) {
    delivery = "proxy";
    blob = await fetchBlob(fallbackUrl, onProgress);
  }
  if (blob.size === 0) throw new Error("empty_download");
  return { blob, delivery };
}

export function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking in the same tick can cancel the save in Safari and Firefox.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

// ── Minimal ZIP writer (STORE, no compression) ──────────────────────────────
// Photos are already-compressed JPEGs, so deflate would gain almost nothing;
// storing them keeps this to a few lines instead of a dependency.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

export async function zipFiles(
  files: { name: string; blob: Blob }[],
): Promise<Blob> {
  const encoder = new TextEncoder();
  const { time, day } = dosDateTime(new Date());
  const parts: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);
    const size = data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // STORE
    lv.setUint16(10, time, true);
    lv.setUint16(12, day, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    parts.push(local as BlobPart, data as BlobPart);

    const entry = new Uint8Array(46 + name.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory header
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, day, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true); // local header offset
    entry.set(name, 46);
    central.push(entry);

    offset += local.length + size;
  }

  const centralSize = central.reduce((sum, entry) => sum + entry.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...parts, ...(central as BlobPart[]), end as BlobPart], {
    type: "application/zip",
  });
}
