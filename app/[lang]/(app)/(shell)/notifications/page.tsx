import type { Metadata } from "next";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { NotificationsScreen } from "@/features/notifications/components/NotificationsScreen";

export const metadata: Metadata = {
  title: siteConfig.routes.notifications.title,
  description: siteConfig.routes.notifications.description,
  // Inbox is private — don't index it
  robots: { index: false, follow: false },
};

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={<div className="min-h-svh bg-app" />}>
      <NotificationsScreen lang={lang} />
    </Suspense>
  );
}
