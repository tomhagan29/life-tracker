type ProgressBarProps = {
  value: number;
  color?: string;
};

export function ProgressBar({ value, color = "bg-emerald-500" }: ProgressBarProps) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}
