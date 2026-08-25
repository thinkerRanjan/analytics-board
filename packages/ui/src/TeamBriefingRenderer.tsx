import type { CommentaryTeamId } from "@analytics/shared";

export type BriefingCardView = {
  id: string;
  category: string;
  title: string;
  body: string;
};

export type BriefingTeamView = {
  id: CommentaryTeamId;
  title: string;
  summary?: string;
  cards: BriefingCardView[];
};

type TeamBriefingRendererProps = {
  headline?: string;
  generatedAt: string;
  cached: boolean;
  teams: BriefingTeamView[];
  teamCopy: Record<CommentaryTeamId, { title: string; blurb: string }>;
  categoryCopy: Record<string, { label: string }>;
  hideTeamHeading?: boolean;
};

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function TeamBriefingRenderer({
  headline,
  generatedAt,
  cached,
  teams,
  teamCopy,
  categoryCopy,
  hideTeamHeading = false,
}: TeamBriefingRendererProps) {
  const ordered = orderTeams(teams);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {headline ? (
          <p className="max-w-5xl text-sm leading-relaxed text-foreground-soft">{headline}</p>
        ) : null}
        <span className="badge-soft">
          {cached ? "Cached" : "Fresh"} · {formatGeneratedAt(generatedAt)}
        </span>
      </div>

      <div className="flex flex-col gap-8">
        {ordered.map((team) => {
          const copy = teamCopy[team.id];
          return (
            <section key={team.id} className="flex flex-col gap-3">
              {hideTeamHeading ? (
                team.summary ? (
                  <p className="text-xs text-muted">{team.summary}</p>
                ) : null
              ) : (
                <header>
                  <h2 className="text-base font-semibold text-foreground">
                    {team.title || copy.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {team.summary || copy.blurb}
                  </p>
                </header>
              )}
              <ul className="grid gap-3 sm:grid-cols-2">
                {team.cards.map((card) => (
                  <li key={card.id}>
                    <article className="surface-card h-full p-4">
                      <span
                        className={`commentary-chip commentary-chip-${card.category}`}
                      >
                        {categoryCopy[card.category]?.label ?? card.category}
                      </span>
                      <h3 className="mt-2.5 text-sm font-semibold leading-snug text-foreground">
                        {card.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">
                        {card.body}
                      </p>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function orderTeams(teams: BriefingTeamView[]): BriefingTeamView[] {
  const rank: Record<string, number> = {
    marketing: 0,
    sales: 1,
    manufacturing: 2,
    inventory: 3,
  };
  return [...teams].sort((a, b) => (rank[a.id] ?? 9) - (rank[b.id] ?? 9));
}
