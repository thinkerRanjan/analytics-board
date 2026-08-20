export default function DashboardPageLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <div className="skeleton h-8 w-64 animate-pulse" />
        <div className="skeleton h-4 w-96 max-w-full animate-pulse" />
        <div className="skeleton h-6 w-52 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-28 animate-pulse" />
        ))}
      </div>
      <div className="skeleton h-80 animate-pulse" />
    </div>
  );
}
