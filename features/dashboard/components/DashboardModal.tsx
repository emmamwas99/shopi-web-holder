"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { MyPendingBulkUploadDraftsDocument } from "@/types/__generated__/graphql";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  ChartColumn,
  Eye,
  FileEdit,
  LayoutDashboard,
  MessageCircle,
  Moon,
  Package,
  Plus,
  Settings2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
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
import { useAuthStore } from "@/stores/auth";
import { Logo } from "@/components/ui/Logo";
import { DashboardHeader } from "./DashboardSection";
import { DashboardTour, type DashboardTourStep } from "./DashboardTour";
import { goBackOr } from "@/lib/useAppBack";
import { VerificationScreen } from "@/features/verification/components/VerificationScreen";
import { VerifiedTick } from "@/components/verification/VerifiedTick";
import {
  useMyShopVerification,
  verificationStage,
  type VerificationStage,
} from "@/features/verification/hooks/useShopVerification";

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
  const requestedTab = searchParams.get("tab");
  const activeTab = !requestedTab || requestedTab === "invite" ? "overview" : requestedTab;
  const bulkRequested = searchParams.get("bulk") === "1";
  const [bulkDialogDismissed, setBulkDialogDismissed] = useState(false);
  // Once bulk work starts, defer the tour for the rest of this dashboard visit.
  const [tourDeferred, setTourDeferred] = useState(bulkRequested);
  const push = usePushNotifications(lang);
  const unreadMessages = useUnreadMessageCount();
  const unreadNotifications = useUnreadNotificationCount();
  const tourUserId = useAuthStore((state) => state.user?.id ?? null);
  const user = useAuthStore((state) => state.user);
  const displayName =
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Your shop";
  const { verification } = useMyShopVerification();
  const shopVerificationStage = verificationStage(verification);
  const [tourStepId, setTourStepId] = useState<DashboardTourStep["id"] | null>(null);
  // Resolve unfinished bulk work before starting a tour on Listings. Apollo
  // shares this request/cache with DashboardListings, which owns polling.
  const checkPendingBulk = open && isActiveRoute && activeTab === "listings" && !!tourUserId && !bulkRequested && !tourDeferred && tourStepId === null;
  const { data: pendingBulk, loading: checkingBulk, error: bulkCheckError } = useQuery(
    MyPendingBulkUploadDraftsDocument,
    { skip: !checkPendingBulk, fetchPolicy: "network-only" },
  );
  const waitingForBulk = checkPendingBulk && (
    checkingBulk || !pendingBulk || !!bulkCheckError || pendingBulk.myPendingBulkUploadDrafts.length > 0
  );
  const suppressTour = bulkRequested || tourDeferred || waitingForBulk;


  const selectTab = useCallback((tab: string) => {
    if (activeTab === "listings" && tab !== "listings") setBulkDialogDismissed(false);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("bulk");
    if (tab === "overview") nextParams.delete("tab");
    else nextParams.set("tab", tab);
    const query = nextParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      // Dashboard sections are already client-rendered in this modal. Keep the
      // URL in sync without starting a route navigation for every tour step.
      window.history.replaceState(null, "", nextUrl);
    }
  }, [activeTab, pathname, searchParams]);

  const onTourStepChange = useCallback((step: DashboardTourStep | null) => {
    if (suppressTour) return;
    setTourStepId(step?.id ?? null);
    if (step) selectTab(step.tab);
  }, [selectTab, suppressTour]);

  const deferTourForBulk = useCallback(() => {
    setTourDeferred(true);
    setTourStepId(null);
  }, []);

  const onBulkUploadStart = useCallback(() => {
    deferTourForBulk();
    // Keep this in the URL while open so a refresh resumes the same dialog.
    if (!bulkRequested) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("tab", "listings");
      nextParams.set("bulk", "1");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }
  }, [bulkRequested, deferTourForBulk, pathname, router, searchParams]);

  const onBulkUploadClose = useCallback(() => {
    setBulkDialogDismissed(true);
    selectTab("listings");
  }, [selectTab]);

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
      // Back to the page the dashboard was opened over. Loaded directly
      // (forceOpen) after a refresh, that page is still behind it in history;
      // only a dashboard opened with nothing of ours behind lands on Home.
      window.setTimeout(() => goBackOr(router, `/${lang}/for-you`), 300);
    },
    [lang, router],
  );

  if (!isActiveRoute) return null;

  return (
    <>
      <span data-route-overlay="" hidden />
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          hideClose
          // Focus the panel, not its first control: the profile button lit up
          // with a focus ring on every open. Tab still starts inside.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
          className="flex h-[90vh] max-h-[90vh] w-[88vw] max-w-[88vw] flex-col gap-0 overflow-hidden rounded-2xl outline-none border-border bg-elevated p-0 shadow-2xl"
        >
          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-elevated md:flex">
              {/* Who this workspace belongs to, and the one action it's for. */}
              <div className="flex flex-col gap-3 px-3 pb-3 pt-4">
                <button
                  type="button"
                  onClick={() => selectTab("settings")}
                  aria-label="Account settings"
                  className="flex items-center gap-3 rounded-2xl bg-subtle p-2.5 text-left outline-none transition-colors hover:bg-[rgb(var(--color-border))]/50 focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {user?.profile?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- avatars come from several hosts
                      <img src={user.profile.avatar} alt="" className="size-full object-cover" />
                    ) : (
                      <Logo variant="icon" size={40} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-bold text-main">
                      <span className="truncate">{displayName}</span>
                      {shopVerificationStage === "verified" ? <VerifiedTick size={14} label="Verified" /> : null}
                    </span>
                    <span className="block text-xs font-medium text-[rgb(var(--color-text-muted))]">Seller workspace</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => selectTab("create")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgb(var(--brand-primary)/0.7)] transition-colors hover:bg-primary-strong"
                >
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                  Post an item
                </button>
              </div>

              <nav aria-label="Dashboard navigation" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto border-t border-border/70 px-3 pb-3">
                <NavGroupLabel>Workspace</NavGroupLabel>
                <DashboardNavLink onClick={() => selectTab("overview")} active={activeTab === "overview"} icon={LayoutDashboard}>
                  Overview
                </DashboardNavLink>
                <NavGroupLabel>Your content</NavGroupLabel>
                <DashboardNavLink tourId="dashboard-tour-listings-nav" onClick={() => selectTab("listings")} active={activeTab === "listings" || activeTab === "create"} icon={Package}>
                  My listings
                </DashboardNavLink>
                <DashboardNavLink tourId="dashboard-tour-drafts-nav" onClick={() => selectTab("drafts")} active={activeTab === "drafts"} icon={FileEdit}>
                  Drafts
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("saved")} active={activeTab === "saved"} icon={Bookmark}>
                  Saved items
                </DashboardNavLink>
                <NavGroupLabel tourId="dashboard-tour-audience-nav">Audience</NavGroupLabel>
                <DashboardNavLink tourId="dashboard-tour-analytics-nav" onClick={() => selectTab("analytics")} active={activeTab === "analytics"} icon={ChartColumn}>
                  Analytics
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("followers")} active={activeTab === "followers"} icon={Users}>
                  Followers
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("visitors")} active={activeTab === "visitors"} icon={Eye}>
                  Profile visitors
                </DashboardNavLink>
                <NavGroupLabel>Your account</NavGroupLabel>
                <DashboardNavLink
                  onClick={() => selectTab("verification")}
                  active={activeTab === "verification"}
                  icon={BadgeCheck}
                  trailing={<VerificationNavStatus stage={shopVerificationStage} />}
                >
                  Verification
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("messages")} active={activeTab === "messages"} icon={MessageCircle} badge={unreadMessages}>
                  Messages
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("notifications")} active={activeTab === "notifications"} icon={Bell} badge={unreadNotifications}>
                  Notifications
                </DashboardNavLink>
                <DashboardNavLink onClick={() => selectTab("settings")} active={activeTab === "settings"} icon={Settings2}>
                  Account settings
                </DashboardNavLink>
              </nav>

              {/* Preferences pinned under the list, so they're never cut off. */}
              <div className="shrink-0 border-t border-border/70 px-3 py-2">
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
              </div>
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
                    autoOpenBulk={bulkRequested && !bulkDialogDismissed}
                    onBulkUploadHandled={deferTourForBulk}
                    onBulkUploadStart={onBulkUploadStart}
                    onBulkUploadClose={onBulkUploadClose}
                    tourStep={suppressTour ? null : tourStepId}
                  />
                ) : activeTab === "overview" ? (
                  <DashboardOverview lang={lang} onOpenVerification={() => selectTab("verification")} onCreate={() => selectTab("create")} />
                ) : activeTab === "verification" ? (
                  <VerificationScreen lang={lang} embedded />
                ) : activeTab === "messages" || activeTab === "notifications" ? (
                  <DashboardInboxTab
                    section={activeTab}
                    lang={lang}
                    onSelectSection={selectTab}
                  />
                ) : activeTab === "drafts" || activeTab === "saved" || activeTab === "analytics" || activeTab === "followers" || activeTab === "visitors" || activeTab === "settings" ? (
                  <DashboardProfileTab section={activeTab} lang={lang} />
                ) : (
                  <DashboardSectionPlaceholder tab={activeTab} />
                )}
              </div>
            </div>
          </div>
          {/* A clear close control over every section. The dialog's stock X
              was 16px and faint, and the sections' own z-10 headers painted
              over it. DashboardHeader keeps clear of this corner. Last in the
              dialog so opening it focuses the content, not the X. */}
          <DialogClose
            className={`absolute right-5 z-30 ${activeTab === "create" ? "top-3" : "top-6"}  grid size-9 place-items-center rounded-full bg-elevated text-main shadow-[0_2px_8px_-2px_rgb(0_0_0/0.18)] ring-1 ring-border outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/60`}
            aria-label="Close dashboard"
          >
            <X className="size-4.5" strokeWidth={2.4} aria-hidden />
          </DialogClose>
          <DashboardTour
            key={tourUserId ?? "anonymous"}
            enabled={open && isActiveRoute && !suppressTour}
            userId={tourUserId}
            onStepChange={onTourStepChange}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function NavGroupLabel({ children, tourId }: { children: React.ReactNode; tourId?: string }) {
  return (
    <p
      data-dashboard-tour={tourId}
      className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[rgb(var(--color-text-muted))]"
    >
      {children}
    </p>
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
    <div className="flex min-h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium text-main">
      <Icon className="size-[1.0625rem] shrink-0 text-[rgb(var(--color-text-muted))]" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {children}
    </div>
  );
}

/** Where the seller stands on verification, in the space a count would take. */
function VerificationNavStatus({ stage }: { stage: VerificationStage }) {
  if (stage === "verified") {
    return <VerifiedTick size={15} label="Verified" />;
  }
  const text = stage === "pending" ? "In review" : stage === "changes" ? "Fix" : stage === "none" ? "Free" : null;
  if (!text) return null;
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
        stage === "changes"
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : stage === "pending"
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              : "bg-primary text-white"
      }`}
    >
      {text}
    </span>
  );
}

function DashboardNavLink({
  onClick,
  icon: Icon,
  active = false,
  badge,
  tourId,
  trailing,
  children,
}: {
  onClick: () => void;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  tourId?: string;
  /** A status shown at the row's end, e.g. verification's stage. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-dashboard-tour={tourId}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={badge && badge > 0 ? `${children}, ${badge} unread` : undefined}
      className={`flex h-9 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "font-medium text-main hover:bg-subtle"
      }`}
    >
      <Icon className={`size-[1.0625rem] shrink-0 ${active ? "text-primary" : "text-[rgb(var(--color-text-muted))]"}`} strokeWidth={active ? 2.3 : 2} aria-hidden />
      <span>{children}</span>
      {badge !== undefined && badge > 0 ? (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-extrabold tabular-nums text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : trailing ? (
        <span className="ml-auto inline-flex items-center">{trailing}</span>
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
    <section className="flex h-full min-h-0 flex-col">
      <DashboardHeader title={section.title} description={section.description} />
    </section>
  );
}
