import type {
  MetricId,
  OverviewMetrics,
  PlannedSection,
  Widget,
} from "@analytics/shared";
import { KpiCard } from "./KpiCard";
import { TrendChart } from "./charts/TrendChart";
import { SourceBreakdownChart } from "./charts/SourceBreakdownChart";
import { TopPagesChart } from "./charts/TopPagesChart";
import { BreakdownBarChart } from "./charts/BreakdownBarChart";
import { DonutChart } from "./charts/DonutChart";
import { SectionPlaceholder } from "./SectionPlaceholder";
import { Panel } from "./ui/Panel";

type MetricsPageRendererProps = {
  widgets: Widget[];
  plannedSections?: PlannedSection[];
  data: OverviewMetrics;
};

const METRIC_LABELS: Record<MetricId, string> = {
  sessions: "Sessions",
  users: "Users",
  pageviews: "Pageviews",
  conversions: "Conversions",
  activeUsers: "Active users",
  newUsers: "New users",
  avgSessionSeconds: "Avg. session time",
};

const METRIC_TITLES: Record<MetricId, string> = {
  sessions: "Sessions over time",
  users: "Users over time",
  pageviews: "Pageviews over time",
  conversions: "Conversions over time",
  activeUsers: "Active users",
  newUsers: "New users",
  avgSessionSeconds: "Average session time",
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface-dashed flex h-48 items-center justify-center px-6 text-center text-sm text-muted">
      {message}
    </div>
  );
}

function renderWidget(widget: Widget, data: OverviewMetrics) {
  switch (widget.type) {
    case "kpi":
      return (
        <KpiCard
          label={widget.label}
          metric={widget.metric}
          value={data.kpis[widget.metric]}
          spark={data.trend.map((point) => point[widget.metric])}
        />
      );

    case "trend": {
      const isDuration = widget.metric === "avgSessionSeconds";
      return (
        <Panel
          title={widget.title ?? METRIC_TITLES[widget.metric]}
          subtitle={widget.subtitle ?? "Daily trend for the selected range"}
          action={<span className="badge-soft">Daily</span>}
        >
          {data.trend.length === 0 ? (
            <EmptyState message="No trend data for this range." />
          ) : (
            <TrendChart
              data={data.trend}
              dataKey={widget.metric}
              label={METRIC_LABELS[widget.metric]}
              format={isDuration ? "duration" : "number"}
            />
          )}
        </Panel>
      );
    }

    case "eventTrend": {
      const total = data.trend.reduce(
        (sum, point) => sum + (point.events?.[widget.eventName] ?? 0),
        0,
      );
      return (
        <Panel
          title={widget.title}
          subtitle={widget.subtitle ?? "Daily event count for the selected range"}
          action={<span className="badge-soft">Daily</span>}
        >
          {total === 0 ? (
            <EmptyState
              message={`No ${widget.eventName} events recorded in this range.`}
            />
          ) : (
            <TrendChart
              data={data.trend}
              dataKey={`events.${widget.eventName}`}
              label={widget.title}
            />
          )}
        </Panel>
      );
    }

    case "breakdown": {
      const rows = (data.breakdowns?.[widget.dimension] ?? []).slice(
        0,
        widget.limit,
      );
      const hasData = rows.some((row) => row.value > 0);
      return (
        <Panel
          title={widget.title}
          subtitle={widget.subtitle ?? "Distinct users in the selected range"}
          action={
            <span className="badge-soft">
              {widget.chart === "donut" ? "Share" : `Top ${rows.length}`}
            </span>
          }
        >
          {!hasData ? (
            <EmptyState message="No audience data for this range." />
          ) : widget.chart === "donut" ? (
            <DonutChart data={rows} />
          ) : (
            <BreakdownBarChart data={rows} />
          )}
        </Panel>
      );
    }

    case "sources":
      return (
        <Panel
          title="Traffic sources"
          subtitle="Top sources by sessions"
          action={<span className="badge-soft">Top 10</span>}
        >
          {data.sources.length === 0 ? (
            <EmptyState message="No source data for this range." />
          ) : (
            <SourceBreakdownChart data={data.sources} />
          )}
        </Panel>
      );

    case "pages":
      return (
        <Panel
          title="Top pages"
          subtitle="Highest pageview paths"
          action={<span className="badge-soft">Top 10</span>}
        >
          {data.pages.length === 0 ? (
            <EmptyState message="No page data for this range." />
          ) : (
            <TopPagesChart data={data.pages} />
          )}
        </Panel>
      );

    default:
      return null;
  }
}

function isFullWidth(widget: Widget): boolean {
  if (
    widget.type === "trend" ||
    widget.type === "eventTrend" ||
    widget.type === "breakdown"
  ) {
    return widget.span !== "half";
  }
  return false;
}

export function MetricsPageRenderer({
  widgets,
  plannedSections = [],
  data,
}: MetricsPageRendererProps) {
  const kpiWidgets = widgets.filter((w) => w.type === "kpi");
  const otherWidgets = widgets.filter((w) => w.type !== "kpi");

  return (
    <div className="flex flex-col gap-5">
      {kpiWidgets.length > 0 ? (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpiWidgets.map((widget) => (
            <div key={widget.id}>{renderWidget(widget, data)}</div>
          ))}
        </section>
      ) : null}

      {otherWidgets.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {otherWidgets.map((widget) => (
            <div
              key={widget.id}
              className={isFullWidth(widget) ? "lg:col-span-2" : undefined}
            >
              {renderWidget(widget, data)}
            </div>
          ))}
        </div>
      ) : null}

      {plannedSections.length > 0 ? (
        <SectionPlaceholder sections={plannedSections} />
      ) : null}
    </div>
  );
}

/** @deprecated Use MetricsPageRenderer */
export const DashboardRenderer = MetricsPageRenderer;
