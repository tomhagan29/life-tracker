import { getHabitCategories } from "@/app/actions/categories";
import { getHabits } from "@/app/actions/habits";
import { HabitsTable, HabitRow } from "@/app/components/habits/habits-table";
import { PageHeader } from "@/app/components/shared/page-header";
import { Sidebar } from "@/app/components/shared/sidebar";

function getHabitSchedule(isDaily: boolean, frequency: number | null) {
  if (isDaily) {
    return "Daily";
  }

  const target = frequency ?? 0;
  return `${target} ${target === 1 ? "time" : "times"}/week`;
}

function getHabitScheduleValue(isDaily: boolean, frequency: number | null) {
  if (isDaily) {
    return "daily";
  }

  return `weekly-${frequency ?? 1}`;
}

export default async function HabitsPage() {
  const [habits, categories] = await Promise.all([
    getHabits(),
    getHabitCategories(),
  ]);

  const rows: HabitRow[] = habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    category: habit.category.name,
    categoryId: habit.categoryId,
    streak: habit.streak,
    schedule: getHabitSchedule(habit.isDaily, habit.frequency),
    scheduleValue: getHabitScheduleValue(habit.isDaily, habit.frequency),
  }));

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <Sidebar />

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <PageHeader title="Habits" />
          <HabitsTable
            habits={rows}
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
