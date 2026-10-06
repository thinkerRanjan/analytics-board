export default function ExportReportLoading() {
  return (
    <div
      className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading report"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-32 animate-pulse" />
        <div className="skeleton h-9 w-80 max-w-full animate-pulse" />
        <div className="skeleton h-4 w-52 animate-pulse" />
      </div>
      <div className="skeleton h-64 animate-pulse" />
      <div className="skeleton h-80 animate-pulse" />
    </div>
  );
}
