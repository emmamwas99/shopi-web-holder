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

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=160&h=160&q=70`;

/** Per-row visuals, in the same order as `copy.rows`. */
const ROWS: {
  photo: string;
  initials: string;
  tone: string;
  icon: LucideIcon;
}[] = [
  {
    photo: photo("photo-1511707171634-5f897ff02aa9"),
    initials: "BO",
    tone: "bg-sky-100 text-sky-800 dark:bg-sky-400/20 dark:text-sky-200",
    icon: MessageCircle,
  },
  {
    photo: photo("photo-1555041469-a586c61ea9bc"),
    initials: "WM",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
    icon: Check,
  },
  {
    photo: photo("photo-1523381210434-271e8be1f52b"),
    initials: "AK",
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200",
    icon: Bookmark,
  },
];

// One grid for the header and every row (each row is a subgrid), so the
// status column fits its longest label — Swahili ones run longer — and the
// columns still line up from row to row.
const ROW = "col-span-3 grid grid-cols-subgrid items-center";

export function HeroListingsBoard({ copy }: { copy: HeroBoardCopy }) {
  return (
    <div aria-hidden className="relative mx-auto mb-14 w-full max-w-xl select-none xl:max-w-none">
      <div className="absolute -top-5 right-6 z-10 flex items-center gap-2 rounded-xl bg-landing-card px-4 py-2.5 text-[0.9375rem] font-semibold text-landing-ink shadow-lg ring-1 ring-landing-line">
        <BadgePercent className="size-5 text-primary" strokeWidth={2} />
        {copy.chip}
      </div>

      <div className="rounded-[1.5rem] bg-landing-card/60 p-2 pb-5 shadow-[0_32px_64px_-32px_rgb(var(--brand-primary)/0.35)] ring-1 ring-landing-line/70 backdrop-blur-sm">
        <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-x-3 gap-y-2 p-0">
          <li className={`${ROW} px-3 pb-0.5 pt-5 text-sm font-medium text-landing-muted`}>
            <span>{copy.buyer}</span>
            <span>{copy.listing}</span>
            <span>{copy.status}</span>
          </li>
          {copy.rows.map((row, i) => {
            const { photo: src, initials, tone, icon: Icon } = ROWS[i];
            return (
              <li
                key={row.title}
                className={`${ROW} rounded-2xl bg-landing-card px-3 py-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${tone}`}
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight text-landing-ink">
                      {row.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-landing-muted">
                      {row.place}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-landing-surface">
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="44px"
                      quality={60}
                      className="object-cover"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight text-landing-ink">
                      {row.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm tabular-nums text-landing-muted">
                      {row.price}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm font-semibold text-primary-strong dark:bg-primary/20 dark:text-[#ff7ab6]">
                  <Icon className="size-4 shrink-0" strokeWidth={2.25} />
                  {row.status}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="absolute -bottom-14 -left-4 z-10 flex items-center gap-3 rounded-2xl bg-landing-card py-3 pl-3 pr-5 shadow-lg ring-1 ring-landing-line xl:-left-8">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${ROWS[0].tone}`}
        >
          {ROWS[0].initials}
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight text-landing-ink">
            {copy.rows[0].name}{" "}
            <span className="font-normal text-landing-muted">· {copy.messageTime}</span>
          </p>
          <p className="mt-0.5 text-[0.9375rem] leading-snug text-landing-body">
            {copy.message}
          </p>
        </div>
      </div>
    </div>
  );
}
