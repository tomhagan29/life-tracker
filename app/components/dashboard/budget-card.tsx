import type { DashboardBudget } from "@/app/actions/dashboard";
import { ProgressBar } from "./progress-bar";

const budgetColors = [
  "bg-cyan-500",
  "bg-lime-500",
  "bg-amber-500",
  "bg-fuchsia-500",
  "bg-sky-500",
  "bg-emerald-500",
];

export function BudgetCard({ budgets }: { budgets: DashboardBudget[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Budget</h3>

      {budgets.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
          No budget items setup
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {budgets.map((budget, index) => (
            <div key={budget.label}>
              <div className="flex justify-between gap-4 text-sm">
                <p className="font-semibold">{budget.label}</p>
                <p className="tabular-nums text-zinc-500">{budget.total}</p>
              </div>
              <ProgressBar
                value={budget.percent}
                color={budgetColors[index % budgetColors.length]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
