import type { PlannedSection } from "@analytics/shared";

type SectionPlaceholderProps = {
  sections: PlannedSection[];
};

export function SectionPlaceholder({ sections }: SectionPlaceholderProps) {
  return (
    <section className="surface-dashed p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Planned sections</h2>
        <span className="badge-soft">Coming soon</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        These charts will be wired up once their queries are configured.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section.id} className="surface-card p-4">
            <p className="text-sm font-medium text-foreground">{section.title}</p>
            {section.description ? (
              <p className="mt-1 text-xs text-muted">{section.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
