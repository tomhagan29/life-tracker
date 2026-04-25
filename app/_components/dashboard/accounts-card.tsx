import { accounts } from "./data";

export function AccountsCard() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Accounts</h3>
      <div className="mt-5 space-y-4">
        {accounts.map((account) => (
          <div key={account.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`h-10 w-10 rounded-lg ${account.tone}`} />
              <div>
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-zinc-500">{account.change} this month</p>
              </div>
            </div>
            <p className="font-semibold">{account.balance}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
