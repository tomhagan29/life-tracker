"use client";

import type {
  InsightChartMode,
  InsightsData,
} from "@/app/actions/insights";
import { useMemo, useState } from "react";

const chartModes: { value: InsightChartMode; label: string }[] = [
  { value: "stacked", label: "Stacked breakdown" },
  { value: "netWorth", label: "Tracked net worth" },
  { value: "cashFlow", label: "Income vs spending" },
];

const allocationTone = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
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
          Math.max(point.investment, 0) +
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
          tracked net worth milestones, account breakdowns, and cash-flow trends.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6">
        <SectionLabel
          label="Tracked net worth journey"
          info="Shows where your tracked account net worth started, where it is now, and the next milestone targets based on balances stored in this app."
        />
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
              <p className="mt-1 text-xs font-medium text-zinc-600">
                {milestone.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <HeadingWithInfo
              label="Tracked net worth insights"
              info="Tracked net worth is the sum of accounts in this app, with credit accounts counted as liabilities. It does not include assets or debts you have not added here."
            />
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Balances are reconstructed from tracked accounts and logged
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
              const investment = Math.max(point.investment, 0);
              const debt =
                point.creditDebt +
                Math.abs(Math.min(point.current, 0)) +
                Math.abs(Math.min(point.savings, 0)) +
                Math.abs(Math.min(point.investment, 0));
              const stackedTotal = current + savings + investment + debt;

              return (
                <div
                  key={point.key}
                  className="flex h-full min-w-0 flex-col justify-end gap-2"
                  title={`${point.label}: tracked net worth ${formatCurrency(
                    point.netWorth,
                  )}`}
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
                        {investment > 0 && (
                          <span
                            className="bg-violet-500"
                            style={{
                              height: `${(investment / Math.max(stackedTotal, 1)) * 100}%`,
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
                          className="w-3 rounded-t-sm bg-emerald-500"
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
                  <p className="h-4 truncate text-center text-xs font-medium text-zinc-600">
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
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-zinc-900" /> Spending
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Current
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Savings
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Investments
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Credit debt
              </span>
            </>
          )}
        </div>
      </section>

      <section className="mt-6">
        <SectionLabel
          label="Financial signals"
          info="A compact view of savings, resilience, debt, and monthly baseline costs pulled from tracked accounts, transactions, budgets, and goals."
        />
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InsightStatCard
            label="Tracked net worth change"
            value={insights.stats.wealthCreated}
            detail="Tracked balances minus tracked credit debt"
            info="The change between the first and latest chart month, based only on accounts stored in this app."
          />
          <InsightStatCard
            label="Latest savings rate"
            value={insights.stats.latestSavingsRate}
            detail="Income kept after spending this month"
            info="Calculated as (income - spending) divided by income for the latest month. It scales progress to your income."
          />
          <InsightStatCard
            label="Average savings rate"
            value={insights.stats.averageSavingsRate}
            detail="Average rate for months with income"
            info="The average of monthly savings rates, ignoring months without logged income."
          />
          <InsightStatCard
            label="Emergency fund"
            value={insights.stats.emergencyCoverage}
            detail="Liquid cash divided by essential or recurring cost"
            info="Current and savings account cash expressed as months of essential or recurring monthly costs covered."
          />
          <InsightStatCard
            label="Burn rate"
            value={insights.stats.burnRate}
            detail="Essential matches, otherwise total monthly budget"
            info="Your baseline monthly cost. Essential categories are detected from budget item and category names, then total budget is used as a fallback."
          />
          <InsightStatCard
            label="Total debt"
            value={insights.stats.totalDebt}
            detail="Credit-account balance treated as liability"
            info="The total balance on tracked credit accounts, counted as a liability in tracked net worth."
          />
          <InsightStatCard
            label="Debt burden"
            value={insights.stats.debtBurden}
            detail="Credit debt compared with recent income"
            info="Credit debt compared with average recent monthly income. This helps show how heavy the debt load is relative to cash coming in."
          />
          <InsightStatCard
            label="Debt payments"
            value={insights.stats.debtPayments}
            detail="Budgeted minimums and debt-like repayments"
            info="Budget items linked to credit accounts or debt-like names such as loan, credit, minimum, or repayment."
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <HeadingWithInfo
            label="Current allocation"
            info="Shows how your tracked account position is split across current accounts, savings, investments, and credit debt. This helps reveal concentration risk within the app."
          />
          <p className="mt-1 text-sm text-zinc-500">
            Cash, savings, investments, and credit exposure from tracked accounts.
          </p>
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

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <HeadingWithInfo
            label="Cash flow by category"
            info="Groups outgoing transactions from the latest chart month by finance category, so the biggest controllable spending areas are easy to spot."
          />
          <p className="mt-1 text-sm text-zinc-500">
            Largest outgoing categories in the latest chart month.
          </p>
          {insights.categoryFlow.length > 0 ? (
            <div className="mt-5 space-y-4">
              {insights.categoryFlow.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-zinc-700">
                      {item.label}
                    </span>
                    <span className="font-semibold text-zinc-950">
                      {item.value}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full bg-blue-600"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
              No outgoing category activity in the latest month
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <HeadingWithInfo
            label="Goal progress"
            info="Shows progress on numerical goals by funded percentage and milestone goals by completed milestone percentage."
          />
          <p className="mt-1 text-sm text-zinc-500">
            Funded targets and milestone progress from your goals.
          </p>
          {insights.goals.length > 0 ? (
            <div className="mt-5 space-y-4">
              {insights.goals.map((goal) => (
                <div key={goal.label}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-zinc-700">
                      {goal.label}
                    </span>
                    <span className="font-semibold text-zinc-950">
                      {goal.value}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${goal.percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{goal.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
              Add numerical or milestone goals to track goal-based progress
            </p>
          )}
        </div>

        <div>
          <HeadingWithInfo
            label="Longer-term context"
            info="Highlights longer-term trends and calls out useful insights that need extra data before the app can calculate them honestly."
          />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <InsightStatCard
              label="Income growth"
              value={insights.stats.incomeGrowth}
              detail="First month to latest month"
              info="Compares logged income in the first chart month with logged income in the latest chart month."
            />
            <InsightStatCard
              label="Avg tracked net worth gain"
              value={insights.stats.averageMonthlyGain}
              detail="Average change after month one"
              info="The average month-to-month tracked net worth change after the first tracked month."
            />
            <InsightStatCard
              label="Best month"
              value={insights.stats.bestSingleMonth}
              detail="Largest tracked net worth gain"
              info="The strongest single month of tracked net worth growth in the chart range."
            />
            {insights.longTermSignals.map((signal) => (
              <InsightStatCard
                key={signal.label}
                label={signal.label}
                value={signal.value}
                detail={signal.detail}
                info={signal.info}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionLabel({ label, info }: { label: string; info: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
      <span>{label}</span>
      <InfoTip text={info} />
    </div>
  );
}

function HeadingWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-xl font-semibold">{label}</h3>
      <InfoTip text={info} />
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
        >
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 7.25v4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
          <circle cx="8" cy="4.75" r="0.75" fill="currentColor" />
        </svg>
      </button>
      <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-zinc-200 bg-zinc-950 px-3 py-2 text-left text-xs font-medium normal-case leading-5 tracking-normal text-white shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function InsightStatCard({
  label,
  value,
  detail,
  info,
}: {
  label: string;
  value: string;
  detail: string;
  info: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
        <span>{label}</span>
        <InfoTip text={info} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="mt-3 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}
