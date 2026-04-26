import { moneyFlowBars } from "./data";

export function MoneyFlowCard() {
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

      <div className="mt-6 grid h-72 grid-cols-12 items-end gap-2 border-b border-zinc-200 pb-4">
        {moneyFlowBars.map((height, index) => (
          <div key={index} className="flex h-full flex-col justify-end gap-1">
            <div className="rounded-t-md bg-teal-500" style={{ height: `${height}%` }} />
            <div className="rounded-t-md bg-zinc-900" style={{ height: `${Math.max(18, height - 30)}%` }} />
          </div>
        ))}
      </div>
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
