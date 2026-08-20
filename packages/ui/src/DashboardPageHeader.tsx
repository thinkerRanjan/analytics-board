type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  mock?: boolean;
};

export function DashboardPageHeader({
  title,
  description,
  mock,
}: DashboardPageHeaderProps) {
  return (
    <div>
      <div
        className="reveal-group"
        tabIndex={description ? 0 : undefined}
        aria-label={description ? `${title}. Hover or focus for details.` : undefined}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <svg
              aria-hidden
              className="reveal-caret h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9.5l6 6 6-6" />
            </svg>
          ) : null}
          {mock ? <span className="badge-soft">Mock data</span> : null}
        </div>

        {description ? (
          <div className="reveal-panel">
            <div>
              <p className="max-w-2xl text-sm text-muted">{description}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
