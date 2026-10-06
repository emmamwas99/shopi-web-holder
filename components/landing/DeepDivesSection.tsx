import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/getDictionary";
import { ChatMockup, FeedMockup, SellMockup } from "./mockups";
import { Pill } from "./Pill";

/**
 * Sell → find → talk. The mockup does the explaining; the copy is a
 * headline, a three-beat line and one fact. A swipeable row of cards on
 * phones, alternating media/text rows from md up.
 *
 * The section carries #how-it-works (nav + footer anchor) and each row keeps
 * the id the footer links to: #creators, #dive-feed, #dive-chat.
 */
export function DeepDivesSection({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const t = dict.landing.dives;

  const dives = [
    {
      id: "creators",
      copy: t.sell,
      mockup: <SellMockup />,
      tint: "bg-[rgb(var(--brand-highlight)/0.10)]",
      cta: { label: t.sell.cta, href: `/${lang}/upload` },
    },
    {
      id: "dive-feed",
      copy: t.feed,
      mockup: <FeedMockup />,
      tint: "bg-[rgb(var(--brand-primary)/0.07)]",
      cta: { label: t.feed.cta, href: `/${lang}/for-you` },
    },
    {
      // The deal happens in chat, so there is nothing to click through to
      // here — the rows either side already carry the sell and browse CTAs.
      id: "dive-chat",
      copy: t.chat,
      mockup: <ChatMockup />,
      tint: "bg-[rgb(var(--brand-accent)/0.07)]",
      cta: null,
    },
  ];

  // Phones: one swipeable row of cards (mockup on top, copy below), like an
  // app's onboarding — one screen instead of three. From md up: the
  // alternating media/text rows.
  return (
    <section id="how-it-works" className="py-2 md:px-(--landing-page-x) md:py-0">
      <div className="mb-3 flex items-baseline justify-between px-(--landing-page-x) md:hidden">
        <p className="font-display text-[1.375rem] font-bold leading-tight text-foreground">
          {t.heading}
        </p>
        <p aria-hidden className="text-xs font-semibold text-muted">
          {t.swipe} →
        </p>
      </div>
      <div
        role="region"
        aria-label={t.heading}
        tabIndex={0}
        className="mx-auto flex max-w-(--landing-page-max) snap-x snap-mandatory scroll-px-(--landing-page-x) gap-3 overflow-x-auto px-(--landing-page-x) pb-2 scrollbar-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:snap-none md:scroll-px-0 md:flex-col md:gap-14 md:overflow-visible md:px-0 md:pb-0 md:focus-visible:ring-0"
      >
        {dives.map(({ id, copy, mockup, tint, cta }, i) => (
          <article
            key={id}
            id={id}
            className="flex w-[84%] max-w-90 shrink-0 snap-start flex-col overflow-hidden max-md:rounded-3xl max-md:border max-md:border-border max-md:bg-[rgb(var(--color-bg-elevated))] md:grid md:w-auto md:max-w-none md:grid-cols-2 md:items-center md:gap-16 md:overflow-visible md:py-10"
          >
            {/* Media on a tinted canvas */}
            <div
              className={`flex justify-center px-6 pt-6 pb-5 md:rounded-3xl md:p-14 ${tint} ${
                i % 2 === 1 ? "md:order-2" : ""
              }`}
            >
              <div className="flex w-full max-w-65 justify-center md:max-w-none">
                {mockup}
              </div>
            </div>

            {/* Copy */}
            <div className="flex flex-1 flex-col p-4 md:block md:p-0">
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted md:text-sm">
                {copy.eyebrow}
              </p>
              <h2 className="mt-1.5 max-w-md text-balance font-display text-[1.25rem] font-bold leading-tight tracking-normal text-default md:mt-3 md:text-[clamp(1.6rem,3vw,2.4rem)]">
                {copy.title}
              </h2>
              <p className="mt-1 max-w-lg text-[0.9375rem] font-medium text-muted md:mt-4 md:text-xl">
                {copy.body}
              </p>
              <p className="mt-3 flex items-start gap-2 text-[0.8125rem] leading-normal text-default md:mt-6 md:gap-2.5 md:text-sm">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-primary md:size-4.5"
                  strokeWidth={2.5}
                />
                {copy.note}
              </p>
              {cta && (
                <div className="mt-auto pt-4 md:mt-8 md:flex md:flex-wrap md:gap-3 md:pt-0">
                  {/* Outlined on phones: the sticky action bar is on screen
                      here and owns the one filled button. Styled with max-md:
                      because the outline variant's classes are unlayered CSS
                      that a md: override can't beat. */}
                  <Pill
                    href={cta.href}
                    className="h-11 w-full bg-primary py-0 text-white hover:opacity-90 max-md:border max-md:border-border max-md:bg-transparent max-md:text-foreground md:h-auto md:w-auto md:py-3"
                  >
                    {cta.label}
                  </Pill>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
