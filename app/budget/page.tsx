import { BudgetTable, BudgetRow } from "@/app/components/budget/budget-table";
import { Sidebar } from "@/app/components/shared/sidebar";
import { PageHeader } from "@/app/components/shared/page-header";
import { getBudgetItems, getFinanceCategories } from "@/app/actions/budget";
import { getAccounts } from "@/app/actions/accounts";

export const dynamic = "force-dynamic";

export default async function BudgetDisplay() {
  const [budgetItems, accounts, categories] = await Promise.all([
    getBudgetItems(),
    getAccounts(),
    getFinanceCategories(),
  ]);

  const rows: BudgetRow[] = budgetItems.map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount.toFixed(2),
    amountValue: item.amount.toNumber(),
    dueDay: item.dueDay,
    category: item.category.name,
    categoryId: item.categoryId,
    account: item.account.name,
    accountId: item.accountId,
  }));

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="app-shell">
        <Sidebar />

        <div className="app-content">
          <PageHeader title="Budget" />
          <BudgetTable
            budgetItems={rows}
            accounts={accounts.map((account) => ({
              id: account.id,
              name: account.name,
            }))}
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
