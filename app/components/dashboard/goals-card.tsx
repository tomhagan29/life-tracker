import type { DashboardGoal } from "@/app/actions/dashboard";
import { ProgressBar } from "./progress-bar";

export function GoalsCard({ goals }: { goals: DashboardGoal[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Goals</h3>

      {goals.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
          No goals setup
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {goals.map((goal) => (
            <div key={goal.id}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-semibold">{goal.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{goal.detail}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-zinc-700">
                  {goal.progress}%
                </p>
              </div>
              <ProgressBar value={goal.progress} color="bg-emerald-600" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
