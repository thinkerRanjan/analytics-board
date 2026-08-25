import Link from "next/link";
import {
  COMMENTARY_TEAM_COPY,
  COMMENTARY_TEAM_IDS,
  COMMENTARY_TEAM_NAV,
  INSIGHT_TEAM_COPY,
  departmentHref,
} from "@analytics/shared";

type DepartmentIndexRendererProps = {
  pageId: string;
  variant: "commentary" | "insights";
  query?: string;
};

export function DepartmentIndexRenderer({
  pageId,
  variant,
  query,
}: DepartmentIndexRendererProps) {
  const copy = variant === "commentary" ? COMMENTARY_TEAM_COPY : INSIGHT_TEAM_COPY;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {COMMENTARY_TEAM_IDS.map((teamId) => {
        const href = query
          ? `${departmentHref(pageId, teamId)}?${query}`
          : departmentHref(pageId, teamId);

        return (
          <li key={teamId}>
            <Link
              href={href}
              className="surface-card group block h-full p-4 transition-colors hover:border-accent"
            >
              <p className="text-sm font-semibold text-foreground group-hover:text-accent">
                {COMMENTARY_TEAM_NAV[teamId].title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {copy[teamId].blurb}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
