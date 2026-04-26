import type { DashboardActivityRow } from "@/app/actions/dashboard";
import { Column, DataTable } from "@/app/components/shared/data-table"

export function RecentActivityCard({
  rows,
}: {
  rows: DashboardActivityRow[];
}) {
  const columns: Column<DashboardActivityRow>[] = [
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
      </div>

      {rows.length === 0 ? (
        <p className="m-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
          No activity yet
        </p>
      ) : (
        <DataTable rows={rows} columns={columns} getRowKey={(row) => row.id} />
      )}
    </div>
  );
}
