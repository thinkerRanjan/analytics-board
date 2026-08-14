import type { OverviewMetrics, TenantConfig, Widget } from "@analytics/shared";
import { KpiCard } from "./KpiCard";
import { TrendChart } from "./charts/TrendChart";
import { SourceBreakdownChart } from "./charts/SourceBreakdownChart";
import { TopPagesChart } from "./charts/TopPagesChart";

type DashboardRendererProps = {
  config: TenantConfig["dashboard"];
  data: OverviewMetrics;
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  );
}

function WidgetPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function renderWidget(widget: Widget, data: OverviewMetrics) {
  switch (widget.type) {
    case "kpi":
      return (
        <KpiCard
          key={widget.id}
          label={widget.label}
          value={data.kpis[widget.metric]}
        />
      );
    case "trend":
      return (
        <WidgetPanel
          key={widget.id}
          title={`${widget.metric.charAt(0).toUpperCase()}${widget.metric.slice(1)} over time`}
          subtitle="Daily trend for the selected range"
        >
          {data.trend.length === 0 ? (
            <EmptyState message="No trend data for this range." />
          ) : (
            <TrendChart data={data.trend} metric={widget.metric} />
          )}
        </WidgetPanel>
      );
    case "sources":
      return (
        <WidgetPanel
          key={widget.id}
          title="Traffic sources"
          subtitle="Top sources by sessions"
        >
          {data.sources.length === 0 ? (
            <EmptyState message="No source data for this range." />
          ) : (
            <SourceBreakdownChart data={data.sources} />
          )}
        </WidgetPanel>
      );
    case "pages":
      return (
        <WidgetPanel
          key={widget.id}
          title="Top pages"
          subtitle="Highest pageview paths"
        >
          {data.pages.length === 0 ? (
            <EmptyState message="No page data for this range." />
          ) : (
            <TopPagesChart data={data.pages} />
          )}
        </WidgetPanel>
      );
    default:
      return null;
  }
}

export function DashboardRenderer({ config, data }: DashboardRendererProps) {
  const kpiWidgets = config.widgets.filter((w) => w.type === "kpi");
  const otherWidgets = config.widgets.filter((w) => w.type !== "kpi");

  return (
    <div className="flex flex-col gap-6">
      {kpiWidgets.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpiWidgets.map((widget) => renderWidget(widget, data))}
        </section>
      ) : null}

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
    </div>
  );
}
