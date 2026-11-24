import { preload } from "react-dom";
import { ArrowRight, BadgeCheck, Check, Clapperboard, Link2, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TikTokIcon } from "@/components/ui/TikTokIcon";
import { TrackedHomepageLink } from "@/components/analytics/TrackedHomepageLink";
import { VideoShowcasePlayer, type VideoShowcaseCopy } from "./VideoShowcasePlayer";

/**
 * Homepage: Shopi takes video listings, and reuses a seller's TikToks from a
 * pasted link. Most marketplaces stop at photos, so it sits right under the
 * hero. Right under it, it's often on screen at load, so it has no scroll-in
 * animation: it's simply there (see Reveal's note on above-the-fold content).
 *
 * The phone plays one real listing (picked by hand: a clean, 22-second
 * product clip whose last frame meets its first, so the loop is seamless).
 * If that listing is ever removed, swap SHOWCASE for another video listing:
 * the playback ID is on its Mux media, the slug in its URL, and the copy's
 * `player` block carries its seller, title and price.
 */
const SHOWCASE = {
  playbackId: "PuLL9AMpi1c4QGpY2Ho4LuSOoAOQEdwYE8boOv39fVM",
  slug: "marshall-willen-ii-portable-bluetooth-speaker-6",
} as const;

export type HomeVideoCopy = {
  eyebrow: string;
  title: string;
  body: string;
  points: readonly { readonly title: string; readonly body: string }[];
  cta: string;
  tiktokCta: string;
  /** The phone button's label: half a row wide. */
  tiktokCtaShort: string;
  chip: string;
  importLink: string;
  imported: string;
  importReady: string;
  player: VideoShowcaseCopy;
};

const POINT_ICONS: (LucideIcon | typeof TikTokIcon)[] = [Clapperboard, TikTokIcon, BadgeCheck];

export function HomeVideoShowcase({ lang, t }: { lang: string; t: HomeVideoCopy }) {
  // Warm the path to the first frame while the page is still parsing: the HLS
  // manifest the player asks for first (which also opens the connection to
  // Mux's stream host) and the still that stands in until it plays. Both are
  // small; the video chunks load only once the section nears the screen.
  preload(`https://stream.mux.com/${SHOWCASE.playbackId}.m3u8`, {
    as: "fetch",
    crossOrigin: "anonymous",
    fetchPriority: "low",
  });
  preload(`https://image.mux.com/${SHOWCASE.playbackId}/thumbnail.webp?time=0&width=540`, {
    as: "image",
    fetchPriority: "low",
  });

  return (
    <section
      id="video-listings"
      aria-labelledby="video-title"
      className="relative overflow-hidden px-4 pb-10 pt-8 max-md:bg-linear-to-b max-md:from-primary/[0.05] max-md:via-primary/[0.025] max-md:to-transparent md:px-8 md:py-24"
    >
      {/* A soft brand wash behind the phone, so the section reads as its own. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_75%_45%,rgb(var(--brand-primary)/0.12),transparent_70%)] max-md:bg-[radial-gradient(80%_40%_at_50%_75%,rgb(var(--brand-primary)/0.12),transparent_70%)]"
      />

      {/* Three blocks: pitch, phone, details. Phones stack them in that order,
          so the video comes straight after the headline; from md the phone
          takes the right column beside both. */}
      <div className="relative mx-auto grid max-w-7xl gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-x-16 md:gap-y-8">
        <div className="max-w-xl md:self-end">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary-strong">
            <Clapperboard className="size-4" aria-hidden />
            {t.eyebrow}
          </p>
          <h2
            id="video-title"
            className="font-display text-[1.625rem] font-medium leading-[1.15] md:text-[3.25rem] md:font-semibold md:leading-tight"
          >
            {/* A sentence per line, like the hero's headline. */}
            {t.title.split(/(?<=\.)\s+/).map((sentence, i) => (
              <span key={sentence} className="block">
                {i > 0 ? " " : null}
                {sentence}
              </span>
            ))}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-landing-body md:text-lg">{t.body}</p>
        </div>

        <div className="relative mx-auto w-full max-w-md px-6 sm:px-10 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
          <VideoShowcasePlayer
            playbackId={SHOWCASE.playbackId}
            href={`/${lang}/video/${SHOWCASE.slug}`}
            copy={t.player}
          />

          {/* Where it shows up. */}
          <span className="absolute right-0 top-[24%] z-10 hidden items-center gap-1.5 rounded-full bg-landing-card px-3.5 py-2 text-xs font-semibold text-landing-ink shadow-[0_12px_30px_-14px_rgb(0_0_0/0.35)] ring-1 ring-landing-line sm:inline-flex md:-right-4">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            {t.chip}
          </span>

          {/* The TikTok import, as the seller sees it: paste a link, done.
              Illustrative and decorative; the copy beside says it in words. */}
          <div
            aria-hidden
            className="absolute -left-1 top-[42%] z-10 w-[15.5rem] rounded-2xl bg-landing-card p-3 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.4)] ring-1 ring-landing-line sm:-left-4 md:-left-10"
          >
            <div className="flex items-center gap-2 rounded-xl bg-landing-surface px-2.5 py-2 text-xs text-landing-body">
              <Link2 className="size-3.5 shrink-0 text-landing-muted" />
              <span className="truncate">{t.importLink}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5 px-1">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral-950 text-white">
                <TikTokIcon size={15} />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-semibold text-landing-ink">
                  {t.imported}
                  <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
                </p>
                <p className="truncate text-xs text-landing-muted">{t.importReady}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-xl md:self-start">
          <ul className="grid list-none gap-4 p-0">
            {t.points.map((point, i) => {
              const Icon = POINT_ICONS[i] ?? Check;
              return (
                <li key={point.title} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-landing-card text-primary shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-landing-line">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-landing-ink">{point.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-landing-body">{point.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Phones: two equal, plain buttons side by side, like the hero's.
              From md: the pill pair with icons. */}
          <div className="mt-8 grid grid-cols-2 gap-2.5 md:mt-9 md:flex md:flex-wrap md:gap-3">
            <TrackedHomepageLink
              href={`/${lang}/upload`}
              buttonId="post_video"
              placement="video_section"
              className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-[0.9375rem] font-semibold text-white no-underline active:bg-primary-strong md:rounded-full md:px-6 md:text-base md:shadow-[0_10px_24px_-12px_rgb(var(--brand-primary)/0.8)] md:transition-colors md:hover:bg-primary-strong"
            >
              <Plus className="hidden size-4.5 md:block" strokeWidth={2.5} aria-hidden />
              <span className="truncate">{t.cta}</span>
            </TrackedHomepageLink>
            <TrackedHomepageLink
              href={`/${lang}/upload/tiktok`}
              buttonId="import_tiktok"
              placement="video_section"
              className="group flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-landing-card px-3 text-[0.9375rem] font-semibold text-landing-ink no-underline ring-1 ring-landing-line-strong active:bg-primary/[0.07] md:rounded-full md:px-6 md:text-base md:ring-landing-line md:transition-colors md:hover:ring-primary/40"
            >
              <TikTokIcon size={18} aria-hidden className="hidden md:block" />
              <span className="truncate md:hidden">{t.tiktokCtaShort}</span>
              <span className="hidden md:inline">{t.tiktokCta}</span>
              <ArrowRight
                className="hidden size-4 transition-transform! duration-200! group-hover:translate-x-0.5 md:block"
                aria-hidden
              />
            </TrackedHomepageLink>
          </div>
        </div>

      </div>
    </section>
  );
}
