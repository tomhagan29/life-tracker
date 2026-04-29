"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogModal } from "./log-modal";

type SidebarClientProps = {
  snapshot: {
    upcomingBills: {
      id: number;
      name: string;
      amount: string;
      dueLabel: string;
    }[];
    accountWarnings: {
      accountId: number;
      accountName: string;
      balance: string;
      totalDue: string;
      shortfall: string;
    }[];
    setup: {
      hasAccounts: boolean;
      hasCategories: boolean;
      hasHabits: boolean;
      hasGoals: boolean;
    };
    quote: {
      text: string;
      author: string;
    };
  };
};

const navigationItems = [
  { label: "Overview", href: "/" },
  { label: "Accounts", href: "/accounts" },
  { label: "Budget", href: "/budget" },
  { label: "Habits", href: "/habits" },
  { label: "Goals", href: "/goals" },
  { label: "Settings", href: "/settings" },
];

const setupSteps: { key: keyof SidebarClientProps["snapshot"]["setup"]; label: string; href: string }[] = [
  { key: "hasAccounts", label: "Add an account", href: "/accounts" },
  { key: "hasCategories", label: "Add categories", href: "/settings" },
  { key: "hasHabits", label: "Create a habit", href: "/habits" },
  { key: "hasGoals", label: "Set a goal", href: "/goals" },
];

export function SidebarClient({ snapshot }: SidebarClientProps) {
  const pathname = usePathname();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const setupComplete =
    snapshot.setup.hasAccounts &&
    snapshot.setup.hasCategories &&
    snapshot.setup.hasHabits &&
    snapshot.setup.hasGoals;
  const completedCount = setupSteps.filter(
    (step) => snapshot.setup[step.key],
  ).length;

  return (
    <>
      <aside className="border-b border-zinc-200 bg-white px-5 py-4 lg:border-b-0 lg:border-r lg:py-6 2xl:px-7 min-[2200px]:px-8">
        <div className="flex items-center justify-between lg:block">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Life Tracker
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">
              Life tracker
            </h1>
          </div>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 lg:mt-8 lg:w-full"
            onClick={() => setIsLogModalOpen(true)}
          >
            + Log
          </button>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto text-sm font-medium lg:flex-col lg:overflow-visible">
          {navigationItems.map((item) => {
            const isActive =
              item.label === "Overview"
                ? pathname === "/"
                : item.href !== "/" && pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                className={`whitespace-nowrap rounded-lg px-3 py-2 ${
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {!setupComplete && (
          <section className="mt-8 hidden rounded-lg border border-blue-200 bg-[#eff6ff] p-4 lg:block">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-950">Get started</p>
              <p className="text-xs font-medium text-blue-700">
                {completedCount}/{setupSteps.length}
              </p>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              A few quick steps to unlock the full tracker.
            </p>
            <ul className="mt-3 space-y-2">
              {setupSteps.map((step) => {
                const done = snapshot.setup[step.key];

                return (
                  <li key={step.key} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        done
                          ? "border-blue-600 bg-blue-600"
                          : "border-zinc-300 bg-white"
                      }`}
                      aria-hidden
                    >
                      {done && (
                        <svg
                          className="size-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </span>
                    {done ? (
                      <span className="text-sm text-zinc-400 line-through">
                        {step.label}
                      </span>
                    ) : (
                      <Link
                        href={step.href}
                        className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        {step.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-8 hidden rounded-lg border border-zinc-200 bg-[#eef8f2] p-4 lg:block">
          <p className="text-sm font-semibold text-zinc-950">Upcoming bills</p>
          {snapshot.upcomingBills.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              No upcoming bills
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {snapshot.upcomingBills.map((bill) => (
                <div key={bill.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {bill.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-zinc-500">
                      {bill.dueLabel}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-zinc-700">
                    {bill.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {snapshot.accountWarnings.length > 0 && (
          <section className="mt-3 hidden rounded-lg border border-amber-200 bg-[#fffbeb] p-4 lg:block">
            <div className="flex items-center gap-2">
              <svg
                className="size-4 shrink-0 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              <p className="text-sm font-semibold text-zinc-950">Funding alerts</p>
            </div>
            <div className="mt-3 space-y-3">
              {snapshot.accountWarnings.map((warning) => (
                <div key={warning.accountId}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {warning.accountName}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-red-600">
                      −{warning.shortfall}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {warning.balance} available · {warning.totalDue} due
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-3 hidden rounded-lg border border-zinc-200 bg-[#f7f4ee] p-4 lg:block">
          <p className="text-sm font-semibold text-zinc-950">Daily quote</p>
          <blockquote className="mt-2 text-sm leading-6 text-zinc-600">
            &ldquo;{snapshot.quote.text}&rdquo;
          </blockquote>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {snapshot.quote.author}
          </p>
        </section>
      </aside>

      <LogModal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </>
  );
}
