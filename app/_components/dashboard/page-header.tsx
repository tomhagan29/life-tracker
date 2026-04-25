export function PageHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-500">Friday, April 24</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">
          Finance and habits command center
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm">
          Export
        </button>
        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
          New entry
        </button>
      </div>
    </header>
  );
}
