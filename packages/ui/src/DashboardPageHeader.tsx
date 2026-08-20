type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  dateLabel?: string;
  mock?: boolean;
};

export function DashboardPageHeader({
  title,
  description,
  dateLabel,
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

      {dateLabel ? (
        <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground-soft">
          <svg
            aria-hidden
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
            <path strokeLinecap="round" d="M8 3.5v3M16 3.5v3M3.5 10h17" />
          </svg>
          {dateLabel}
        </p>
      ) : null}
    </div>
  );
}
