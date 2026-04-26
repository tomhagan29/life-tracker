import { habits, transactions } from "./data";
import { Column, DataTable } from "@/app/components/shared/data-table"

type ActivityRow = {
  id: string;
  entry: string;
  category: string;
  date: string;
  amount: string;
};

export function RecentActivityCard() {

  const rows: ActivityRow[] = [
    ...transactions.map((transaction) => ({
      id: `transaction-${transaction.item}`,
      entry: transaction.item,
      category: transaction.category,
      date: transaction.date,
      amount: transaction.amount,
    })),
    ...habits.slice(0, 3).map((habit) => ({
      id: `habit-${habit.name}`,
      entry: habit.name,
      category: "Habit",
      date: "Today",
      amount: habit.mark,
    })),
  ];

  const columns: Column<ActivityRow>[] = [
    {
      key: "entry",
      header: "Entry",
      className: "font-semibold",
      cell: (row) => row.entry,
    },
    {
      key: "category",
      header: "Category",
      className: "text-zinc-500",
      cell: (row) => row.category,
    },
    {
      key: "date",
      header: "Date",
      className: "text-zinc-500",
      cell: (row) => row.date,
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      cell: (row) => row.amount,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Recent activity</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Money moves and habit records
          </p>
        </div>

        <button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold">
          Filter
        </button>
      </div>

      <DataTable rows={rows} columns={columns} getRowKey={(row) => row.id} />
    </div>
  );
}
