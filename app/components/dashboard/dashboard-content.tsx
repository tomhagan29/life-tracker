"use client";

import type { DashboardData } from "@/app/actions/dashboard";
import { AccountsCard } from "./accounts-card";
import { BudgetCard } from "./budget-card";
import { DashboardCardBoundary } from "./dashboard-card-boundary";
import { GoalsCard } from "./goals-card";
import { HabitWeekCard } from "./habit-week-card";
import { MoneyFlowCard } from "./money-flow-card";
import { RecentActivityCard } from "./recent-activity-card";
import { StatCard } from "./stat-card";
import { TodayCard } from "./today-card";

export function DashboardContent({ dashboard }: { dashboard: DashboardData }) {
  const resetKeys = {
    accounts: JSON.stringify(dashboard.accounts),
    budgets: JSON.stringify(dashboard.budgets),
    goals: JSON.stringify(dashboard.goals),
    habits: JSON.stringify({ habits: dashboard.habits, week: dashboard.week }),
    moneyFlow: JSON.stringify(dashboard.moneyFlow),
    recentActivity: JSON.stringify(dashboard.recentActivity),
    today: JSON.stringify(dashboard.todayItems),
  };

  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCardBoundary
          title="Tracked net worth"
          resetKey={dashboard.stats.netWorth.value}
        >
          <StatCard
            label="Tracked net worth"
            value={dashboard.stats.netWorth.value}
            detail={dashboard.stats.netWorth.detail}
            accent="bg-emerald-500"
          />
        </DashboardCardBoundary>
        <DashboardCardBoundary
          title="Cash flow"
          resetKey={dashboard.stats.cashFlow.value}
        >
          <StatCard
            label="Cash flow"
            value={dashboard.stats.cashFlow.value}
            detail={dashboard.stats.cashFlow.detail}
            accent="bg-sky-500"
          />
        </DashboardCardBoundary>
        <DashboardCardBoundary
          title="Budget left"
          resetKey={dashboard.stats.budgetLeft.value}
        >
          <StatCard
            label="Budget left"
            value={dashboard.stats.budgetLeft.value}
            detail={dashboard.stats.budgetLeft.detail}
            accent="bg-amber-500"
          />
        </DashboardCardBoundary>
        <DashboardCardBoundary
          title="Habit score"
          resetKey={dashboard.stats.habitScore.value}
        >
          <StatCard
            label="Habit score"
            value={dashboard.stats.habitScore.value}
            detail={dashboard.stats.habitScore.detail}
            accent="bg-violet-500"
          />
        </DashboardCardBoundary>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <DashboardCardBoundary title="Money flow" resetKey={resetKeys.moneyFlow}>
          <MoneyFlowCard moneyFlow={dashboard.moneyFlow} />
        </DashboardCardBoundary>
        <DashboardCardBoundary title="Today" resetKey={resetKeys.today}>
          <TodayCard items={dashboard.todayItems} />
        </DashboardCardBoundary>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <DashboardCardBoundary title="Accounts" resetKey={resetKeys.accounts}>
          <AccountsCard accounts={dashboard.accounts} />
        </DashboardCardBoundary>
        <DashboardCardBoundary title="Budget" resetKey={resetKeys.budgets}>
          <BudgetCard budgets={dashboard.budgets} />
        </DashboardCardBoundary>
        <DashboardCardBoundary title="Habit week" resetKey={resetKeys.habits}>
          <HabitWeekCard habits={dashboard.habits} week={dashboard.week} />
        </DashboardCardBoundary>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <DashboardCardBoundary title="Goals" resetKey={resetKeys.goals}>
          <GoalsCard goals={dashboard.goals} />
        </DashboardCardBoundary>
        <DashboardCardBoundary
          title="Recent activity"
          resetKey={resetKeys.recentActivity}
        >
          <RecentActivityCard rows={dashboard.recentActivity} />
        </DashboardCardBoundary>
      </section>
    </>
  );
}
