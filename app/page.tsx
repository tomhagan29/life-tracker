const accounts = [
  { name: "Main checking", balance: "$8,420", change: "+$860", tone: "bg-emerald-500" },
  { name: "High-yield savings", balance: "$26,180", change: "+$340", tone: "bg-sky-500" },
  { name: "Credit card", balance: "$1,284", change: "-$240", tone: "bg-rose-500" },
];

const budgets = [
  { label: "Home", spent: 1840, total: 2200, color: "bg-cyan-500" },
  { label: "Food", spent: 620, total: 820, color: "bg-lime-500" },
  { label: "Transport", spent: 210, total: 360, color: "bg-amber-500" },
  { label: "Fun", spent: 340, total: 500, color: "bg-fuchsia-500" },
];

const habits = [
  { name: "Morning walk", streak: "18 days", progress: 86, mark: "05:45" },
  { name: "Read", streak: "11 days", progress: 64, mark: "20 pages" },
  { name: "No spend", streak: "6 days", progress: 72, mark: "$0" },
  { name: "Meal prep", streak: "4 weeks", progress: 91, mark: "Done" },
];

const transactions = [
  { item: "Salary deposit", category: "Income", amount: "+$4,850", date: "Apr 24" },
  { item: "Rent", category: "Home", amount: "-$1,450", date: "Apr 22" },
  { item: "Groceries", category: "Food", amount: "-$86", date: "Apr 21" },
  { item: "Index fund", category: "Invest", amount: "-$500", date: "Apr 20" },
];

const goals = [
  { title: "Emergency fund", value: "$26.1k", target: "$30k", progress: 87 },
  { title: "Vacation fund", value: "$3.8k", target: "$6k", progress: 63 },
  { title: "Debt payoff", value: "$1.2k", target: "$0", progress: 76 },
];

const week = ["M", "T", "W", "T", "F", "S", "S"];

function StatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
        </div>
        <span className={`h-3 w-3 rounded-full ${accent}`} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm text-zinc-600">{detail}</p>
    </section>
  );
}

function ProgressBar({ value, color = "bg-emerald-500" }: { value: number; color?: string }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-zinc-200 bg-white px-5 py-4 lg:border-b-0 lg:border-r lg:py-6">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Ledgerly</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal">Life tracker</h1>
            </div>
            <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white lg:mt-8 lg:w-full">
              + Log
            </button>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto text-sm font-medium lg:flex-col lg:overflow-visible">
            {["Overview", "Accounts", "Budgets", "Habits", "Goals", "Settings"].map((item, index) => (
              <a
                key={item}
                className={`whitespace-nowrap rounded-lg px-3 py-2 ${
                  index === 0 ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
                href="#"
              >
                {item}
              </a>
            ))}
          </nav>

          <section className="mt-8 hidden rounded-lg border border-zinc-200 bg-[#eef8f2] p-4 lg:block">
            <p className="text-sm font-semibold text-zinc-950">April snapshot</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              You are $412 under budget with four habits on pace for a monthly best.
            </p>
          </section>
        </aside>

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Friday, April 24</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">Finance and habits command center</h2>
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

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Net worth" value="$74,286" detail="+8.4% over last month" accent="bg-emerald-500" />
            <StatCard label="Cash flow" value="$2,186" detail="$5,240 in, $3,054 out" accent="bg-sky-500" />
            <StatCard label="Budget left" value="$1,124" detail="19 days remaining" accent="bg-amber-500" />
            <StatCard label="Habit score" value="82%" detail="31 completions this week" accent="bg-fuchsia-500" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
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
                {[44, 58, 52, 70, 46, 80, 68, 76, 61, 84, 72, 92].map((height, index) => (
                  <div key={index} className="flex h-full flex-col justify-end gap-1">
                    <div className="rounded-t-md bg-teal-500" style={{ height: `${height}%` }} />
                    <div className="rounded-t-md bg-zinc-900" style={{ height: `${Math.max(18, height - 30)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-600">
                <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Income</span>
                <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-zinc-900" /> Outgoing</span>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">Today</h3>
                  <p className="mt-1 text-sm text-zinc-500">Payments and habit check-ins</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">On track</span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Pay electricity", "Due today", "$74"],
                  ["Walk", "Completed", "6,420 steps"],
                  ["Journal", "Planned", "9:30 pm"],
                  ["Transfer to savings", "Scheduled", "$300"],
                ].map(([task, status, meta]) => (
                  <div key={task} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3">
                    <div>
                      <p className="font-semibold">{task}</p>
                      <p className="mt-1 text-sm text-zinc-500">{status}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">{meta}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-semibold">Accounts</h3>
              <div className="mt-5 space-y-4">
                {accounts.map((account) => (
                  <div key={account.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`h-10 w-10 rounded-lg ${account.tone}`} />
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        <p className="text-sm text-zinc-500">{account.change} this month</p>
                      </div>
                    </div>
                    <p className="font-semibold">{account.balance}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-semibold">Budgets</h3>
              <div className="mt-5 space-y-4">
                {budgets.map((budget) => {
                  const percent = Math.round((budget.spent / budget.total) * 100);
                  return (
                    <div key={budget.label}>
                      <div className="flex justify-between gap-4 text-sm">
                        <p className="font-semibold">{budget.label}</p>
                        <p className="text-zinc-500">${budget.spent} / ${budget.total}</p>
                      </div>
                      <ProgressBar value={percent} color={budget.color} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-semibold">Habit week</h3>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {week.map((day, index) => (
                  <div key={`${day}-${index}`} className="text-center">
                    <p className="text-xs font-semibold text-zinc-500">{day}</p>
                    <div
                      className={`mt-2 flex aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                        index < 5 ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {index < 5 ? "✓" : ""}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {habits.map((habit) => (
                  <div key={habit.name}>
                    <div className="flex justify-between gap-4 text-sm">
                      <p className="font-semibold">{habit.name}</p>
                      <p className="text-zinc-500">{habit.streak}</p>
                    </div>
                    <ProgressBar value={habit.progress} color="bg-violet-500" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-semibold">Goals</h3>
              <div className="mt-5 space-y-5">
                {goals.map((goal) => (
                  <div key={goal.title}>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="font-semibold">{goal.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">{goal.value} of {goal.target}</p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-700">{goal.progress}%</p>
                    </div>
                    <ProgressBar value={goal.progress} color="bg-teal-600" />
                  </div>
                ))}
              </div>
            </div>

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
          </section>
        </div>
      </div>
    </main>
  );
}
