"use client";

import type {
  InsightChartMode,
  InsightsData,
} from "@/app/actions/insights";
import { useMemo, useState } from "react";

const chartModes: { value: InsightChartMode; label: string }[] = [
  { value: "stacked", label: "Stacked breakdown" },
  { value: "netWorth", label: "Net worth only" },
  { value: "cashFlow", label: "Income vs spending" },
];

const allocationTone = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
};

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

function getPositiveHeight(value: number, maxValue: number) {
  if (maxValue <= 0 || value <= 0) {
    return 0;
  }

  return Math.max(2, (value / maxValue) * 100);
}

export function WealthInsights({ insights }: { insights: InsightsData }) {
  const [mode, setMode] = useState<InsightChartMode>("stacked");
  const chartScale = useMemo(() => {
    const stackedMax = Math.max(
      1,
      ...insights.series.map(
        (point) =>
          Math.max(point.current, 0) +
          Math.max(point.savings, 0) +
          point.creditDebt,
      ),
    );
    const netWorthMax = Math.max(
      1,
      ...insights.series.map((point) => Math.abs(point.netWorth)),
    );
    const cashFlowMax = Math.max(
      1,
      ...insights.series.map((point) => Math.max(point.income, point.outgoing)),
    );

    return { stackedMax, netWorthMax, cashFlowMax };
  }, [insights.series]);

  if (!insights.hasData) {
    return (
      <section className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">No insight data yet</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Add at least one account, then log transactions over time to unlock
          wealth milestones, account breakdowns, and cash-flow trends.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Wealth Journey
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {insights.milestones.map((milestone) => (
            <div
              key={`${milestone.label}-${milestone.dateLabel}`}
              className={`rounded-lg border p-4 shadow-sm ${
                milestone.isCurrent
                  ? "border-emerald-500 bg-emerald-50"
                  : milestone.isReached
                    ? "border-zinc-200 bg-white"
                    : "border-dashed border-zinc-300 bg-zinc-50"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  milestone.isCurrent ? "text-emerald-700" : "text-zinc-500"
                }`}
              >
                {milestone.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">
                {milestone.value}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-500">
                {milestone.dateLabel}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-400">
                {milestone.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Net worth insights</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Balances are reconstructed from current accounts and logged
              transactions.
            </p>
          </div>
          <div className="flex rounded-lg bg-zinc-100 p-1 text-sm font-semibold">
            {chartModes.map((item) => {
              const isActive = item.value === mode;

              return (
                <button
                  key={item.value}
                  type="button"
                  className={`rounded-md px-3 py-1.5 ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-950"
                  }`}
                  onClick={() => setMode(item.value)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto pb-2">
          <div
            className="grid min-w-[760px] items-end gap-2 border-b border-zinc-200 pb-4"
            style={{
              gridTemplateColumns: `repeat(${insights.series.length}, minmax(0, 1fr))`,
              height: "21rem",
            }}
          >
            {insights.series.map((point, index) => {
              const showLabel =
                index === 0 ||
                index === insights.series.length - 1 ||
                index % 3 === 0;
              const current = Math.max(point.current, 0);
              const savings = Math.max(point.savings, 0);
              const debt =
                point.creditDebt +
                Math.abs(Math.min(point.current, 0)) +
                Math.abs(Math.min(point.savings, 0));
              const stackedTotal = current + savings + debt;

              return (
                <div
                  key={point.key}
                  className="flex h-full min-w-0 flex-col justify-end gap-2"
                  title={`${point.label}: net worth ${formatCurrency(point.netWorth)}`}
                >
                  <div className="flex h-full items-end justify-center">
                    {mode === "stacked" && (
                      <div
                        className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-t-md bg-zinc-100"
                        style={{
                          height: `${getPositiveHeight(
                            stackedTotal,
                            chartScale.stackedMax,
                          )}%`,
                        }}
                      >
                        {current > 0 && (
                          <span
                            className="bg-emerald-500"
                            style={{
                              height: `${(current / Math.max(stackedTotal, 1)) * 100}%`,
                            }}
                          />
                        )}
                        {savings > 0 && (
                          <span
                            className="bg-sky-500"
                            style={{
                              height: `${(savings / Math.max(stackedTotal, 1)) * 100}%`,
                            }}
                          />
                        )}
                        {debt > 0 && (
                          <span
                            className="bg-rose-500"
                            style={{
                              height: `${(debt / Math.max(stackedTotal, 1)) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    )}

                    {mode === "netWorth" && (
                      <div
                        className={`w-full max-w-9 rounded-t-md ${
                          point.netWorth >= 0 ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        style={{
                          height: `${getPositiveHeight(
                            Math.abs(point.netWorth),
                            chartScale.netWorthMax,
                          )}%`,
                        }}
                      />
                    )}

                    {mode === "cashFlow" && (
                      <div className="flex h-full w-full max-w-11 items-end justify-center gap-1.5">
                        <span
                          className="w-3 rounded-t-sm bg-teal-500"
                          style={{
                            height: `${getPositiveHeight(
                              point.income,
                              chartScale.cashFlowMax,
                            )}%`,
                          }}
                          title={`${point.label} income ${formatCurrency(point.income)}`}
                        />
                        <span
                          className="w-3 rounded-t-sm bg-zinc-900"
                          style={{
                            height: `${getPositiveHeight(
                              point.outgoing,
                              chartScale.cashFlowMax,
                            )}%`,
                          }}
                          title={`${point.label} spending ${formatCurrency(
                            point.outgoing,
                          )}`}
                        />
                      </div>
                    )}
                  </div>
                  <p className="h-4 truncate text-center text-xs font-medium text-zinc-400">
                    {showLabel ? point.label : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
          {mode === "cashFlow" ? (
            <>
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Income
              </span>
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-full bg-zinc-900" /> Spending
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Current
              </span>
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Savings
              </span>
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Credit debt
              </span>
            </>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold">Current allocation</h3>
          <div className="mt-5 space-y-4">
            {insights.allocation.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-zinc-700">{item.label}</span>
                  <span className="font-semibold text-zinc-950">{item.value}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full ${allocationTone[item.tone]}`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InsightStatCard
            label="Total wealth created"
            value={insights.stats.wealthCreated}
            detail="Change across the chart range"
          />
          <InsightStatCard
            label="Income growth"
            value={insights.stats.incomeGrowth}
            detail="First month to latest month"
          />
          <InsightStatCard
            label="Best single month"
            value={insights.stats.bestSingleMonth}
            detail="Largest net worth gain"
          />
          <InsightStatCard
            label="Avg monthly wealth gain"
            value={insights.stats.averageMonthlyGain}
            detail="Average change after month one"
          />
        </div>
      </section>
    </>
  );
}

function InsightStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="mt-3 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}
