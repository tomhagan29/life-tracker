import { AccountsTable } from "@/app/components/accounts/accounts-table";
import { Sidebar } from "@/app/components/shared/sidebar";
import { PageHeader } from "@/app/components/shared/page-header";
import { getAccounts } from "@/app/actions/accounts";
import { AccountRow } from "@/app/components/accounts/accounts-table";

const accountTypeLabel = {
  current: "Current",
  savings: "Savings",
  credit: "Credit",
};

export default async function AccountsDisplay() {
  const accounts = await getAccounts();
  const rows: AccountRow[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: accountTypeLabel[account.type],
    rawType: account.type,
    balance: account.balance.toFixed(2),
    balanceValue: account.balance.toNumber(),
  }));

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <Sidebar />

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <PageHeader title="Accounts" />
          <AccountsTable accounts={rows} />
        </div>
      </div>
    </main>
  );
}
