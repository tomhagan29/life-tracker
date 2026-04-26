import type {
  DashboardHabit,
  DashboardWeekDay,
} from "@/app/actions/dashboard";
import { ProgressBar } from "./progress-bar";

export function HabitWeekCard({
  habits,
  week,
}: {
  habits: DashboardHabit[];
  week: DashboardWeekDay[];
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Habit week</h3>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {week.map((day, index) => (
          <div key={`${day.label}-${index}`} className="text-center">
            <p className="text-xs font-semibold text-zinc-500">{day.label}</p>
            <div
              className={`mt-2 flex aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                day.completed
                  ? "bg-emerald-500 text-white"
                  : day.isToday
                    ? "bg-zinc-200 text-zinc-700"
                    : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {day.completed ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>

      {habits.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
          No habits setup
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {habits.map((habit) => (
            <div key={habit.id}>
              <div className="flex justify-between gap-4 text-sm">
                <p className="font-semibold">{habit.name}</p>
                <p className="text-zinc-500">{habit.streak}</p>
              </div>
              <ProgressBar value={habit.progress} color="bg-violet-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
