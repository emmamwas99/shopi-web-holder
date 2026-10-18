"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { locales } from "@/i18n/config";
import { RouteScrollRestoration } from "@/components/layout/RouteScrollRestoration";
import { GlobalPushBootstrap } from "@/components/providers/GlobalPushBootstrap";
import { GlobalPushToastBridge } from "@/components/providers/GlobalPushToastBridge";
import { ApolloReconnect } from "@/components/providers/ApolloReconnect";
import { ConnectivityBanner } from "@/components/layout/ConnectivityBanner";

const ApolloWrapper = dynamic(() =>
  import("@/lib/apollo/ApolloWrapper").then((mod) => mod.ApolloWrapper),
);
const Toaster = dynamic(() =>
  import("@/components/ui/sonner").then((mod) => mod.Toaster),
);
const SessionAnalyticsTracker = dynamic(() =>
  import("@/components/providers/SessionAnalyticsTracker").then((mod) => mod.SessionAnalyticsTracker),
);

const landingPaths = new Set<string>(locales.map((locale) => `/${locale}`));

/**
 * Keep the locale homepages lightweight. They are fully server-rendered and do
 * not issue GraphQL requests or toasts, so loading Apollo/RxJS and Sonner there
 * only adds hydration work. Every other route retains the existing providers.
 */
export function RouteProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = landingPaths.has(pathname.replace(/\/$/, ""));
  const [toastPosition, setToastPosition] = useState<"top-center" | "bottom-center">(
    "bottom-center",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncPosition = () => {
      setToastPosition(mediaQuery.matches ? "top-center" : "bottom-center");
    };

    syncPosition();
    mediaQuery.addEventListener("change", syncPosition);
    return () => {
      mediaQuery.removeEventListener("change", syncPosition);
    };
  }, []);

  return (
    <ThemeProvider>
      {/* Scroll restoration belongs to every route, not just the ones in the
          app shell route group.
          It used to live in MainShell, so anything outside that group — a
          seller profile at /{lang}/@handle, the blog, the marketplace and sell
          landing pages — had nothing resetting the scroll. Since navigations
          across the app deliberately pass `scroll: false` and let this
          component own the position, those pages opened at whatever offset the
          previous page happened to be at: leave a deep feed, land halfway down
          a profile.

          Suspense because it reads useSearchParams, which would otherwise opt
          every route into a client-render bail. */}
      <Suspense fallback={null}>
        <RouteScrollRestoration />
      </Suspense>
      <GlobalPushBootstrap lang={pathname.split("/")[1] || "en"} />
      <GlobalPushToastBridge />
      {/* Every route, homepages included: losing signal is the same problem
          on any page. */}
      <ConnectivityBanner lang={pathname.split("/")[1] || "en"} />
      {isLandingPage ? (
        <main>{children}</main>
      ) : (
        <>
          <ApolloWrapper>
            <SessionAnalyticsTracker />
            <ApolloReconnect />
            <main>{children}</main>
          </ApolloWrapper>
        </>
      )}
      <Toaster position={toastPosition} richColors />
    </ThemeProvider>
  );
}
