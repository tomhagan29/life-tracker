import { AccountsTable } from "@/app/components/accounts/accounts-table";
import { Sidebar } from "@/app/components/shared/sidebar";
import { PageHeader } from "@/app/components/shared/page-header";
import { getAccounts } from "@/app/actions/accounts";
import { AccountRow } from "@/app/components/accounts/accounts-table";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const accountTypeLabel = {
  current: "Current",
  savings: "Savings",
  credit: "Credit",
  investment: "Investment",
};

export default async function AccountsDisplay() {
  const [accounts, budgetTotals] = await Promise.all([
    getAccounts(),
    prisma.budgetItem.groupBy({
      by: ["accountId"],
      _sum: { amount: true },
    }),
  ]);

  const outgoingsByAccount = new Map(
    budgetTotals.map((entry) => [
      entry.accountId,
      entry._sum.amount?.toNumber() ?? 0,
    ]),
  );

  const rows: AccountRow[] = accounts.map((account) => {
    const outgoingsValue = outgoingsByAccount.get(account.id) ?? 0;

    return {
      id: account.id,
      name: account.name,
      type: accountTypeLabel[account.type],
      rawType: account.type,
      balance: account.balance.toFixed(2),
      balanceValue: account.balance.toNumber(),
      outgoings: outgoingsValue.toFixed(2),
      outgoingsValue,
    };
  });

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="app-shell">
        <Sidebar />

        <div className="app-content">
          <PageHeader title="Accounts" />
          <AccountsTable accounts={rows} />
        </div>
      </div>
    </main>
  );
}
