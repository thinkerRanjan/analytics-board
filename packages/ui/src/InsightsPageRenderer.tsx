import type { CommentaryTeamId, InsightReport } from "@analytics/shared";
import { INSIGHT_CATEGORY_COPY, INSIGHT_TEAM_COPY } from "@analytics/shared";
import { TeamBriefingRenderer } from "./TeamBriefingRenderer";

type InsightsPageRendererProps = {
  report: InsightReport;
  teamId?: CommentaryTeamId;
};

export function InsightsPageRenderer({
  report,
  teamId,
}: InsightsPageRendererProps) {
  const teams = teamId
    ? report.teams.filter((team) => team.id === teamId)
    : report.teams;

  if (teams.length === 0) {
    return (
      <div className="surface-dashed flex h-48 items-center justify-center px-6 text-center text-sm text-muted">
        No inferences are available for this department in this date range.
      </div>
    );
  }

  return (
    <TeamBriefingRenderer
      headline={report.headline}
      generatedAt={report.generatedAt}
      cached={report.cached}
      teams={teams}
      teamCopy={INSIGHT_TEAM_COPY}
      categoryCopy={INSIGHT_CATEGORY_COPY}
      hideTeamHeading={Boolean(teamId)}
    />
  );
}
