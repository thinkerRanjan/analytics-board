import type { CommentaryReport, CommentaryTeamId } from "@analytics/shared";
import {
  COMMENTARY_CATEGORY_COPY,
  COMMENTARY_TEAM_COPY,
} from "@analytics/shared";
import { TeamBriefingRenderer } from "./TeamBriefingRenderer";

type CommentaryPageRendererProps = {
  report: CommentaryReport;
  teamId?: CommentaryTeamId;
};

export function CommentaryPageRenderer({
  report,
  teamId,
}: CommentaryPageRendererProps) {
  const teams = teamId
    ? report.teams.filter((team) => team.id === teamId)
    : report.teams;

  if (teams.length === 0) {
    return (
      <div className="surface-dashed flex h-48 items-center justify-center px-6 text-center text-sm text-muted">
        No commentary is available for this department in this date range.
      </div>
    );
  }

  return (
    <TeamBriefingRenderer
      headline={report.headline}
      generatedAt={report.generatedAt}
      cached={report.cached}
      teams={teams}
      teamCopy={COMMENTARY_TEAM_COPY}
      categoryCopy={COMMENTARY_CATEGORY_COPY}
      hideTeamHeading={Boolean(teamId)}
    />
  );
}
