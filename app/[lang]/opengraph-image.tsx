import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { isValidLocale, type Locale } from "@/i18n/config";
import { ogJpegResponse } from "@/lib/og-image";

// Node runtime so we can read the photos, logo and fonts from the public folder.
export const runtime = "nodejs";
export const alt =
  "Shopi, Kenya's free marketplace: a video listing playing on a phone beside a seller's listings, with a buyer asking if an item is still available. Free to post, 0% commission.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

// The homepage's own colours (globals.css --brand-primary, --landing-*), so
// the card looks like the page the link opens.
const PINK = "#d81470";
const INK = "#172226";
const BODY = "#465458";
const MUTED = "#566467";

/**
 * The site-wide share card, drawn from the homepage it links to.
 *
 * Left, the hero: the headline and the three promises. Centre, the phone
 * from the video section, showing a real video listing (the same one the
 * homepage plays). Right, the hero's listings board, with the buyer's
 * question and the TikTok import beneath it.
 *
 * The phone sits dead centre on purpose: WhatsApp, where most Shopi links
 * are shared, can crop the preview to a centred square, and the phone with
 * its price reads on its own.
 *
 * Images live in public/assets/og, pre-cropped to their boxes at 1.5× and
 * saved as baseline JPEG (satori decodes PNG and JPEG only):
 * - video-still.jpg: the first frame of the Marshall Willen II listing video
 *   (Mux playback PuLL9AMpi1c4QGpY2Ho4LuSOoAOQEdwYE8boOv39fVM; see
 *   components/landing/HomeVideoShowcase.tsx).
 * - board-*.jpg: the Unsplash photos HeroListingsBoard uses (free for
 *   commercial use).
 */
type Row = { title: string; price: string; status: string; photo: string; pill: { bg: string; fg: string } };

const COPY: Record<
  Locale,
  {
    headline: [string, string];
    pills: [string, string, string];
    boardTitle: string;
    boardPeriod: string;
    boardActive: string;
    chip: string;
    rows: { title: string; price: string; status: string }[];
    message: string;
    imported: string;
    videoBadge: string;
  }
> = {
  en: {
    headline: ["Kenya's free marketplace.", "Buy and sell near you."],
    pills: ["Free to post", "0% commission", "Video listings"],
    boardTitle: "Your listings",
    boardPeriod: "Today",
    boardActive: "3 active",
    chip: "0% commission",
    rows: [
      { title: "iPhone X, 64GB", price: "KES 28,000", status: "New chat" },
      { title: "3-seater sofa", price: "KES 45,000", status: "Sold" },
      { title: "Cotton T-shirts", price: "KES 800 each", status: "Saved" },
    ],
    message: "Hi, is it still available?",
    imported: "Video imported from TikTok",
    videoBadge: "Video",
  },
  sw: {
    headline: ["Soko la bure Kenya.", "Nunua na uza karibu nawe."],
    pills: ["Bure kuweka", "Kamisheni 0%", "Matangazo ya video"],
    boardTitle: "Matangazo yako",
    boardPeriod: "Leo",
    boardActive: "3 hai",
    chip: "Kamisheni 0%",
    rows: [
      // Shorter than the English row: "Ujumbe mpya" needs the room.
      { title: "iPhone X", price: "KES 28,000", status: "Ujumbe mpya" },
      { title: "Sofa ya viti 3", price: "KES 45,000", status: "Imeuzwa" },
      { title: "T-shati", price: "KES 800", status: "Imehifadhiwa" },
    ],
    message: "Habari, bado inapatikana?",
    imported: "Video imeletwa kutoka TikTok",
    videoBadge: "Video",
  },
};

const ROW_STYLE = [
  { photo: "board-phone.jpg", pill: { bg: PINK, fg: "#ffffff" } },
  { photo: "board-sofa.jpg", pill: { bg: "#d1fae5", fg: "#065f46" } },
  { photo: "board-tshirts.jpg", pill: { bg: "#fef3c7", fg: "#92400e" } },
];

const PHONE = { width: 260, height: 540, pad: 9 };
const SCREEN = { width: PHONE.width - PHONE.pad * 2, height: PHONE.height - PHONE.pad * 2 };

async function publicFile(path: string) {
  return readFile(join(process.cwd(), "public", path));
}

async function dataUri(path: string, mime: string) {
  return `data:${mime};base64,${(await publicFile(path)).toString("base64")}`;
}

function TikTokMark({ size: s, color }: { size: number; color: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <path d="M16.5 5.82a4.78 4.78 0 0 1-2.9-3.32.5.5 0 0 0-.49-.42h-2.4a.5.5 0 0 0-.5.5v10.94a2.12 2.12 0 1 1-2.95-1.95.5.5 0 0 0 .3-.46V8.2a.5.5 0 0 0-.6-.49 5.52 5.52 0 1 0 6.7 5.4V8.93a7.6 7.6 0 0 0 3.43.94.5.5 0 0 0 .51-.5V6.4a.5.5 0 0 0-.42-.49 4.8 4.8 0 0 1-.18-.04Z" />
    </svg>
  );
}

function Check({ color, s = 14 }: { color: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const card = {
  background: "#ffffff",
  borderRadius: 24,
  boxShadow: "0 18px 40px rgba(23,34,38,0.16)",
  border: "1px solid #ece3e7",
} as const;

export default async function OgImage({
  params,
}: {
  // Next 16 hands metadata image routes an async params object.
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = COPY[isValidLocale(lang) ? lang : "en"];

  const [logo, still, ...thumbs] = await Promise.all([
    dataUri("assets/shopi-logo.png", "image/png"),
    dataUri("assets/og/video-still.jpg", "image/jpeg"),
    ...ROW_STYLE.map((row) => dataUri(`assets/og/${row.photo}`, "image/jpeg")),
  ]);
  const [bold, semibold, medium] = await Promise.all([
    publicFile("fonts/Poppins-Bold.ttf"),
    publicFile("fonts/Poppins-SemiBold.ttf"),
    publicFile("fonts/Poppins-Medium.ttf"),
  ]);
  const rows: Row[] = t.rows.map((row, i) => ({ ...row, photo: thumbs[i], pill: ROW_STYLE[i].pill }));

  const rendered = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #fff8fb 0%, #fdeef4 55%, #fbe3ee 100%)",
        color: INK,
        fontFamily: "Poppins",
      }}
    >
      {/* The hero's two soft discs. */}
      <div style={{ display: "flex", position: "absolute", left: -180, top: -200, width: 720, height: 720, borderRadius: 999, background: "rgba(255,255,255,0.55)" }} />
      <div style={{ display: "flex", position: "absolute", left: 560, top: 250, width: 820, height: 820, borderRadius: 999, background: "rgba(216,20,112,0.06)" }} />

      {/* Left: the hero */}
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 56, top: 50, width: 400, height: 530 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="" width={52} height={52} style={{ borderRadius: 14 }} />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Shopi</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 38, fontSize: 50, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1.2 }}>
          <div style={{ display: "flex" }}>{t.headline[0]}</div>
          <div style={{ display: "flex", marginTop: 6, color: PINK }}>{t.headline[1]}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 30 }}>
          {t.pills.map((pill) => (
            <div key={pill} style={{ display: "flex", alignItems: "center", gap: 8, background: "#ffffff", border: "1px solid #ead7df", borderRadius: 999, padding: "8px 16px 8px 9px", fontSize: 19, fontWeight: 500, color: BODY }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 999, background: PINK }}>
                <Check color="#ffffff" />
              </div>
              {pill}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 26, fontWeight: 600, color: PINK }}>shopi.co.ke</div>
      </div>

      {/* Centre: the video listing, dead centre for square crops */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 600 - PHONE.width / 2,
          top: 45,
          width: PHONE.width,
          height: PHONE.height,
          padding: PHONE.pad,
          borderRadius: 42,
          background: "#0d0d10",
          boxShadow: "0 30px 60px rgba(216,20,112,0.30), 0 14px 30px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", position: "relative", width: SCREEN.width, height: SCREEN.height, borderRadius: 33, overflow: "hidden" }}>
          <img src={still} alt="" width={SCREEN.width} height={SCREEN.height} />
          {/* Feed chrome, as the homepage's phone draws it */}
          <div style={{ display: "flex", position: "absolute", left: 0, right: 0, top: 0, alignItems: "center", gap: 8, padding: "14px 14px 40px", background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 999, background: "rgba(255,255,255,0.92)", color: "#111", fontSize: 14, fontWeight: 700 }}>D</div>
            <div style={{ display: "flex", color: "#ffffff", fontSize: 15, fontWeight: 600 }}>daytechaccessories</div>
          </div>
          <div style={{ display: "flex", position: "absolute", right: 14, top: 58, alignItems: "center", gap: 5, background: PINK, color: "#ffffff", fontSize: 14, fontWeight: 600, padding: "5px 11px", borderRadius: 999 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#ffffff"><path d="M6 4l14 8-14 8z" /></svg>
            {t.videoBadge}
          </div>
          <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 0, right: 0, bottom: 0, padding: "70px 16px 18px", background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.35) 60%, rgba(0,0,0,0))" }}>
            <div style={{ display: "flex", color: "#ffffff", fontSize: 30, fontWeight: 700, lineHeight: 1 }}>KES 24,999</div>
            <div style={{ display: "flex", marginTop: 6, color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: 500 }}>Marshall Willen II Speaker</div>
          </div>
        </div>
      </div>

      {/* Right: the listings board */}
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 762, top: 82, width: 392, padding: 12, ...card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 12px" }}>
          <div style={{ display: "flex", fontSize: 19, fontWeight: 600 }}>{t.boardTitle}</div>
          <div style={{ display: "flex", fontSize: 15, fontWeight: 500, color: MUTED }}>· {t.boardPeriod}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", fontSize: 14, fontWeight: 600, padding: "3px 10px", borderRadius: 999 }}>
            <div style={{ display: "flex", width: 7, height: 7, borderRadius: 999, background: "#10b981" }} />
            {t.boardActive}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#f4f8f7", borderRadius: 18, padding: 8 }}>
          {rows.map((row, i) => (
            <div key={row.title} style={{ display: "flex", alignItems: "center", gap: 12, background: "#ffffff", borderRadius: 14, padding: "9px 10px", border: i === 0 ? "1px solid rgba(216,20,112,0.3)" : "1px solid #edf1f0" }}>
              <img src={row.photo} alt="" width={56} height={56} style={{ borderRadius: 12 }} />
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
                <div style={{ display: "flex", fontSize: 17, fontWeight: 600 }}>{row.title}</div>
                <div style={{ display: "flex", fontSize: 15, fontWeight: 500, color: BODY }}>{row.price}</div>
              </div>
              <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap", background: row.pill.bg, color: row.pill.fg, fontSize: 14, fontWeight: 600, padding: "6px 12px", borderRadius: 999 }}>{row.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* "0% commission", over the board's top edge */}
      <div style={{ display: "flex", position: "absolute", right: 64, top: 58, alignItems: "center", gap: 8, background: "#ffffff", border: "1px solid #ead7df", borderRadius: 999, padding: "7px 16px", fontSize: 16, fontWeight: 600, boxShadow: "0 10px 24px rgba(23,34,38,0.14)" }}>
        <div style={{ display: "flex", color: PINK, fontSize: 18, fontWeight: 700 }}>%</div>
        {t.chip}
      </div>

      {/* The buyer's question, tucked against the phone */}
      <div style={{ display: "flex", position: "absolute", left: 708, top: 418, alignItems: "center", gap: 12, padding: "12px 18px 12px 12px", ...card, borderRadius: "22px 22px 22px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 999, background: "#e0f2fe", color: "#075985", fontSize: 15, fontWeight: 700 }}>BO</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: MUTED }}>Brian O.</div>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 500 }}>{t.message}</div>
        </div>
      </div>

      {/* The TikTok import */}
      <div style={{ display: "flex", position: "absolute", left: 790, top: 512, alignItems: "center", gap: 12, padding: "10px 18px 10px 10px", ...card, borderRadius: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 999, background: "#0d0d10" }}>
          <TikTokMark size={20} color="#ffffff" />
        </div>
        <div style={{ display: "flex", fontSize: 17, fontWeight: 600 }}>{t.imported}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: "#d1fae5" }}>
          <Check color="#047857" s={13} />
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Poppins", data: bold, weight: 700, style: "normal" },
        { name: "Poppins", data: semibold, weight: 600, style: "normal" },
        { name: "Poppins", data: medium, weight: 500, style: "normal" },
      ],
    },
  );

  // Photographs and gradients, so JPEG — see ogJpegResponse.
  return ogJpegResponse(rendered);
}
