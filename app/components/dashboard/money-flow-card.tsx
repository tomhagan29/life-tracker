import type { DashboardMoneyFlowBar } from "@/app/actions/dashboard";

export function MoneyFlowCard({ bars }: { bars: DashboardMoneyFlowBar[] }) {
  const hasFlow = bars.some(
    (bar) => bar.incomePercent > 0 || bar.outgoingPercent > 0,
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Monthly money flow</h3>
          <p className="mt-1 text-sm text-zinc-500">Income, bills, savings, and variable spend</p>
        </div>
        <div className="flex rounded-lg bg-zinc-100 p-1 text-sm font-semibold">
          <button className="rounded-md bg-white px-3 py-1.5 shadow-sm">Month</button>
          <button className="px-3 py-1.5 text-zinc-500">Year</button>
        </div>
      </div>

      {hasFlow ? (
        <div className="mt-6 grid h-72 grid-cols-12 items-end gap-2 border-b border-zinc-200 pb-4">
          {bars.map((bar) => (
            <div
              key={bar.label}
              className="flex h-full flex-col justify-end gap-1"
              title={bar.label}
            >
              <div
                className="rounded-t-md bg-teal-500"
                style={{ height: `${bar.incomePercent}%` }}
              />
              <div
                className="rounded-t-md bg-zinc-900"
                style={{ height: `${bar.outgoingPercent}%` }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
          No transaction activity yet
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-600">
        <span className="flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Income
        </span>
        <span className="flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-full bg-zinc-900" /> Outgoing
        </span>
      </div>
    </div>
  );
}
