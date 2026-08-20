import type { OverviewMetrics, PlannedSection, Widget } from "@analytics/shared";
import { KpiCard } from "./KpiCard";
import { TrendChart } from "./charts/TrendChart";
import { SourceBreakdownChart } from "./charts/SourceBreakdownChart";
import { TopPagesChart } from "./charts/TopPagesChart";
import { SectionPlaceholder } from "./SectionPlaceholder";
import { Panel } from "./ui/Panel";

type MetricsPageRendererProps = {
  widgets: Widget[];
  plannedSections?: PlannedSection[];
  data: OverviewMetrics;
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface-dashed flex h-48 items-center justify-center text-sm text-muted">
      {message}
    </div>
  );
}

function renderWidget(widget: Widget, data: OverviewMetrics) {
  switch (widget.type) {
    case "kpi":
      return (
        <KpiCard
          key={widget.id}
          label={widget.label}
          metric={widget.metric}
          value={data.kpis[widget.metric]}
          spark={data.trend.map((point) => point[widget.metric])}
        />
      );
    case "trend":
      return (
        <Panel
          key={widget.id}
          title={`${widget.metric.charAt(0).toUpperCase()}${widget.metric.slice(1)} over time`}
          subtitle="Daily trend for the selected range"
          action={<span className="badge-soft">Daily</span>}
        >
          {data.trend.length === 0 ? (
            <EmptyState message="No trend data for this range." />
          ) : (
            <TrendChart data={data.trend} metric={widget.metric} />
          )}
        </Panel>
      );
    case "sources":
      return (
        <Panel
          key={widget.id}
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
          key={widget.id}
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
          {kpiWidgets.map((widget) => renderWidget(widget, data))}
        </section>
      ) : null}

      {otherWidgets.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {otherWidgets.map((widget) => {
            const node = renderWidget(widget, data);
            if (widget.type === "trend") {
              return (
                <div key={widget.id} className="lg:col-span-2">
                  {node}
                </div>
              );
            }
            return node;
          })}
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
