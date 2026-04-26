import { getDashboardData } from "@/app/actions/dashboard";
import { AccountsCard } from "./accounts-card";
import { BudgetCard } from "./budget-card";
import { GoalsCard } from "./goals-card";
import { HabitWeekCard } from "./habit-week-card";
import { MoneyFlowCard } from "./money-flow-card";
import { PageHeader } from "../shared/page-header";
import { RecentActivityCard } from "./recent-activity-card";
import { Sidebar } from "../shared/sidebar";
import { StatCard } from "./stat-card";
import { TodayCard } from "./today-card";

export async function Dashboard() {
  const dashboard = await getDashboardData();

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <Sidebar />

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <PageHeader title="Finance and habits command center" />

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Net worth"
              value={dashboard.stats.netWorth.value}
              detail={dashboard.stats.netWorth.detail}
              accent="bg-emerald-500"
            />
            <StatCard
              label="Cash flow"
              value={dashboard.stats.cashFlow.value}
              detail={dashboard.stats.cashFlow.detail}
              accent="bg-sky-500"
            />
            <StatCard
              label="Budget left"
              value={dashboard.stats.budgetLeft.value}
              detail={dashboard.stats.budgetLeft.detail}
              accent="bg-amber-500"
            />
            <StatCard
              label="Habit score"
              value={dashboard.stats.habitScore.value}
              detail={dashboard.stats.habitScore.detail}
              accent="bg-fuchsia-500"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
            <MoneyFlowCard bars={dashboard.moneyFlowBars} />
            <TodayCard items={dashboard.todayItems} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <AccountsCard accounts={dashboard.accounts} />
            <BudgetCard budgets={dashboard.budgets} />
            <HabitWeekCard habits={dashboard.habits} week={dashboard.week} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
            <GoalsCard goals={dashboard.goals} />
            <RecentActivityCard rows={dashboard.recentActivity} />
          </section>
        </div>
      </div>
    </main>
  );
}
