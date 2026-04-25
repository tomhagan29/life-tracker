import { habits, transactions } from "./data";

export function RecentActivityCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Recent activity</h3>
          <p className="mt-1 text-sm text-zinc-500">Money moves and habit records</p>
        </div>
        <button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold">Filter</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Entry</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transactions.map((transaction) => (
              <tr key={transaction.item}>
                <td className="px-5 py-4 font-semibold">{transaction.item}</td>
                <td className="px-5 py-4 text-zinc-500">{transaction.category}</td>
                <td className="px-5 py-4 text-zinc-500">{transaction.date}</td>
                <td className="px-5 py-4 text-right font-semibold">{transaction.amount}</td>
              </tr>
            ))}
            {habits.slice(0, 3).map((habit) => (
              <tr key={habit.name}>
                <td className="px-5 py-4 font-semibold">{habit.name}</td>
                <td className="px-5 py-4 text-zinc-500">Habit</td>
                <td className="px-5 py-4 text-zinc-500">Today</td>
                <td className="px-5 py-4 text-right font-semibold">{habit.mark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
