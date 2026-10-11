"use client";

import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import {
  ArrowUpRight,
  LayoutGrid,
  Package,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Skeleton } from "@/components/ui/skeleton";

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

export function DashboardOverview({ lang }: { lang: string }) {
  const { isAuthenticated } = useAuthSession();
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

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col">
      <header className="z-10 shrink-0 bg-app px-4 pb-4 pt-5 md:px-6 md:pb-5 md:pt-6">
        <h1 className="text-xl font-black tracking-tight text-main sm:text-2xl">
          Dashboard <span className="text-primary">Overview</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs font-medium leading-5 text-muted sm:text-sm">
          See how your listings and shop are growing.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">
      {error && !overview ? (
        <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-border bg-elevated p-6 text-center text-sm text-muted">
          We couldn’t load your dashboard right now. Please refresh and try again.
        </div>
      ) : null}

      <section aria-label="Shop overview" className="grid grid-cols-1 items-stretch gap-4 pt-1 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Listings overview" icon={Package}>
          {loading && !overview ? <RowsSkeleton /> : (
            <div className="space-y-0.5">
              <SummaryRow label="Active listings" value={overview?.totalActiveListings ?? 0} />
              <SummaryRow label="Categories listed in" value={categories.length} />
              <SummaryRow label="Saves received" value={overview?.totalSaves ?? 0} />
              <SummaryRow label="Total views" value={overview?.totalViews ?? 0} total />
            </div>
          )}
        </Panel>

        <Panel title="Shop growth" icon={ArrowUpRight}>
          {loading && !analytics ? <GrowthSkeleton /> : (
            <div className="flex min-h-[250px] flex-1 flex-col">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted">Views · 30 days</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-primary">{numberFormat.format(analytics?.last30DaysViews ?? 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted">Saves · 30 days</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-sky-600">{numberFormat.format(analytics?.last30DaysSaves ?? 0)}</p>
                </div>
              </div>
              {trend.length > 0 ? (
                <div className="mt-auto pt-6">
                  <div className="flex h-28 items-end gap-px border-b border-border/80" role="img" aria-label="Daily views and saves over the last 30 days">
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
                  <div className="mt-2 flex justify-between text-[10px] font-medium text-muted">
                    <span>{trend[0]?.date ? formatChartDate(trend[0].date) : ""}</span>
                    <span>{trend.at(-1)?.date ? formatChartDate(trend.at(-1)!.date) : ""}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-semibold text-muted">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden />Views</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />Saves</span>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex min-h-40 flex-1 items-center justify-center rounded-xl bg-surface px-4 text-center text-sm text-muted">
                  Your view activity will appear here as people discover your listings.
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Listings by category" icon={LayoutGrid}>
          {loading && !overview ? <RowsSkeleton /> : categories.length > 0 ? (
            <div className="space-y-4">
              {categories.slice(0, 6).map(({ name, count }) => (
                <div key={name}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-main">{name}</span>
                    <span className="shrink-0 font-bold tabular-nums text-muted">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (count / maxCategoryCount) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Package className="h-5 w-5" aria-hidden /></div>
              <p className="mt-3 text-sm font-semibold text-main">Your categories will show here</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted">Post your first item to start building your shop.</p>
              <Link href={`/${lang}/upload`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:opacity-90">
                <Plus className="h-4 w-4" aria-hidden /> Post an item
              </Link>
            </div>
          )}
        </Panel>
      </section>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <article className="flex min-h-[320px] flex-col rounded-2xl border border-border bg-elevated p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-base font-extrabold tracking-tight text-main">
        <Icon className="h-4 w-4 text-primary" aria-hidden /> {title}
      </h2>
      <div className="flex flex-1 flex-col">{children}</div>
    </article>
  );
}

function SummaryRow({ label, value, total = false }: { label: string; value: number; total?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-border/70 py-3 text-xs last:border-b-0 ${total ? "mt-1 pt-4 font-bold" : "font-medium"}`}>
      <span className="text-main">{label}</span>
      <span className="tabular-nums text-muted">{numberFormat.format(value)}</span>
    </div>
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
