import {
  getFinanceCategories,
  getHabitCategories,
} from "@/app/actions/categories";
import { CategoriesTable } from "@/app/components/categories/categories-table";
import { PageHeader } from "@/app/components/shared/page-header";
import { Sidebar } from "@/app/components/shared/sidebar";

export default async function SettingsPage() {
  const [financeCategories, habitCategories] = await Promise.all([
    getFinanceCategories(),
    getHabitCategories(),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <Sidebar />

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <PageHeader title="Settings" />

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
