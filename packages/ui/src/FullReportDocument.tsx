import type { CSSProperties } from "react";
import type {
  FullDashboardReport,
  FullReportPageSection,
  ReportBrand,
} from "@analytics/shared";
import { CommentaryPageRenderer } from "./CommentaryPageRenderer";
import { InsightsPageRenderer } from "./InsightsPageRenderer";
import { MetricsPageRenderer } from "./MetricsPageRenderer";
import { NarrativePageRenderer } from "./NarrativePageRenderer";
import { ProductIndexRenderer } from "./ProductIndexRenderer";

const FALLBACK_BRAND: ReportBrand = {
  coverBackground: "#f6f4ee",
  coverForeground: "#1c2b22",
  accent: "#c81e2b",
};

type FullReportDocumentProps = {
  report: FullDashboardReport;
};

export function FullReportDocument({ report }: FullReportDocumentProps) {
  const brand = report.brand ?? FALLBACK_BRAND;
  const period = formatPeriod(report.start, report.end);
  const generated = formatGeneratedAt(report.generatedAt);

  return (
    <div
      data-theme="light"
      className="report-root"
      style={
        {
          "--report-cover-bg": brand.coverBackground,
          "--report-cover-fg": brand.coverForeground,
          "--report-accent": brand.accent,
        } as CSSProperties
      }
    >
      <ReportCover
        report={report}
        brand={brand}
        period={period}
        generated={generated}
      />
      <ReportTableOfContents sections={report.sections} />
      {report.sections.map((section, index) => (
        <ReportSection
          key={section.page.id}
          section={section}
          chapter={index + 1}
          tenantName={report.tenantName}
          tenantLogo={report.tenantLogo}
          period={period}
        />
      ))}
    </div>
  );
}

function ReportCover({
  report,
  brand,
  period,
  generated,
}: {
  report: FullDashboardReport;
  brand: ReportBrand;
  period: string;
  generated: string;
}) {
  return (
    <header className="report-cover">
      <div className="report-cover-inner">
        <p className="report-cover-eyebrow">Confidential analytics briefing</p>
        {report.tenantLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.tenantLogo}
            alt={`${report.tenantName} logo`}
            className="report-cover-logo"
          />
        ) : null}
        <div className="report-cover-rule" />
        <h1 className="report-cover-title">{report.tenantName}</h1>
        <p className="report-cover-subtitle">Digital Performance Report</p>
        <p className="report-cover-dashboard">{report.dashboardTitle}</p>
        {brand.tagline ? (
          <p className="report-cover-tagline">{brand.tagline}</p>
        ) : null}
      </div>

      <div className="report-cover-meta">
        <div>
          <p className="report-cover-meta-label">Reporting period</p>
          <p className="report-cover-meta-value">{period}</p>
        </div>
        <div>
          <p className="report-cover-meta-label">Prepared</p>
          <p className="report-cover-meta-value">{generated}</p>
        </div>
        {report.mock ? (
          <p className="report-cover-meta-note">Figures in this edition use sample data.</p>
        ) : null}
        <p className="report-cover-credit">
          Created by BIUP Technologies Pvt. Ltd.
        </p>
        <p className="report-cover-footer">Prepared for internal use</p>
      </div>
    </header>
  );
}

function ReportTableOfContents({
  sections,
}: {
  sections: FullReportPageSection[];
}) {
  return (
    <nav className="report-toc" aria-label="Table of contents">
      <p className="report-kicker">Document map</p>
      <h1 className="report-toc-title">Contents</h1>
      <ol className="report-toc-list">
        {sections.map((section, index) => {
          const models =
            section.page.kind === "productIndex" ? section.models : undefined;
          return (
            <li key={section.page.id} className="report-toc-item">
              <div className="report-toc-row">
                <span className="report-toc-num">{padChapter(index + 1)}</span>
                <div className="report-toc-copy">
                  <p className="report-toc-heading">{section.page.title}</p>
                  {section.page.description ? (
                    <p className="report-toc-desc">{section.page.description}</p>
                  ) : null}
                </div>
              </div>
              {models && models.length > 0 ? (
                <ul className="report-toc-sub">
                  {models.map((model) => (
                    <li key={model.model}>{model.model}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ReportSection({
  section,
  chapter,
  tenantName,
  tenantLogo,
  period,
}: {
  section: FullReportPageSection;
  chapter: number;
  tenantName: string;
  tenantLogo?: string;
  period: string;
}) {
  const { page, result, error, models } = section;
  const mock =
    result?.kind === "metrics"
      ? result.data.mock
      : result?.kind === "productIndex"
        ? result.mock
        : result?.kind === "aiCommentary" || result?.kind === "aiInsights"
          ? result.report.mock
          : false;

  return (
    <section className="report-section">
      <header className="report-chapter-head">
        {tenantLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenantLogo} alt="" className="report-chapter-mark" />
        ) : null}
        <p className="report-kicker">
          Chapter {padChapter(chapter)}
        </p>
        <h1 className="report-chapter-title">{page.title}</h1>
        {page.description ? (
          <p className="report-chapter-desc">{page.description}</p>
        ) : null}
        {mock ? <span className="badge-soft">Mock data</span> : null}
      </header>

      <div className="report-chapter-body">
        {error ? (
          <div className="page-error" role="alert">
            {error}
          </div>
        ) : null}

        {!error && result?.kind === "metrics" && page.kind === "metrics" ? (
          <MetricsPageRenderer
            widgets={page.widgets}
            plannedSections={page.plannedSections}
            data={result.data}
          />
        ) : null}

        {!error &&
        result?.kind === "productIndex" &&
        page.kind === "productIndex" ? (
          <>
            <ProductIndexRenderer
              pageId={page.id}
              models={result.models}
              plain
            />
            {models?.map((modelSection) => (
              <section
                key={modelSection.model}
                className="report-subsection"
              >
                <h2 className="report-subsection-title">{modelSection.model}</h2>
                {modelSection.error ? (
                  <div className="page-error" role="alert">
                    {modelSection.error}
                  </div>
                ) : null}
                {modelSection.data ? (
                  <MetricsPageRenderer
                    widgets={page.widgets}
                    plannedSections={page.plannedSections}
                    data={modelSection.data}
                  />
                ) : null}
              </section>
            ))}
          </>
        ) : null}

        {!error && result?.kind === "narrative" ? (
          <NarrativePageRenderer sections={result.sections} />
        ) : null}

        {!error && result?.kind === "aiCommentary" ? (
          <CommentaryPageRenderer report={result.report} />
        ) : null}

        {!error && result?.kind === "aiInsights" ? (
          <InsightsPageRenderer report={result.report} />
        ) : null}
      </div>

      <footer className="report-running-footer">
        <span>{tenantName}</span>
        <span>Confidential</span>
        <span>{period}</span>
      </footer>
    </section>
  );
}

function padChapter(n: number): string {
  return String(n).padStart(2, "0");
}

function formatPeriod(start: string, end: string): string {
  return `${formatLongDate(start)} – ${formatLongDate(end)}`;
}

function formatLongDate(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
