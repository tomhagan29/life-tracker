import { budgets } from "./data";
import { ProgressBar } from "./progress-bar";

export function BudgetsCard() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Budgets</h3>
      <div className="mt-5 space-y-4">
        {budgets.map((budget) => {
          const percent = Math.round((budget.spent / budget.total) * 100);

          return (
            <div key={budget.label}>
              <div className="flex justify-between gap-4 text-sm">
                <p className="font-semibold">{budget.label}</p>
                <p className="text-zinc-500">
                  ${budget.spent} / ${budget.total}
                </p>
              </div>
              <ProgressBar value={percent} color={budget.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
