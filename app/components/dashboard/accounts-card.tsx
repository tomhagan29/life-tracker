import type { DashboardAccount } from "@/app/actions/dashboard";

const accountTone = {
  current: "bg-emerald-500",
  savings: "bg-sky-500",
  credit: "bg-rose-500",
  investment: "bg-violet-500",
};

export function AccountsCard({ accounts }: { accounts: DashboardAccount[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Accounts</h3>

      {accounts.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
          No accounts setup
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`h-10 w-10 rounded-lg ${accountTone[account.type]}`} />
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm capitalize text-zinc-500">{account.type}</p>
                </div>
              </div>
              <p className="font-semibold tabular-nums">{account.balance}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
