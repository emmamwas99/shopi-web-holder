"use client";

import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import {
  ArrowUpRight,
  Eye,
  LayoutGrid,
  Package,
  Plus,
  UsersRound,
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
    viewsByDay: { date: string; views: number }[];
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
      viewsByDay {
        date
        views
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
  const trend = analytics?.viewsByDay.slice(-14) ?? [];
  const maxDailyViews = Math.max(1, ...trend.map(({ views }) => views));

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col">
      <header className="z-10 shrink-0 bg-app px-2 pb-4 pt-5 text-center md:pb-5 md:pt-6">
        <h1 className="text-2xl font-black tracking-tight text-main sm:text-3xl">
          Dashboard <span className="text-primary">Overview</span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-xs font-medium leading-5 text-muted sm:text-sm">
          See how your listings and shop are growing.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-5">
      {error && !overview ? (
        <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-border bg-elevated p-6 text-center text-sm text-muted">
          We couldn’t load your dashboard right now. Please refresh and try again.
        </div>
      ) : null}

      <section aria-label="Shop summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
        <MetricCard icon={Package} label="Active listings" value={overview?.totalActiveListings} loading={loading && !overview} />
        <MetricCard icon={Eye} label="Total views" value={overview?.totalViews} loading={loading && !overview} />
        <MetricCard icon={UsersRound} label="Followers" value={overview?.totalFollowers} loading={loading && !overview} />
      </section>

      <section aria-label="Shop details" className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:mt-4 xl:grid-cols-3 xl:gap-4">
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
            <div className="flex h-full min-h-[230px] flex-col">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted">Views in the last 30 days</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-primary">{numberFormat.format(analytics?.last30DaysViews ?? 0)}</p>
                </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">Last 14 days</span>
              </div>
              {trend.length > 0 ? (
                <div className="mt-auto flex h-20 items-end gap-1.5 overflow-hidden pt-4" role="img" aria-label="Daily views over the last 14 days">
                  {trend.map((point, index) => (
                    <div
                      key={`${point.date}-${index}`}
                      className="min-h-1 min-w-0 flex-1 rounded-t-md bg-primary transition-colors hover:bg-primary-strong"
                      style={{ height: `${Math.max(5, (point.views / maxDailyViews) * 100)}%` }}
                      title={`${point.date}: ${point.views} views`}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-7 flex flex-1 items-center justify-center rounded-xl bg-surface px-4 text-center text-sm text-muted">
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

function MetricCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <div className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-4 shadow-sm sm:px-5">
      <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-muted">{label}</p>
        {loading ? <Skeleton className="mt-2 h-5 w-16" /> : <p className="mt-1 text-xl font-black tracking-tight text-primary">{numberFormat.format(value ?? 0)}</p>}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <article className="min-h-[270px] overflow-hidden rounded-2xl border border-border bg-elevated p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-base font-extrabold tracking-tight text-main">
        <Icon className="h-4 w-4 text-primary" aria-hidden /> {title}
      </h2>
      {children}
    </article>
  );
}

function SummaryRow({ label, value, total = false }: { label: string; value: number; total?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-border/70 py-3 text-xs last:border-b-0 ${total ? "mt-1 border-t border-border pt-4 font-bold" : "font-medium"}`}>
      <span className="text-main">{label}</span>
      <span className="tabular-nums text-muted">{numberFormat.format(value)}</span>
    </div>
  );
}

function RowsSkeleton() {
  return <div className="space-y-5 pt-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-7 w-full" />)}</div>;
}

function GrowthSkeleton() {
  return <div className="space-y-4"><Skeleton className="h-12 w-36" /><Skeleton className="mt-10 h-28 w-full" /></div>;
}
