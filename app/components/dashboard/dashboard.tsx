import { AccountsCard } from "./accounts-card";
import { BudgetsCard } from "./budgets-card";
import { GoalsCard } from "./goals-card";
import { HabitWeekCard } from "./habit-week-card";
import { MoneyFlowCard } from "./money-flow-card";
import { PageHeader } from "../shared/page-header";
import { RecentActivityCard } from "./recent-activity-card";
import { Sidebar } from "../shared/sidebar";
import { StatCard } from "./stat-card";
import { TodayCard } from "./today-card";

export function Dashboard() {
  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <Sidebar />

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <PageHeader title="Finance and habits command center"/>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Net worth" value="$74,286" detail="+8.4% over last month" accent="bg-emerald-500" />
            <StatCard label="Cash flow" value="$2,186" detail="$5,240 in, $3,054 out" accent="bg-sky-500" />
            <StatCard label="Budget left" value="$1,124" detail="19 days remaining" accent="bg-amber-500" />
            <StatCard label="Habit score" value="82%" detail="31 completions this week" accent="bg-fuchsia-500" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
            <MoneyFlowCard />
            <TodayCard />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <AccountsCard />
            <BudgetsCard />
            <HabitWeekCard />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
            <GoalsCard />
            <RecentActivityCard />
          </section>
        </div>
      </div>
    </main>
  );
}
