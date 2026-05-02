import { getGoals } from "@/app/actions/goals";
import { GoalRow, GoalsTable } from "@/app/components/goals/goals-table";
import { PageHeader } from "@/app/components/shared/page-header";
import { Sidebar } from "@/app/components/shared/sidebar";
import { utcDisplayDateFormatter } from "@/lib/utc-date";

export const dynamic = "force-dynamic";

const goalTypeLabel = {
  milestone: "Milestone",
  numerical: "Numerical",
};

function formatDateInput(date: Date | null) {
  return date?.toISOString().slice(0, 10) ?? "";
}

function formatDisplayDate(date: Date | null) {
  if (!date) {
    return "None";
  }

  return utcDisplayDateFormatter.format(date);
}

function getProgress(currentAmount: number | null, targetAmount: number | null) {
  if (currentAmount === null || targetAmount === null || targetAmount <= 0) {
    return "—";
  }

  return `${Math.min(Math.round((currentAmount / targetAmount) * 100), 100)}%`;
}

export default async function GoalsPage() {
  const goals = await getGoals();

  const rows: GoalRow[] = goals.map((goal) => {
    const currentAmount = goal.currentAmount?.toNumber() ?? null;
    const targetAmount = goal.targetAmount?.toNumber() ?? null;

    return {
      id: goal.id,
      name: goal.name,
      type: goal.type,
      typeLabel: goalTypeLabel[goal.type],
      currentAmount: goal.currentAmount?.toFixed(2) ?? "",
      targetAmount: goal.targetAmount?.toFixed(2) ?? "",
      progress: goal.isComplete ? "100%" : getProgress(currentAmount, targetAmount),
      isComplete: goal.isComplete,
      deadline: formatDisplayDate(goal.deadline),
      deadlineValue: formatDateInput(goal.deadline),
      milestones: goal.milestones.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        isComplete: milestone.isComplete,
        deadline: formatDisplayDate(milestone.deadline),
        deadlineValue: formatDateInput(milestone.deadline),
      })),
    };
  });

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="app-shell">
        <Sidebar />

        <div className="app-content">
          <PageHeader title="Goals" />
          <GoalsTable goals={rows} />
        </div>
      </div>
    </main>
  );
}
