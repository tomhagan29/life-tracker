import { todayItems } from "./data";

export function TodayCard() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Today</h3>
          <p className="mt-1 text-sm text-zinc-500">Payments and habit check-ins</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
          On track
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {todayItems.map((item) => (
          <div key={item.task} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3">
            <div>
              <p className="font-semibold">{item.task}</p>
              <p className="mt-1 text-sm text-zinc-500">{item.status}</p>
            </div>
            <p className="text-sm font-semibold text-zinc-700">{item.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
