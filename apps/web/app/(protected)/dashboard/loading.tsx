/** Skeleton shown while a dashboard page streams in. Mirrors the overview composition. */
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:gap-6"
      role="status"
      aria-label="Loading dashboard"
    >
      <div className="sf-panel h-56 sf-skeleton" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="sf-panel h-[10.5rem] p-5">
            <div className="sf-skeleton h-9 w-40" />
            <div className="sf-skeleton mt-8 h-10 w-20" />
            <div className="sf-skeleton mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="sf-panel h-80 p-6">
          <div className="sf-skeleton h-5 w-40" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="sf-skeleton mt-5 h-12 w-full" />
          ))}
        </div>
        <div className="sf-panel h-80 sf-skeleton" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
