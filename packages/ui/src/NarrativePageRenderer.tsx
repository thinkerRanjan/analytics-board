import type { NarrativeSection } from "@analytics/shared";

type NarrativePageRendererProps = {
  sections: NarrativeSection[];
};

export function NarrativePageRenderer({ sections }: NarrativePageRendererProps) {
  if (sections.length === 0) {
    return (
      <div className="surface-dashed flex h-48 items-center justify-center px-6 text-center text-sm text-muted">
        No notes have been added for this page yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <article key={section.id} className="surface-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {section.title}
            </h2>
            {section.updatedAt ? (
              <time className="text-xs text-muted" dateTime={section.updatedAt}>
                {section.updatedAt}
              </time>
            ) : null}
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground-soft">
            {section.body}
          </div>
        </article>
      ))}
    </div>
  );
}
