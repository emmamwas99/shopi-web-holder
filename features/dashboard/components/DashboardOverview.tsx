"use client";

import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import {
  ArrowUpRight,
  Bookmark,
  Eye,
  LayoutGrid,
  Package,
  Plus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth";
import { DASHBOARD_PRIMARY_BUTTON, DashboardHeader } from "./DashboardSection";
import { VerifiedTick } from "@/components/verification/VerifiedTick";
import {
  useMyShopVerification,
  verificationStage,
  type VerificationStage,
} from "@/features/verification/hooks/useShopVerification";

type DashboardOverviewData = {
  myDashboardOverview: {
    totalActiveListings: number;
    totalViews: number;
    totalSaves: number;
    totalFollowers: number;
    categoryCounts: { name: string; count: number }[];
  };
  myAnalytics: {
    last30DaysViews: number;
    last30DaysSaves: number;
    viewsByDay: { date: string; views: number; saves: number }[];
  };
};

const DASHBOARD_OVERVIEW = gql`
  query DashboardOverview {
    myDashboardOverview {
      totalActiveListings
      totalViews
      totalSaves
      totalFollowers
      categoryCounts {
        name
        count
      }
    }
    myAnalytics {
      last30DaysViews
      last30DaysSaves
      viewsByDay {
        date
        views
        saves
      }
    }
  }
` as TypedDocumentNode<DashboardOverviewData, Record<string, never>>;

const numberFormat = new Intl.NumberFormat("en-KE", { notation: "compact" });

const VERIFICATION_PROMPT: Partial<Record<VerificationStage, { title: string; body: string; action: string }>> = {
  none: {
    title: "Get the blue tick — it's free",
    body: "Verify your shop to show buyers you're a real, registered business.",
    action: "Verify your shop",
  },
  draft: {
    title: "Finish verifying your shop",
    body: "You're part-way there. Your details are saved — a couple of minutes more.",
    action: "Continue",
  },
  changes: {
    title: "Your verification needs changes",
    body: "See what to fix and resubmit. Everything else you sent is saved.",
    action: "Fix now",
  },
  removed: {
    title: "Get your blue tick back",
    body: "Check your details are current and resubmit for review.",
    action: "Resubmit",
  },
};

/** Verification's nudge: only while there's something for the seller to do. */
function VerificationPrompt({ onOpen }: { onOpen?: () => void }) {
  const { verification } = useMyShopVerification();
  const stage = verificationStage(verification);
  const prompt = verification ? VERIFICATION_PROMPT[stage] : undefined;
  if (!prompt || !onOpen) return null;
  const urgent = stage === "changes";

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${
        urgent
          ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
          : "border-[#1D9BF0]/20 bg-linear-to-r from-[#1D9BF0]/[0.07] to-transparent"
      }`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1D9BF0]/10">
        <VerifiedTick size={24} label={null} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-main">{prompt.title}</p>
        <p className="mt-0.5 text-sm text-muted">{prompt.body}</p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={`${DASHBOARD_PRIMARY_BUTTON} shrink-0`}
      >
        {prompt.action}
      </button>
    </div>
  );
}

export function DashboardOverview({
  lang,
  onOpenVerification,
  onCreate,
}: {
  lang: string;
  /** Opens the dashboard's Verification tab. */
  onOpenVerification?: () => void;
  /** Opens the dashboard's create flow. */
  onCreate?: () => void;
}) {
  const { isAuthenticated } = useAuthSession();
  const firstName = useAuthStore((state) => state.user?.profile?.firstName);
  const { data, loading, error } = useQuery(DASHBOARD_OVERVIEW, {
    skip: !isAuthenticated,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="mb-5 rounded-2xl bg-primary/10 p-4 text-primary">
          <LayoutGrid className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-main">Dashboard <span className="text-primary">Overview</span></h1>
        <p className="mt-3 text-xs leading-5 text-muted">Sign in to see your listings, audience, and shop activity in one place.</p>
        <Link href={`/${lang}/auth/login`} className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-xs font-bold text-white hover:opacity-90">Sign in</Link>
      </div>
    );
  }

  const overview = data?.myDashboardOverview;
  const analytics = data?.myAnalytics;
  const categories = overview?.categoryCounts ?? [];
  const maxCategoryCount = Math.max(1, ...categories.map(({ count }) => count));
  const trend = analytics?.viewsByDay.slice(-30) ?? [];
  const maxDailyActivity = Math.max(
    1,
    ...trend.flatMap(({ views, saves }) => [views, saves]),
  );

  const postButton = onCreate ? (
    <button type="button" onClick={onCreate} className={DASHBOARD_PRIMARY_BUTTON}>
      <Plus className="size-4" strokeWidth={2.5} aria-hidden /> Post an item
    </button>
  ) : (
    <Link href={`/${lang}/upload`} className={DASHBOARD_PRIMARY_BUTTON}>
      <Plus className="size-4" strokeWidth={2.5} aria-hidden /> Post an item
    </Link>
  );
  const statsLoading = loading && !overview;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DashboardHeader
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Here's how your shop is doing."
        actions={postButton}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-6">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5">
          <VerificationPrompt onOpen={onOpenVerification} />
          {error && !overview ? (
            <div role="alert" className="rounded-2xl border border-border bg-elevated p-6 text-center text-sm text-muted">
              We couldn’t load your dashboard right now. Please refresh and try again.
            </div>
          ) : null}

          <section
            data-dashboard-tour="dashboard-tour-overview"
            aria-label="Shop overview"
            className="grid grid-cols-2 gap-4 xl:grid-cols-4"
          >
            <StatCard icon={Package} tint="bg-primary/10 text-primary" label="Active listings" value={overview?.totalActiveListings} loading={statsLoading} note={`${categories.length} ${categories.length === 1 ? "category" : "categories"}`} />
            <StatCard icon={Eye} tint="bg-violet-500/10 text-violet-600 dark:text-violet-400" label="Total views" value={overview?.totalViews} loading={statsLoading} note={`${numberFormat.format(analytics?.last30DaysViews ?? 0)} in the last 30 days`} />
            <StatCard icon={Bookmark} tint="bg-sky-500/10 text-sky-600 dark:text-sky-400" label="Saves" value={overview?.totalSaves} loading={statsLoading} note={`${numberFormat.format(analytics?.last30DaysSaves ?? 0)} in the last 30 days`} />
            <StatCard icon={Users} tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" label="Followers" value={overview?.totalFollowers} loading={statsLoading} note="People following your shop" />
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel tourId="dashboard-tour-growth" title="Shop growth" subtitle="Views and saves, last 30 days" icon={ArrowUpRight} className="xl:col-span-2">
              {loading && !analytics ? <GrowthSkeleton /> : (
                <div className="flex min-h-[260px] flex-1 flex-col">
                  <div className="flex items-end gap-8">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><span className="size-2 rounded-full bg-primary" aria-hidden />Views</p>
                      <p className="mt-1 text-3xl font-black tracking-tight text-main">{numberFormat.format(analytics?.last30DaysViews ?? 0)}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><span className="size-2 rounded-full bg-sky-500" aria-hidden />Saves</p>
                      <p className="mt-1 text-3xl font-black tracking-tight text-main">{numberFormat.format(analytics?.last30DaysSaves ?? 0)}</p>
                    </div>
                  </div>
                  {trend.some(({ views, saves }) => views > 0 || saves > 0) ? (
                    <div className="mt-auto pt-6">
                      <div className="flex h-36 items-end gap-0.5 border-b border-border/80" role="img" aria-label="Daily views and saves over the last 30 days">
                        {trend.map((point) => (
                          <div key={point.date} className="flex h-full min-w-0 flex-1 items-end gap-px" title={`${formatChartDate(point.date)}: ${point.views} views, ${point.saves} saves`}>
                            <div className="flex h-full min-w-0 flex-1 items-end">
                              <div
                                className="w-full rounded-t-sm bg-primary/85 transition-colors hover:bg-primary"
                                style={{ height: `${point.views > 0 ? Math.max(5, (point.views / maxDailyActivity) * 100) : 2}%` }}
                              />
                            </div>
                            <div className="flex h-full min-w-0 flex-1 items-end">
                              <div
                                className="w-full rounded-t-sm bg-sky-500/85 transition-colors hover:bg-sky-600"
                                style={{ height: `${point.saves > 0 ? Math.max(5, (point.saves / maxDailyActivity) * 100) : 2}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] font-medium text-muted">
                        <span>{trend[0]?.date ? formatChartDate(trend[0].date) : ""}</span>
                        <span>{trend.at(-1)?.date ? formatChartDate(trend.at(-1)!.date) : ""}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 flex min-h-40 flex-1 flex-col items-center justify-center rounded-2xl bg-subtle px-4 text-center">
                      <ArrowUpRight className="size-5 text-primary" aria-hidden />
                      <p className="mt-2 text-sm font-semibold text-main">No views yet</p>
                      <p className="mt-0.5 max-w-xs text-xs leading-5 text-muted">Your daily views and saves chart up here as buyers find your listings.</p>
                    </div>
                  )}
                </div>
              )}
            </Panel>

            <Panel title="Listings by category" subtitle="Where your stock is" icon={LayoutGrid}>
              {loading && !overview ? <RowsSkeleton /> : categories.length > 0 ? (
                <div className="space-y-4">
                  {categories.slice(0, 6).map(({ name, count }) => (
                    <div key={name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-main">{name}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-muted">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-subtle">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (count / maxCategoryCount) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-2xl bg-subtle px-4 text-center">
                  <Package className="size-5 text-primary" aria-hidden />
                  <p className="mt-2 text-sm font-semibold text-main">Your categories will show here</p>
                  <p className="mt-0.5 max-w-xs text-xs leading-5 text-muted">Post your first item to start building your shop.</p>
                  <div className="mt-4">{postButton}</div>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tint,
  label,
  value,
  note,
  loading,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  value: number | undefined;
  note: string;
  loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-elevated p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl ${tint}`}>
          <Icon className="size-[1.125rem]" strokeWidth={2.2} aria-hidden />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className="mt-2 text-[2rem] font-black leading-none tracking-tight text-main tabular-nums">
          {numberFormat.format(value ?? 0)}
        </p>
      )}
      <p className="mt-2 truncate text-xs text-muted">{note}</p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  tourId,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  tourId?: string;
  className?: string;
}) {
  return (
    <article data-dashboard-tour={tourId} className={`flex min-h-[340px] flex-col rounded-2xl border border-border bg-elevated p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${className}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-[1.125rem]" strokeWidth={2.2} aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold tracking-tight text-main">{title}</h2>
          {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </article>
  );
}

function RowsSkeleton() {
  return <div className="space-y-5 pt-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-7 w-full" />)}</div>;
}

function GrowthSkeleton() {
  return <div className="flex flex-1 flex-col space-y-4"><Skeleton className="h-12 w-36" /><Skeleton className="mt-auto h-28 w-full" /></div>;
}

function formatChartDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}
