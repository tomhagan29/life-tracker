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
      _count: true,
    }),
  ]);
  const [transactionCounts, transferCounts, investmentSnapshotCounts] =
    await Promise.all([
      prisma.transaction.groupBy({
        by: ["accountId"],
        _count: true,
      }),
      prisma.transaction.groupBy({
        by: ["transferAccountId"],
        where: { transferAccountId: { not: null } },
        _count: true,
      }),
      prisma.investmentSnapshot.groupBy({
        by: ["accountId"],
        _count: true,
      }),
    ]);

  const outgoingsByAccount = new Map(
    budgetTotals.map((entry) => [
      entry.accountId,
      entry._sum.amount?.toNumber() ?? 0,
    ]),
  );
  const budgetItemsByAccount = new Map(
    budgetTotals.map((entry) => [entry.accountId, entry._count]),
  );
  const transactionsByAccount = new Map(
    transactionCounts.map((entry) => [entry.accountId, entry._count]),
  );
  const transfersByAccount = new Map(
    transferCounts.map((entry) => [entry.transferAccountId, entry._count]),
  );
  const investmentSnapshotsByAccount = new Map(
    investmentSnapshotCounts.map((entry) => [entry.accountId, entry._count]),
  );

  const rows: AccountRow[] = accounts.map((account) => {
    const outgoingsValue = outgoingsByAccount.get(account.id) ?? 0;
    const transactionCount =
      (transactionsByAccount.get(account.id) ?? 0) +
      (transfersByAccount.get(account.id) ?? 0);

    return {
      id: account.id,
      name: account.name,
      type: accountTypeLabel[account.type],
      rawType: account.type,
      balance: account.balance.toFixed(2),
      balanceValue: account.balance.toNumber(),
      outgoings: outgoingsValue.toFixed(2),
      outgoingsValue,
      transactionCount,
      budgetItemCount: budgetItemsByAccount.get(account.id) ?? 0,
      investmentSnapshotCount:
        investmentSnapshotsByAccount.get(account.id) ?? 0,
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
