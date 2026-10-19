"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  LayoutGrid,
  MessageCircle,
  SquarePlus,
  User,
  type LucideIcon,
} from "lucide-react";
import { useInboxUnreadCount } from "@/features/messaging/hooks/useUnreadCount";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUiStore } from "@/stores/ui";
import { useNavTabHref } from "@/lib/navTabMemory";

type Tab = {
  key: string;
  path: string; // without leading slash, e.g. "feed"
  label: string;
  icon: LucideIcon;
};

/**
 * Icon set is deliberately uniform: one weight, one size, outline only, round
 * joins. Mixing a boxy tray with a hairline house is what made the old bar look
 * assembled rather than drawn. `MessageCircle` also matches what the Inbox tab
 * actually opens on — its Messages subtab.
 */
const tabs: Tab[] = [
  {
    key: "feed",
    path: "for-you",
    label: "Home",
    icon: House,
  },
  {
    key: "explore",
    path: "explore",
    // The route stays /explore; the tab is named for its category-led view.
    label: "Categories",
    icon: LayoutGrid,
  },
  {
    key: "upload",
    path: "upload",
    label: "Sell",
    icon: SquarePlus,
  },
  {
    key: "notifications",
    path: "notifications",
    label: "Inbox",
    icon: MessageCircle,
  },
  {
    key: "profile",
    path: "profile",
    label: "Profile",
    icon: User,
  },
];

/** One size and one weight for every tab icon — active differs by colour. */
const ICON_SIZE = 24;
const STROKE_INACTIVE = 1.85;
const STROKE_ACTIVE = 2.15;

export function shouldHideBottomNav(pathname: string) {
  return (
    pathname.includes("/upload/create") ||
    pathname.includes("/upload/tiktok") ||
    pathname.includes("/content/") ||
    /^\/[^/]+\/explore\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    /\/profile\/[^/]+$/.test(pathname) ||
    /\/notifications\/[^/]+/.test(pathname)
  );
}

export function BottomNav({ lang = "en" }: { lang: string }) {
  const pathname = usePathname();
  // Hydration-safe: no badge until the persisted session has rehydrated, so
  // the first client paint matches the server HTML.
  const { hydrated } = useAuthSession();
  const liveUnreadCount = useInboxUnreadCount();
  const unreadCount = hydrated ? liveUnreadCount : 0;
  // Screens that own the full viewport (e.g. the create-mode chooser) set this
  // to hide the nav WITHOUT unmounting it — a class toggle, so there's no
  // remount flash when they appear or leave.
  const bottomNavHidden = useUiStore((s) => s.bottomNavHidden);
  // Explore and Inbox return to their last screen. Home always opens For You.
  // RouteScrollRestoration restores each tab's scroll position.
  const tabHrefs: Record<string, string> = {
    explore: useNavTabHref("explore", `/${lang}/explore`),
    notifications: useNavTabHref("notifications", `/${lang}/notifications`),
  };

  // Hide on the full create flow, content detail, creator profile, and chat detail pages
  if (shouldHideBottomNav(pathname)) return null;

  return (
    <nav
      className={`bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 md:hidden pb-(--safe-bottom) bg-elevated   ${
        bottomNavHidden ? "hidden" : ""
      }`}
    >
      <div className="relative flex h-(--nav-height) items-center justify-between border-t border-border">
        {tabs.map((tab) => {
          const href = tabHrefs[tab.key] ?? `/${lang}/${tab.path}`;
          const Icon = tab.icon;
          // Sell sits in the row like any other tab — same icon weight, same
          // label, no coloured block — but it's an action, not a tab: it has
          // no screen to return to, so it stays out of scroll restoration.
          const isUpload = tab.key === "upload";

          // Active if the pathname segment after lang matches this tab's path
          const isActive =
            tab.key === "feed"
              ? pathname === `/${lang}` ||
                pathname.startsWith(`/${lang}/for-you`) ||
                pathname.startsWith(`/${lang}/collections/`)
              : tab.key === "explore"
                ? pathname.startsWith(`/${lang}/explore`) ||
                  pathname.startsWith(`/${lang}/search`)
              : pathname.startsWith(`/${lang}/${tab.path}`);

          return (
            <Link
              key={tab.key}
              href={href}
              scroll={isUpload ? undefined : false}
              // A tab: returns to where it was left, and re-tapping it while
              // on it scrolls to the top (lib/scrollRestoration.ts).
              data-nav-tab={isUpload ? undefined : tab.key}
              className={`flex min-h-11 flex-1 select-none flex-col items-center justify-center gap-0.5 py-1 transition-colors duration-150 [-webkit-tap-highlight-color:transparent] ${
                isActive ? "text-primary dark:text-main" : "text-muted"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={`relative flex size-9 items-center justify-center rounded-full ${
                  isActive ? "dark:bg-[#3a3b3c]" : ""
                }`}
              >
                {/* Keep the outline glyphs in light mode; in dark mode the
                    active tab gets the filled icon and the charcoal marker. */}
                <Icon
                  size={ICON_SIZE}
                  strokeWidth={isActive ? STROKE_ACTIVE : STROKE_INACTIVE}
                  fill="none"
                  className={isActive ? "dark:fill-current" : undefined}
                />
                {tab.key === "notifications" && unreadCount > 0 ? (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-elevated bg-primary px-[3px] text-[9px] font-bold leading-none text-white"
                    aria-label={`${unreadCount} unread`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <p
                className={`text-[11px] leading-none ${
                  isActive
                    ? "font-semibold tracking-[0.01em]"
                    : "font-normal tracking-normal"
                }`}
              >
                {tab.label}
              </p>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
