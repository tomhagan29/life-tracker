import { habits, week } from "./data";
import { ProgressBar } from "./progress-bar";

export function HabitWeekCard() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Habit week</h3>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {week.map((day, index) => (
          <div key={`${day}-${index}`} className="text-center">
            <p className="text-xs font-semibold text-zinc-500">{day}</p>
            <div
              className={`mt-2 flex aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                index < 5 ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {index < 5 ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {habits.map((habit) => (
          <div key={habit.name}>
            <div className="flex justify-between gap-4 text-sm">
              <p className="font-semibold">{habit.name}</p>
              <p className="text-zinc-500">{habit.streak}</p>
            </div>
            <ProgressBar value={habit.progress} color="bg-violet-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
