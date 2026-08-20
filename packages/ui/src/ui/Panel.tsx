type PanelProps = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: PanelProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <section className={`surface-card p-5 ${className}`}>
      {hasHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={hasHeader ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}
