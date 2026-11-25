import Image from "next/image";
import {
  BadgePercent,
  Bookmark,
  Check,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * The desktop hero's picture: a seller's listings and what buyers are doing
 * with them, drawn in HTML rather than shipped as an illustration. It shows
 * the whole loop at a glance: post it, a buyer messages you, it sells.
 *
 * Decorative and static: a server component with no JavaScript, hidden from
 * assistive tech (the H1 and body beside it say the same thing in words).
 * Names, items and prices are illustrative and match the stock photos.
 */
export type HeroBoardCopy = {
  title: string;
  period: string;
  active: string;
  buyer: string;
  listing: string;
  status: string;
  chip: string;
  rows: readonly {
    readonly name: string;
    readonly place: string;
    readonly title: string;
    readonly price: string;
    readonly status: string;
  }[];
  message: string;
  messageTime: string;
};

/**
 * Unsplash stock photos, kept in public/assets/landing as 96px WebP (the tiles
 * are 48px, so 2x screens stay sharp). Hosting them here saves a connection
 * to a third origin, and Unsplash's own copies were JPEG for any client that
 * didn't ask for WebP, with an ICC profile making up ~40% of the bytes.
 */
const photo = (name: string) => `/assets/landing/${name}.webp`;

/** Per-row visuals, in the same order as `copy.rows`. */
const ROWS: {
  photo: string;
  initials: string;
  avatar: string;
  icon: LucideIcon;
  /** The status pill: each state its own colour, readable in both themes. */
  pill: string;
}[] = [
  {
    photo: photo("board-phone"),
    initials: "BO",
    avatar: "bg-sky-100 text-sky-800 dark:bg-sky-400/20 dark:text-sky-200",
    icon: MessageCircle,
    pill: "bg-primary text-white",
  },
  {
    photo: photo("board-sofa"),
    initials: "WM",
    avatar: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
    icon: Check,
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  {
    photo: photo("board-tshirts"),
    initials: "AK",
    avatar: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200",
    icon: Bookmark,
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  },
];

// One grid for the header and every row (each row is a subgrid), so the
// status column fits its longest label — Swahili ones run longer — and the
// columns still line up from row to row. Phones drop the buyer column (the
// chat bubble below still names the buyer): three columns don't fit 360px.
const ROW = "col-span-2 grid grid-cols-subgrid items-center sm:col-span-3";

export function HeroListingsBoard({ copy }: { copy: HeroBoardCopy }) {
  return (
    <div aria-hidden className="relative mx-auto mb-12 w-full max-w-xl select-none xl:max-w-none">
      <div className="absolute -top-5 right-3 z-10 flex items-center gap-1.5 rounded-full bg-landing-card px-3 py-1.5 text-xs font-semibold sm:-top-4 sm:right-6 sm:gap-2 sm:px-4 sm:py-2 sm:text-[0.875rem] text-landing-ink shadow-[0_12px_30px_-14px_rgb(0_0_0/0.35)] ring-1 ring-landing-line">
        <BadgePercent className="size-[1.125rem] text-primary" strokeWidth={2.2} />
        {copy.chip}
      </div>

      <div className="rounded-[1.75rem] bg-landing-card p-2 shadow-[0_40px_80px_-36px_rgb(var(--brand-primary)/0.45),0_12px_28px_-18px_rgb(0_0_0/0.25)] ring-1 ring-landing-line">
        {/* Header: what this is, and how much of it is live. Left-aligned so
            the commission chip can sit over the right side. */}
        <div className="flex items-center gap-3 px-4 pb-2.5 pt-3.5">
          <p className="font-display text-[1.0625rem] font-semibold leading-tight text-landing-ink">
            {copy.title}
            <span className="ml-2 hidden text-sm font-medium text-landing-muted sm:inline">· {copy.period}</span>
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {copy.active}
          </span>
        </div>

        <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)_auto] gap-x-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-y-1.5 rounded-[1.25rem] bg-landing-surface p-1.5 pb-2 dark:bg-white/[0.03]">
          <li className={`${ROW} px-3 pb-0.5 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-landing-muted`}>
            <span className="hidden sm:block">{copy.buyer}</span>
            <span>{copy.listing}</span>
            <span>{copy.status}</span>
          </li>
          {copy.rows.map((row, i) => {
            const { photo: src, initials, avatar, icon: Icon, pill } = ROWS[i];
            const unread = i === 0;
            return (
              <li
                key={row.title}
                className={`${ROW} rounded-2xl bg-landing-card px-3 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)] ${
                  unread ? "ring-1 ring-primary/25" : ""
                }`}
              >
                <div className="hidden min-w-0 items-center gap-3 sm:flex">
                  <span
                    className={`relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${avatar}`}
                  >
                    {initials}
                    {unread && (
                      <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-primary ring-2 ring-landing-card" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight text-landing-ink">
                      {row.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-landing-muted">{row.place}</p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-landing-tint">
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight text-landing-ink">
                      {row.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium tabular-nums text-landing-body">
                      {row.price}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${pill}`}
                >
                  <Icon className="size-3.5 shrink-0" strokeWidth={2.5} />
                  {row.status}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The buyer's message, as a chat bubble. */}
      <div className="absolute -bottom-12 left-2 z-10 flex items-center gap-3 rounded-2xl rounded-bl-md bg-landing-card py-3 pl-3 pr-5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)] ring-1 ring-landing-line md:-left-4 xl:-left-8">
        <span
          className={`relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${ROWS[0].avatar}`}
        >
          {ROWS[0].initials}
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-landing-card" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight text-landing-ink">
            {copy.rows[0].name}{" "}
            <span className="font-normal text-landing-muted">· {copy.messageTime}</span>
          </p>
          <p className="mt-0.5 text-[0.9375rem] leading-snug text-landing-body">{copy.message}</p>
        </div>
      </div>
    </div>
  );
}
