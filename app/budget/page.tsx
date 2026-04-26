import { BudgetTable, BudgetRow } from "@/app/components/budget/budget-table";
import { Sidebar } from "@/app/components/shared/sidebar";
import { PageHeader } from "@/app/components/shared/page-header";
import {
  getBudgetItems,
  getFinanceCategories,
} from "@/app/actions/budget";
import { getAccounts } from "@/app/actions/accounts";

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    : "No due date";
}

function formatDateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

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
    dueDate: formatDate(item.dueDate),
    dueDateValue: formatDateInputValue(item.dueDate),
    category: item.category.name,
    categoryId: item.categoryId,
    account: item.account.name,
    accountId: item.accountId,
  }));

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <Sidebar />

        <div className="px-4 py-5 sm:px-6 lg:px-8">
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
