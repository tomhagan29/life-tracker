import { getBudgetItems } from "@/app/actions/budget";
import { ProgressBar } from "./progress-bar";

const budgetColors = [
  "bg-cyan-500",
  "bg-lime-500",
  "bg-amber-500",
  "bg-fuchsia-500",
  "bg-sky-500",
  "bg-emerald-500",
];

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export async function BudgetCard() {
  const budgetItems = await getBudgetItems();
  const categoryBudgets = Array.from(
    budgetItems
      .reduce((groups, item) => {
        const current = groups.get(item.category.name) ?? 0;
        groups.set(item.category.name, current + item.amount.toNumber());
        return groups;
      }, new Map<string, number>())
      .entries(),
  ).map(([label, total], index) => ({
    label,
    total,
    color: budgetColors[index % budgetColors.length],
  }));

  const monthlyTotal = categoryBudgets.reduce(
    (sum, budget) => sum + budget.total,
    0,
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Budget</h3>

      {categoryBudgets.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
          No budget items setup
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {categoryBudgets.map((budget) => {
            const percent =
              monthlyTotal > 0
                ? Math.round((budget.total / monthlyTotal) * 100)
                : 0;

            return (
              <div key={budget.label}>
                <div className="flex justify-between gap-4 text-sm">
                  <p className="font-semibold">{budget.label}</p>
                  <p className="text-zinc-500">
                    {currencyFormatter.format(budget.total)}
                  </p>
                </div>
                <ProgressBar value={percent} color={budget.color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
