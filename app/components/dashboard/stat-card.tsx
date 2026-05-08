type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  accent: string;
};

export function StatCard({ label, value, detail, accent }: StatCardProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">
            {value}
          </p>
        </div>
        <span className={`h-3 w-3 rounded-full ${accent}`} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm text-zinc-600">{detail}</p>
    </section>
  );
}
