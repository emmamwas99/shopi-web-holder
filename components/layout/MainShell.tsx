"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useLayoutEffect, useState } from "react";
import { BottomNav, shouldHideBottomNav } from "@/components/layout/BottomNav";
import { BackToTopButton } from "@/components/layout/BackToTopButton";
import { hasDesktopSideNav } from "@/components/layout/SideNav";
import { usePreloadInbox } from "@/features/notifications/hooks/usePreloadInbox";
import { useUiStore } from "@/stores/ui";

export function MainShell({
  children,
  lang,
}: {
  children: ReactNode;
  lang: string;
}) {
  const pathname = usePathname();
  const bottomNavHidden = useUiStore((s) => s.bottomNavHidden);
  // Reserve no space for the nav when it's route-hidden OR class-hidden by a
  // full-viewport screen (e.g. the create-mode chooser) — otherwise the hidden
  // nav's padding leaves an empty gap under that screen's own footer.
  const hideBottomNav = shouldHideBottomNav(pathname) || bottomNavHidden;
  const isImmersiveCreate =
    pathname.includes("/upload/create") ||
    pathname.includes("/upload/tiktok");
  // Explore and the profile root/section tabs have long pages. The For You feed
  // already scrolls to the top when its nav tab is tapped again.
  const hasBackToTop =
    pathname.startsWith(`/${lang}/explore`) ||
    pathname.replace(/\/$/, "") === `/${lang}/profile`;
  const isProfileRoot = pathname.replace(/\/$/, "") === `/${lang}/profile`;
  // Only the desktop sidebar's padding depends on the query string (a
  // `?category=` filter on Explore/Search). Reading it takes useSearchParams,
  // which needs a Suspense boundary on the statically prerendered routes, so
  // the reader sits in a boundary of its own and reports up. Wrapping the page
  // itself in that boundary — with the page as the fallback, so prerendered
  // HTML kept its content — made React stream every app page twice: once as
  // the fallback and once in a hidden segment, i.e. two H1s and two copies of
  // every JSON-LD block in the HTML crawlers read.
  const [hasCategoryParam, setHasCategoryParam] = useState(false);
  const showSideNav = hasDesktopSideNav(pathname, lang, hasCategoryParam);

  usePreloadInbox();

  return (
    <>
      <div
        className={[
          "flex min-h-svh flex-col bg-app",
          "mx-auto",
          isImmersiveCreate
            ? "md:mx-0 md:ml-0 md:max-w-none"
            : "desktop-app-frame md:pt-(--desktop-top-nav-height,68px)",
        ].join(" ")}
      >
        {/* The bottom padding clears the fixed BottomNav, which is md:hidden —
            so drop it on md+ too. Leaving it creates dead scroll space below
            the page content, and scrolling into that space pushes desktop
            sticky elements (feed tabs, right rail) up out of the viewport. */}
        <main
          className={`flex-1 ${
            hideBottomNav
              ? ""
              : "pb-[calc(var(--nav-height,0)+var(--safe-bottom,0))] md:pb-0"
          }`}
        >
          <Suspense fallback={null}>
            <CategoryParamWatcher onChange={setHasCategoryParam} />
          </Suspense>
          <div className={showSideNav ? "desktop-app-frame--with-sidebar" : undefined}>
            {children}
          </div>
        </main>
      </div>

      <BottomNav lang={lang} />
      {/* Away while a screen owns the bottom of the viewport (Ask Shopi's
          input, full-screen flows) — the same signal that hides the nav. */}
      {hasBackToTop && (
        <BackToTopButton hidden={bottomNavHidden && !isProfileRoot} />
      )}
    </>
  );
}

// Layout effect so the padding lands in the same frame as a client-side
// category change. A direct load of /explore?category=… gets it at hydration,
// together with the desktop SideNav itself, which also renders client-side.
function CategoryParamWatcher({
  onChange,
}: {
  onChange: (hasCategory: boolean) => void;
}) {
  const hasCategory = Boolean(useSearchParams().get("category"));
  useLayoutEffect(() => {
    onChange(hasCategory);
  }, [hasCategory, onChange]);
  return null;
}
