import { goals } from "./data";
import { ProgressBar } from "./progress-bar";

export function GoalsCard() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">Goals</h3>
      <div className="mt-5 space-y-5">
        {goals.map((goal) => (
          <div key={goal.title}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-semibold">{goal.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {goal.value} of {goal.target}
                </p>
              </div>
              <p className="text-sm font-semibold text-zinc-700">{goal.progress}%</p>
            </div>
            <ProgressBar value={goal.progress} color="bg-teal-600" />
          </div>
        ))}
      </div>
    </div>
  );
}
