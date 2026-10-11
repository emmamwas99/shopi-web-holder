"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Bookmark,
  ChartColumn,
  Eye,
  FileEdit,
  Gift,
  LayoutDashboard,
  MessageCircle,
  Moon,
  Package,
  Settings2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardOverview } from "./DashboardOverview";
import { DashboardListings } from "./DashboardListings";
import { DashboardProfileTab } from "./DashboardProfileTab";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/features/messaging/hooks/usePushNotifications";
import { useUnreadMessageCount } from "@/features/messaging/hooks/useUnreadCount";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useUnreadNotificationCount";
import { DashboardInboxTab } from "./DashboardInboxTab";
import { DesktopCreateFlow } from "@/features/create/components/DesktopCreateFlow";

export function DashboardModal({
  lang,
  forceOpen = false,
}: {
  lang: string;
  forceOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(forceOpen);
  const isActiveRoute = pathname === `/${lang}/dashboard`;
  const activeTab = searchParams.get("tab") ?? "overview";
  const push = usePushNotifications(lang);
  const unreadMessages = useUnreadMessageCount();
  const unreadNotifications = useUnreadNotificationCount();

  const selectTab = useCallback((tab: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("bulk");
    if (tab === "overview") nextParams.delete("tab");
    else nextParams.set("tab", tab);
    const query = nextParams.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isActiveRoute) return;
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isActiveRoute]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setOpen(true);
        return;
      }
      setOpen(false);
      window.setTimeout(() => {
        if (forceOpen) {
          router.replace(`/${lang}/for-you`);
        } else {
          router.back();
        }
      }, 300);
    },
    [forceOpen, lang, router],
  );

  if (!isActiveRoute) return null;

  return (
    <>
      <span data-route-overlay="" hidden />
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[88vw] max-w-[88vw] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-elevated p-0 shadow-2xl">
          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface/40 md:flex">
              <div className="border-b border-border px-5 py-6">
                <p className="text-lg font-black tracking-tight text-primary">Shopi</p>
                <p className="mt-1 text-xs font-medium text-muted">Seller workspace</p>
              </div>
              <nav aria-label="Dashboard navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
                <p className="px-3 pb-2 pt-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                  Workspace
                </p>
                <DashboardNavLink onClick={() => selectTab("overview")} active={activeTab === "overview"} icon={LayoutDashboard}>
                  Dashboard
                </DashboardNavLink>
                <p className="px-3 pb-2 pt-5 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                  Your content
                </p>
                <DashboardNavLink onClick={() => selectTab("listings")} active={activeTab === "listings" || activeTab === "create"} icon={Package}>
                  My listings
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("drafts")} active={activeTab === "drafts"} icon={FileEdit}>
                  Drafts
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("saved")} active={activeTab === "saved"} icon={Bookmark}>
                  Saved items
                </DashboardNavLink>
                <p className="px-3 pb-2 pt-5 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                  Audience
                </p>
                <DashboardNavLink onClick={() => selectTab("analytics")} active={activeTab === "analytics"} icon={ChartColumn}>
                  Analytics
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("followers")} active={activeTab === "followers"} icon={Users}>
                  Followers
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("visitors")} active={activeTab === "visitors"} icon={Eye}>
                  Profile visitors
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("invite")} active={activeTab === "invite"} icon={Gift}>
                  Referrals
                </DashboardNavLink>
                <p className="px-3 pb-2 pt-5 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                  Your account
                </p>
                <DashboardNavLink onClick={() => selectTab("messages")} active={activeTab === "messages"} icon={MessageCircle} badge={unreadMessages}>
                  Messages
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("notifications")} active={activeTab === "notifications"} icon={Bell} badge={unreadNotifications}>
                  Notifications
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("settings")} active={activeTab === "settings"} icon={Settings2}>
                  Account settings
                </DashboardNavLink>
                <DashboardPreferenceRow icon={Moon} label="Dark mode"><ThemeToggle /></DashboardPreferenceRow>
                {push.isSupported && (
                  <DashboardPreferenceRow icon={Bell} label="Push notifications">
                    <Switch
                      checked={push.isEnabled}
                      onCheckedChange={() => void push.toggle()}
                      disabled={push.isUpdating}
                      aria-label={push.isEnabled ? "Turn off push notifications" : "Turn on push notifications"}
                    />
                  </DashboardPreferenceRow>
                )}
              </nav>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-app">
              <DialogHeader className="sr-only">
                <DialogTitle>Dashboard</DialogTitle>
                <DialogDescription>
                  Your shop overview, growth, and listing performance.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === "create" ? (
                  <DesktopCreateFlow
                    lang={lang}
                    embeddedInDashboard
                    onDashboardClose={() => selectTab("listings")}
                  />
                ) : activeTab === "listings" ? (
                  <DashboardListings
                    lang={lang}
                    onSingleUpload={() => selectTab("create")}
                    autoOpenBulk={searchParams.get("bulk") === "1"}
                    onBulkUploadHandled={() => selectTab("listings")}
                  />
                ) : activeTab === "overview" ? (
                  <DashboardOverview lang={lang} />
                ) : activeTab === "messages" || activeTab === "notifications" ? (
                  <DashboardInboxTab
                    section={activeTab}
                    lang={lang}
                    onSelectSection={selectTab}
                  />
                ) : activeTab === "drafts" || activeTab === "saved" || activeTab === "analytics" || activeTab === "followers" || activeTab === "visitors" || activeTab === "invite" || activeTab === "settings" ? (
                  <DashboardProfileTab section={activeTab} lang={lang} />
                ) : (
                  <DashboardSectionPlaceholder tab={activeTab} />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DashboardPreferenceRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-main">
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {children}
    </div>
  );
}

function DashboardNavLink({
  onClick,
  icon: Icon,
  active = false,
  badge,
  children,
}: {
  onClick: () => void;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={badge && badge > 0 ? `${children}, ${badge} unread` : undefined}
      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
        active
          ? "bg-primary text-white shadow-sm"
          : "text-main hover:bg-surface"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
      {badge !== undefined && badge > 0 ? (
        <span className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold tabular-nums ${active ? "bg-white/20 text-white" : "bg-primary text-white"}`}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function DashboardSectionPlaceholder({ tab }: { tab: string }) {
  const labels: Record<string, { title: string; description: string }> = {
    messages: { title: "Messages", description: "Your buyer conversations will be available here." },
    notifications: { title: "Notifications", description: "Your Shopi updates will be available here." },
    saved: { title: "Saved items", description: "The items you save will be available here." },
    settings: { title: "Account settings", description: "Manage your account and seller preferences here." },
  };
  const section = labels[tab] ?? labels.settings;

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col">
      <header className="z-10 shrink-0 bg-app px-5 pb-4 pt-5 text-center md:px-8 md:pb-5 md:pt-6">
        <h1 className="text-xl font-extrabold tracking-tight text-main">{section.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted">{section.description}</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary"><LayoutDashboard className="h-5 w-5" aria-hidden /></div>
      </div>
    </section>
  );
}
