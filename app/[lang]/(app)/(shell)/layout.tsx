import { Suspense } from "react";
import { MainShell } from "@/components/layout/MainShell";
import { SideNav } from "@/components/layout/SideNav";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { ApiPreconnect } from "@/components/providers/ApiPreconnect";
import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function MainLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  return (
    <SocketProvider>
      <ApiPreconnect />
      {/* SideNav reads useSearchParams() (the ?tab= highlight and the
          ?category= one in BrowseCategories). Without a boundary here it opts
          every route in this group into a client-render bail, which fails the
          production build on the statically prerenderable ones — /community
          was the first to hit it. Same reason RouteProviders wraps
          RouteScrollRestoration. */}
      <Suspense fallback={null}>
        <SideNav lang={lang} />
      </Suspense>
      <MainShell lang={lang}>{children}</MainShell>
      {modal}
    </SocketProvider>
  );
}
