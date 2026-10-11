"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
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
  const showSideNav = hasDesktopSideNav(pathname, lang);
  // Explore (desktop's "Browse"). Not the For You feed — re-tapping its nav
  // tab already scrolls it to the top.
  const hasBackToTop = pathname.startsWith(`/${lang}/explore`);

  // PDPs are standalone document routes. Bypass any stale parallel-route state
  // when an in-app listing link is clicked so the actual page always mounts.
  useEffect(() => {
    function openListingDocument(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("download")
      ) return;

      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        !url.pathname.startsWith(`/${lang}/content/`)
      ) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(url.href);
    }

    document.addEventListener("click", openListingDocument, true);
    return () => document.removeEventListener("click", openListingDocument, true);
  }, [lang]);

  usePreloadInbox();

  return (
    <>
      <div
        className={[
          "flex min-h-svh flex-col bg-app",
          "mx-auto",
          isImmersiveCreate
            ? "md:mx-0 md:ml-0 md:max-w-none"
            : showSideNav
              ? "desktop-app-frame desktop-app-frame--with-sidebar md:pt-(--desktop-top-nav-height,68px)"
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
          {children}
        </main>
      </div>

      <BottomNav lang={lang} />
      {/* Away while a screen owns the bottom of the viewport (Ask Shopi's
          input, full-screen flows) — the same signal that hides the nav. */}
      {hasBackToTop && <BackToTopButton hidden={bottomNavHidden} />}
    </>
  );
}
