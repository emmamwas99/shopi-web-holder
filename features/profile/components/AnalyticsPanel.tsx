"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChartColumn,
  Eye,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GetMyAnalyticsQuery } from "@/types/__generated__/graphql";

type Analytics = GetMyAnalyticsQuery["myAnalytics"];
type ViewPoint = Analytics["viewsByDay"][number];

interface Props {
  data: Analytics;
  lang: string;
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function sumViews(points: ViewPoint[]) {
  return points.reduce((total, point) => total + point.views, 0);
}

function getWeekChange(points: ViewPoint[]) {
  const lastSeven = points.slice(-7);
  const previousSeven = points.slice(-14, -7);
  const current = sumViews(lastSeven);
  const previous = sumViews(previousSeven);

  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "rgb(var(--color-bg-elevated))",
        borderColor: "rgb(var(--color-border))",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `rgb(var(${tone}) / 0.12)`,
            color: `rgb(var(${tone}))`,
          }}
        >
          <Icon size={17} strokeWidth={2.2} />
        </div>
        <ArrowUpRight
          size={15}
          strokeWidth={2.1}
          style={{ color: "rgb(var(--color-text-placeholder))" }}
          aria-hidden
        />
      </div>
      <p
        className="font-bold leading-none"
        style={{ color: "rgb(var(--color-text))", fontSize: "var(--text-lg)" }}
      >
        {value}
      </p>
      <p
        className="mt-2 font-semibold leading-tight"
        style={{
          color: "rgb(var(--color-text))",
          fontSize: "var(--text-sm)",
        }}
      >
        {label}
      </p>
      <p
        className="mt-1 leading-snug"
        style={{
          color: "rgb(var(--color-text-muted))",
          fontSize: "var(--text-xs)",
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function EmptyGraph() {
  return (
    <div
      className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center"
      style={{
        borderColor: "rgb(var(--color-border))",
        color: "rgb(var(--color-text-muted))",
      }}
    >
      <ChartColumn size={28} strokeWidth={1.8} aria-hidden />
      <p
        className="mt-3 font-semibold"
        style={{
          color: "rgb(var(--color-text))",
          fontSize: "var(--text-base)",
        }}
      >
        No view activity yet
      </p>
      <p
        className="mt-1 max-w-xs leading-snug"
        style={{ fontSize: "var(--text-sm)" }}
      >
        Your analytics will fill in as people watch your posts.
      </p>
    </div>
  );
}

function TrendChart({ data }: { data: ViewPoint[] }) {
  const points = data.slice(-30);
  if (points.length === 0) return <EmptyGraph />;

  const width = 640;
  const height = 220;
  const paddingX = 22;
  const paddingY = 24;
  const maxViews = Math.max(...points.map((point) => point.views), 1);
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const coords = points.map((point, index) => {
    const x =
      paddingX +
      (points.length === 1
        ? usableWidth / 2
        : (index / (points.length - 1)) * usableWidth);
    const y = paddingY + usableHeight - (point.views / maxViews) * usableHeight;
    return { x, y, point };
  });
  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`
      : "";
  const peak = points.reduce(
    (best, point) => (point.views > best.views ? point : best),
    points[0],
  );

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "rgb(var(--color-bg-elevated))",
        borderColor: "rgb(var(--color-border))",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className="font-bold"
            style={{
              color: "rgb(var(--color-text))",
              fontSize: "var(--text-base)",
            }}
          >
            Views trend
          </p>
          <p
            style={{
              color: "rgb(var(--color-text-muted))",
              fontSize: "var(--text-sm)",
            }}
          >
            Last {points.length} days
          </p>
        </div>
        <div
          className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2"
          style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
        >
          <TrendingUp
            size={15}
            strokeWidth={2.2}
            style={{ color: "rgb(var(--color-success))" }}
            aria-hidden
          />
          <span
            className="font-semibold"
            style={{
              color: "rgb(var(--color-text))",
              fontSize: "var(--text-sm)",
            }}
          >
            Peak {formatCompact(peak.views)} on {formatDay(peak.date)}
          </span>
        </div>
      </div>

      <div className="h-64">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Views over the last 30 days"
          className="h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="profile-views-area" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="rgb(var(--brand-primary))"
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor="rgb(var(--brand-primary))"
                stopOpacity="0.02"
              />
            </linearGradient>
            <linearGradient id="profile-views-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgb(var(--brand-primary))" />
              <stop offset="55%" stopColor="rgb(var(--brand-highlight))" />
              <stop offset="100%" stopColor="rgb(var(--brand-accent))" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((line) => (
            <line
              key={line}
              x1={paddingX}
              x2={width - paddingX}
              y1={paddingY + usableHeight * line}
              y2={paddingY + usableHeight * line}
              stroke="rgb(var(--color-border))"
              strokeWidth="1"
              strokeDasharray="5 8"
              opacity="0.75"
            />
          ))}

          {areaPath && <path d={areaPath} fill="url(#profile-views-area)" />}
          <path
            d={linePath}
            fill="none"
            stroke="url(#profile-views-line)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {coords.map((coord, index) => {
            const showPoint =
              index === coords.length - 1 ||
              coord.point.views === peak.views ||
              index === 0;

            if (!showPoint) return null;
            return (
              <circle
                key={`${coord.point.date}-${index}`}
                cx={coord.x}
                cy={coord.y}
                r="4"
                fill="rgb(var(--color-bg-elevated))"
                stroke="rgb(var(--brand-primary))"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      <div
        className="mt-2 flex items-center justify-between"
        style={{
          color: "rgb(var(--color-text-muted))",
          fontSize: "var(--text-xs)",
        }}
      >
        <span>{formatDay(points[0].date)}</span>
        <span>{formatDay(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

function LastSevenBars({ data }: { data: ViewPoint[] }) {
  const points = data.slice(-7);
  if (points.length === 0) return null;
  const maxViews = Math.max(...points.map((point) => point.views), 1);

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "rgb(var(--color-bg-elevated))",
        borderColor: "rgb(var(--color-border))",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p
            className="font-bold"
            style={{
              color: "rgb(var(--color-text))",
              fontSize: "var(--text-base)",
            }}
          >
            Daily pulse
          </p>
          <p
            style={{
              color: "rgb(var(--color-text-muted))",
              fontSize: "var(--text-sm)",
            }}
          >
            Last 7 days
          </p>
        </div>
        <CalendarDays
          size={18}
          strokeWidth={2.1}
          style={{ color: "rgb(var(--brand-accent))" }}
          aria-hidden
        />
      </div>
      <div className="flex h-40 items-end gap-2">
        {points.map((point) => (
          <div
            key={point.date}
            className="flex h-full flex-1 flex-col justify-end gap-2"
          >
            <div
              className="w-full rounded-lg"
              style={{
                minHeight: 6,
                height: `${Math.max(8, (point.views / maxViews) * 124)}px`,
                background:
                  "linear-gradient(to top, rgb(var(--brand-primary)), rgb(var(--brand-highlight)))",
              }}
              title={`${formatCompact(point.views)} views`}
            />
            <span
              className="text-center font-semibold"
              style={{
                color: "rgb(var(--color-text-muted))",
                fontSize: "var(--text-xs)",
              }}
            >
              {new Date(point.date).toLocaleDateString("en", {
                weekday: "narrow",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPanel({ data, lang }: Props) {
  const viewsByDay = data.viewsByDay ?? [];
  const weekChange = getWeekChange(viewsByDay);
  const averageDailyViews =
    viewsByDay.length > 0
      ? Math.round(sumViews(viewsByDay) / viewsByDay.length)
      : 0;
  const engagementRate =
    data.last30DaysViews > 0
      ? (data.last30DaysSaves / data.last30DaysViews) * 100
      : Number.NaN;

  return (
    <section className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              className="font-bold leading-tight"
              style={{
                color: "rgb(var(--color-text))",
                fontSize: "var(--text-base)",
              }}
            >
              Analytics
            </h2>
            <p
              className="mt-1"
              style={{
                color: "rgb(var(--color-text-muted))",
                fontSize: "var(--text-sm)",
              }}
            >
              Last 30 days
            </p>
          </div>
          <div
            className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2"
            style={{
              backgroundColor: "rgb(var(--color-bg-elevated))",
              borderColor: "rgb(var(--color-border))",
              color:
                weekChange >= 0
                  ? "rgb(var(--color-success))"
                  : "rgb(var(--color-error))",
              fontSize: "var(--text-sm)",
            }}
          >
            <Activity size={15} strokeWidth={2.2} aria-hidden />
            <span className="font-semibold">
              {weekChange >= 0 ? "+" : ""}
              {formatPercent(weekChange)} vs previous week
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
          <MetricCard
            icon={Eye}
            label="Views"
            value={formatCompact(data.last30DaysViews)}
            detail={`${formatCompact(averageDailyViews)} daily average`}
            tone="--brand-accent"
          />
          <MetricCard
            icon={Bookmark}
            label="Saved"
            value={formatCompact(data.last30DaysSaves)}
            detail={`${formatPercent(engagementRate)} save rate`}
            tone="--brand-primary"
          />
          <MetricCard
            icon={Users}
            label="New followers"
            value={formatCompact(data.last30DaysFollowers)}
            detail="Audience growth"
            tone="--color-success"
          />
          <MetricCard
            icon={TrendingUp}
            label="Weekly trend"
            value={`${weekChange >= 0 ? "+" : ""}${formatPercent(weekChange)}`}
            detail="Last 7 vs prior 7"
            tone={weekChange >= 0 ? "--color-success" : "--color-error"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <TrendChart data={viewsByDay} />
          <div className="flex flex-col gap-4">
            <LastSevenBars data={viewsByDay} />

            {data.topPost && (
              <Link
                href={`/${lang}/content/${data.topPost.contentId}`}
                scroll={false}
                className="group rounded-lg border p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                  backgroundColor: "rgb(var(--color-bg-elevated))",
                  borderColor: "rgb(var(--color-border))",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: "rgb(var(--brand-highlight) / 0.14)",
                        color: "rgb(var(--brand-highlight))",
                      }}
                    >
                      <Trophy size={18} strokeWidth={2.2} />
                    </div>
                    <div>
                      <p
                        className="font-bold leading-tight"
                        style={{
                          color: "rgb(var(--color-text))",
                          fontSize: "var(--text-base)",
                        }}
                      >
                        Top post
                      </p>
                      <p
                        style={{
                          color: "rgb(var(--color-text-muted))",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        Best performer this month
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    size={17}
                    strokeWidth={2.2}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ color: "rgb(var(--brand-primary))" }}
                    aria-hidden
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  >
                    <p
                      className="font-bold leading-none"
                      style={{
                        color: "rgb(var(--color-text))",
                        fontSize: "var(--text-base)",
                      }}
                    >
                      {formatCompact(data.topPost.views)}
                    </p>
                    <p
                      className="mt-1"
                      style={{
                        color: "rgb(var(--color-text-muted))",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      Views
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  >
                    <p
                      className="font-bold leading-none"
                      style={{
                        color: "rgb(var(--color-text))",
                        fontSize: "var(--text-base)",
                      }}
                    >
                      {formatCompact(data.topPost.saves)}
                    </p>
                    <p
                      className="mt-1"
                      style={{
                        color: "rgb(var(--color-text-muted))",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      Saved
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
