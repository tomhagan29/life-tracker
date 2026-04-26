import {
  getFinanceCategories,
  getHabitCategories,
} from "@/app/actions/categories";
import { CategoriesTable } from "@/app/components/categories/categories-table";
import { DataManagementCard } from "@/app/components/settings/data-management-card";
import { PageHeader } from "@/app/components/shared/page-header";
import { Sidebar } from "@/app/components/shared/sidebar";

export default async function SettingsPage() {
  const [financeCategories, habitCategories] = await Promise.all([
    getFinanceCategories(),
    getHabitCategories(),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="app-shell">
        <Sidebar />

        <div className="app-content">
          <PageHeader title="Settings" />

          <section className="mt-6">
            <DataManagementCard />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <CategoriesTable
              title="Finance categories"
              description="Used by transactions and budget items"
              kind="finance"
              categories={financeCategories}
            />
            <CategoriesTable
              title="Habit categories"
              description="Used to organise habit tracking"
              kind="habit"
              categories={habitCategories}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
