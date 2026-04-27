import type { DashboardActivityRow } from "@/app/actions/dashboard";
import { Column, DataTable } from "@/app/components/shared/data-table"

export function RecentActivityCard({
  rows,
}: {
  rows: DashboardActivityRow[];
}) {
  const columns: Column<DashboardActivityRow>[] = [
    {
      key: "name",
      header: "Name",
      className: "font-semibold",
      cell: (row) => row.name,
    },
    {
      key: "category",
      header: "Category",
      className: "text-zinc-500",
      cell: (row) => row.category,
    },
    {
      key: "summary",
      header: "Summary",
      className: "text-right font-semibold",
      cell: (row) => row.summary,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Recent activity</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Money, habits, and goal updates
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
