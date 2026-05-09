"use client";

import {
  getDailyLogOptions,
  getWeeklyLogOptions,
  submitDailyLog,
  submitWeeklyLog,
  type DailyLogActionState,
  type DailyLogOptions,
  type WeeklyLogOptions,
} from "@/app/actions/daily-log";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type TransactionDraft = {
  id: number;
  direction: "outgoing" | "income" | "transfer";
  amount: string;
  accountId: string;
  categoryId: string;
  transferAccountId: string;
  date: string;
};

type InvestmentSnapshotDraft = {
  accountId: number;
  name: string;
  value: string;
};

type WeekInvestmentSnapshotDraft = InvestmentSnapshotDraft & {
  date: string;
};

type LogModalProps = {
  open: boolean;
  onClose: () => void;
};

function createTransactionDraft(date = ""): TransactionDraft {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    direction: "outgoing",
    amount: "",
    accountId: "",
    categoryId: "",
    transferAccountId: "",
    date,
  };
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStartFromDate(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}

type LogMode = "day" | "week";

export function LogModal({ open, onClose }: LogModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<LogMode>("day");
  const [options, setOptions] = useState<DailyLogOptions | null>(null);
  const [weeklyOptions, setWeeklyOptions] = useState<WeeklyLogOptions | null>(
    null,
  );
  const [weekCompletionKeys, setWeekCompletionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [weekTransactions, setWeekTransactions] = useState<TransactionDraft[]>(
    [],
  );
  const [newWeekTransaction, setNewWeekTransaction] = useState<TransactionDraft>(
    () => createTransactionDraft(),
  );
  const [weekInvestmentSnapshots, setWeekInvestmentSnapshots] = useState<
    WeekInvestmentSnapshotDraft[]
  >([]);
  const [transactions, setTransactions] = useState<TransactionDraft[]>([]);
  const [newTransaction, setNewTransaction] = useState(createTransactionDraft);
  const [completedHabitIds, setCompletedHabitIds] = useState<number[]>([]);
  const [investmentSnapshots, setInvestmentSnapshots] = useState<
    InvestmentSnapshotDraft[]
  >([]);
  const [logDate, setLogDate] = useState(getTodayDateString);
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStartFromDate(getTodayDateString()),
  );
  const [actionState, setActionState] = useState<DailyLogActionState>({
    ok: true,
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || mode !== "day") {
      return;
    }

    let cancelled = false;

    getDailyLogOptions(logDate)
      .then((dailyLogOptions) => {
        if (cancelled) {
          return;
        }

        setOptions(dailyLogOptions);
        setTransactions(
          dailyLogOptions.transactions.map((transaction) => ({
            id: transaction.id,
            direction: transaction.direction,
            amount: transaction.amount,
            accountId: String(transaction.accountId),
            categoryId: transaction.categoryId ? String(transaction.categoryId) : "",
            transferAccountId: transaction.transferAccountId
              ? String(transaction.transferAccountId)
              : "",
            date: logDate,
          })),
        );
        setNewTransaction(createTransactionDraft(logDate));
        setCompletedHabitIds(dailyLogOptions.completedHabitIds);
        setInvestmentSnapshots(dailyLogOptions.investmentSnapshots);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setActionState({
          ok: false,
          message: "Could not load log options. Please try again.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [open, mode, logDate]);

  useEffect(() => {
    if (!open || mode !== "week") {
      return;
    }

    let cancelled = false;

    getWeeklyLogOptions(weekStart)
      .then((opts) => {
        if (cancelled) {
          return;
        }

        setWeeklyOptions(opts);
        const keys = new Set<string>();
        for (const habit of opts.habits) {
          for (const date of habit.completedDates) {
            keys.add(`${habit.id}:${date}`);
          }
        }
        setWeekCompletionKeys(keys);
        setWeekTransactions(
          opts.transactions.map((transaction) => ({
            id: transaction.id,
            direction: transaction.direction,
            amount: transaction.amount,
            accountId: String(transaction.accountId),
            categoryId: transaction.categoryId
              ? String(transaction.categoryId)
              : "",
            transferAccountId: transaction.transferAccountId
              ? String(transaction.transferAccountId)
              : "",
            date: transaction.date,
          })),
        );
        const today = getTodayDateString();
        const defaultDate = opts.days.some((day) => day.date === today)
          ? today
          : opts.weekStart;
        setNewWeekTransaction(createTransactionDraft(defaultDate));
        setWeekInvestmentSnapshots(opts.investmentSnapshots);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setActionState({
          ok: false,
          message: "Could not load log options. Please try again.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [open, mode, weekStart]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const canAddTransactions = useMemo(
    () =>
      Boolean(
        options &&
          options.accounts.length > 0 &&
          (options.categories.length > 0 || options.accounts.length > 1),
      ),
    [options],
  );
  const loadingOptions =
    open &&
    actionState.ok &&
    ((mode === "day" && !options) || (mode === "week" && !weeklyOptions));

  const canAddWeekTransactions = useMemo(
    () =>
      Boolean(
        weeklyOptions &&
          weeklyOptions.accounts.length > 0 &&
          (weeklyOptions.categories.length > 0 ||
            weeklyOptions.accounts.length > 1),
      ),
    [weeklyOptions],
  );

  function updateWeekTransaction(
    id: number,
    field: keyof Omit<TransactionDraft, "id">,
    value: string,
  ) {
    setWeekTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              [field]: value,
              ...(field === "direction" && value === "transfer"
                ? { categoryId: "" }
                : {}),
              ...(field === "direction" && value !== "transfer"
                ? { transferAccountId: "" }
                : {}),
            }
          : transaction,
      ),
    );
  }

  function updateNewWeekTransaction(
    field: keyof Omit<TransactionDraft, "id">,
    value: string,
  ) {
    setNewWeekTransaction((current) => ({
      ...current,
      [field]: value,
      ...(field === "direction" && value === "transfer"
        ? { categoryId: "" }
        : {}),
      ...(field === "direction" && value !== "transfer"
        ? { transferAccountId: "" }
        : {}),
    }));
  }

  function removeWeekTransaction(id: number) {
    setWeekTransactions((current) =>
      current.filter((transaction) => transaction.id !== id),
    );
  }

  function addNewWeekTransaction() {
    if (!hasTransactionData(newWeekTransaction)) {
      return;
    }

    setWeekTransactions((current) => [...current, newWeekTransaction]);
    setNewWeekTransaction(createTransactionDraft(newWeekTransaction.date));
  }

  function updateWeekInvestmentSnapshot(accountId: number, value: string) {
    setWeekInvestmentSnapshots((current) =>
      current.map((snapshot) =>
        snapshot.accountId === accountId ? { ...snapshot, value } : snapshot,
      ),
    );
  }

  function toggleWeekCompletion(habitId: number, date: string) {
    setWeekCompletionKeys((current) => {
      const next = new Set(current);
      const key = `${habitId}:${date}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function switchMode(nextMode: LogMode) {
    if (nextMode === mode) {
      return;
    }
    setActionState({ ok: true });
    setMode(nextMode);
  }

  function updateTransaction(
    id: number,
    field: keyof Omit<TransactionDraft, "id">,
    value: string,
  ) {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              [field]: value,
              ...(field === "direction" && value === "transfer"
                ? { categoryId: "" }
                : {}),
              ...(field === "direction" && value !== "transfer"
                ? { transferAccountId: "" }
                : {}),
            }
          : transaction,
      ),
    );
  }

  function updateNewTransaction(
    field: keyof Omit<TransactionDraft, "id">,
    value: string,
  ) {
    setNewTransaction((current) => ({
      ...current,
      [field]: value,
      ...(field === "direction" && value === "transfer" ? { categoryId: "" } : {}),
      ...(field === "direction" && value !== "transfer"
        ? { transferAccountId: "" }
        : {}),
    }));
  }

  function removeTransaction(id: number) {
    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== id),
    );
  }

  function hasTransactionData(transaction: TransactionDraft) {
    return (
      transaction.amount.trim() !== "" ||
      transaction.accountId !== "" ||
      transaction.categoryId !== "" ||
      transaction.transferAccountId !== ""
    );
  }

  function addNewTransaction() {
    if (!hasTransactionData(newTransaction)) {
      return;
    }

    setTransactions((current) => [...current, newTransaction]);
    setNewTransaction(createTransactionDraft());
  }

  function toggleHabit(habitId: number) {
    setCompletedHabitIds((current) =>
      current.includes(habitId)
        ? current.filter((id) => id !== habitId)
        : [...current, habitId],
    );
  }

  function updateInvestmentSnapshot(accountId: number, value: string) {
    setInvestmentSnapshots((current) =>
      current.map((snapshot) =>
        snapshot.accountId === accountId ? { ...snapshot, value } : snapshot,
      ),
    );
  }

  function resetForm() {
    setTransactions([]);
    setNewTransaction(createTransactionDraft());
    setCompletedHabitIds([]);
    setInvestmentSnapshots([]);
    setLogDate(getTodayDateString());
    setWeekStart(getWeekStartFromDate(getTodayDateString()));
    setWeekCompletionKeys(new Set());
    setWeekTransactions([]);
    setNewWeekTransaction(createTransactionDraft());
    setWeekInvestmentSnapshots([]);
    setActionState({ ok: true });
  }

  async function handleDaySubmit() {
    setPending(true);
    setActionState({ ok: true });

    const filledTransactions = transactions.filter(
      (transaction) => hasTransactionData(transaction),
    );
    const transactionsToSubmit = hasTransactionData(newTransaction)
      ? [...filledTransactions, newTransaction]
      : filledTransactions;
    const formData = new FormData();
    formData.set("date", logDate);
    formData.set("transactions", JSON.stringify(transactionsToSubmit));
    formData.set("habitIds", JSON.stringify(completedHabitIds));
    formData.set("investmentSnapshots", JSON.stringify(investmentSnapshots));

    const result = await submitDailyLog(formData);
    setActionState(result);
    setPending(false);

    if (result.ok) {
      router.refresh();
      onClose();
    }
  }

  async function handleWeekSubmit() {
    setPending(true);
    setActionState({ ok: true });

    const completions = Array.from(weekCompletionKeys).map((key) => {
      const [habitId, date] = key.split(":");
      return { habitId: Number(habitId), date };
    });
    const filledWeekTransactions = weekTransactions.filter((transaction) =>
      hasTransactionData(transaction),
    );
    const transactionsToSubmit = hasTransactionData(newWeekTransaction)
      ? [...filledWeekTransactions, newWeekTransaction]
      : filledWeekTransactions;
    const formData = new FormData();
    formData.set("weekStart", weekStart);
    formData.set("completions", JSON.stringify(completions));
    formData.set("transactions", JSON.stringify(transactionsToSubmit));
    formData.set(
      "investmentSnapshots",
      JSON.stringify(weekInvestmentSnapshots),
    );

    const result = await submitWeeklyLog(formData);
    setActionState(result);
    setPending(false);

    if (result.ok) {
      router.refresh();
      onClose();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "day") {
      await handleDaySubmit();
    } else {
      await handleWeekSubmit();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="log-modal-title"
      onClose={() => {
        setActionState({ ok: true });
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dialogRef.current?.close();
        }
      }}
      className="mx-auto mt-6 w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-lg bg-white p-0 shadow-xl backdrop:bg-zinc-950/45 sm:my-auto"
    >
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="log-modal-title" className="text-xl font-semibold">
            Log
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "day"
              ? "Add transactions and mark completed habits"
              : "Tick off the days you completed each habit this week"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-zinc-100 p-1 text-sm font-semibold">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${
                mode === "day"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
              onClick={() => switchMode("day")}
            >
              Day
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${
                mode === "week"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
              onClick={() => switchMode("week")}
            >
              Week
            </button>
          </div>
          <button
            type="button"
            aria-label="Close log"
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => dialogRef.current?.close()}
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

        {!actionState.ok && actionState.message && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            {actionState.message}
          </div>
        )}

        {loadingOptions ? (
          <p className="p-5 text-sm font-medium text-zinc-500">Loading log options...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
              {mode === "day" && options && (
              <>
              <div className="max-w-48">
                <label className="text-sm font-semibold text-zinc-700" htmlFor="log-date">
                  Date
                </label>
                <input
                  id="log-date"
                  type="date"
                  value={logDate}
                  onChange={(event) => {
                    setActionState({ ok: true });
                    setOptions(null);
                    setTransactions([]);
                    setNewTransaction(createTransactionDraft());
                    setCompletedHabitIds([]);
                    setInvestmentSnapshots([]);
                    setLogDate(event.target.value);
                  }}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5"
                />
              </div>

              {investmentSnapshots.length > 0 && (
                <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <h3 className="font-semibold">Investment snapshots</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Record first-of-month account values so investment returns can be separated from contributions.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {investmentSnapshots.map((snapshot) => (
                      <label key={snapshot.accountId} className="block">
                        <span className="text-sm font-semibold text-zinc-700">
                          {snapshot.name}
                        </span>
                        <input
                          value={snapshot.value}
                          inputMode="decimal"
                          placeholder="0.00"
                          onChange={(event) =>
                            updateInvestmentSnapshot(
                              snapshot.accountId,
                              event.target.value,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Transactions</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Income adds, outgoing subtracts, transfers move money between accounts
                    </p>
                  </div>
                </div>

                {!canAddTransactions && (
                  <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                    Add accounts and finance categories before logging transactions.
                  </p>
                )}

                <div className="mt-3 space-y-3">
                  {transactions.length === 0 && (
                    <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">
                      No transactions logged for this date
                    </p>
                  )}

                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="grid gap-2 rounded-lg border border-zinc-200 p-3 lg:grid-cols-[120px_1fr_1fr_140px_auto]"
                    >
                      <select
                        value={transaction.direction}
                        disabled={!canAddTransactions}
                        onChange={(event) =>
                          updateTransaction(
                            transaction.id,
                            "direction",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                      >
                        <option value="outgoing">Outgoing</option>
                        <option value="income">Income</option>
                        <option value="transfer">Transfer</option>
                      </select>
                      <select
                        value={transaction.accountId}
                        disabled={!canAddTransactions}
                        onChange={(event) =>
                          updateTransaction(
                            transaction.id,
                            "accountId",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                      >
                        <option value="">
                          {transaction.direction === "transfer" ? "From account" : "Account"}
                        </option>
                        {options?.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                      {transaction.direction === "transfer" ? (
                        <select
                          value={transaction.transferAccountId}
                          disabled={!canAddTransactions}
                          onChange={(event) =>
                            updateTransaction(
                              transaction.id,
                              "transferAccountId",
                              event.target.value,
                            )
                          }
                          className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                        >
                          <option value="">To account</option>
                          {options?.accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={transaction.categoryId}
                          disabled={!canAddTransactions}
                          onChange={(event) =>
                            updateTransaction(
                              transaction.id,
                              "categoryId",
                              event.target.value,
                            )
                          }
                          className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                        >
                          <option value="">Category</option>
                          {options?.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        value={transaction.amount}
                        disabled={!canAddTransactions}
                        inputMode="decimal"
                        placeholder="0.00"
                        onChange={(event) =>
                          updateTransaction(
                            transaction.id,
                            "amount",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-2 py-1.5 text-right disabled:bg-zinc-100"
                      />
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                        onClick={() => removeTransaction(transaction.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-[120px_1fr_1fr_140px_auto]">
                    <select
                      value={newTransaction.direction}
                      disabled={!canAddTransactions}
                      onChange={(event) =>
                        updateNewTransaction("direction", event.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                    >
                      <option value="outgoing">Outgoing</option>
                      <option value="income">Income</option>
                      <option value="transfer">Transfer</option>
                    </select>
                    <select
                      value={newTransaction.accountId}
                      disabled={!canAddTransactions}
                      onChange={(event) =>
                        updateNewTransaction("accountId", event.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                    >
                      <option value="">
                        {newTransaction.direction === "transfer"
                          ? "From account"
                          : "Account"}
                      </option>
                      {options?.accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    {newTransaction.direction === "transfer" ? (
                      <select
                        value={newTransaction.transferAccountId}
                        disabled={!canAddTransactions}
                        onChange={(event) =>
                          updateNewTransaction(
                            "transferAccountId",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                      >
                        <option value="">To account</option>
                        {options?.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={newTransaction.categoryId}
                        disabled={!canAddTransactions}
                        onChange={(event) =>
                          updateNewTransaction("categoryId", event.target.value)
                        }
                        className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                      >
                        <option value="">Category</option>
                        {options?.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      value={newTransaction.amount}
                      disabled={!canAddTransactions}
                      inputMode="decimal"
                      placeholder="0.00"
                      onChange={(event) =>
                        updateNewTransaction("amount", event.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1.5 text-right disabled:bg-zinc-100"
                    />
                    <button
                      type="button"
                      disabled={!canAddTransactions}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-zinc-300"
                      onClick={addNewTransaction}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="font-semibold">Completed habits</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Checked habits update completion history
                </p>

                {options && options.habits.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">
                    No habits setup
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {options?.habits.map((habit) => (
                      <label
                        key={habit.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                      >
                        <span>
                          <span className="block font-semibold">{habit.name}</span>
                          <span className="mt-1 block text-sm text-zinc-500">
                            {habit.schedule} · {habit.streakLabel} streak
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={completedHabitIds.includes(habit.id)}
                          onChange={() => toggleHabit(habit.id)}
                          className="h-5 w-5"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
              </>
              )}

              {mode === "week" && weeklyOptions && (
                <>
                  <div className="max-w-64">
                    <label
                      className="text-sm font-semibold text-zinc-700"
                      htmlFor="log-week"
                    >
                      Week of
                    </label>
                    <input
                      id="log-week"
                      type="date"
                      value={weekStart}
                      onChange={(event) => {
                        setActionState({ ok: true });
                        setWeeklyOptions(null);
                        setWeekCompletionKeys(new Set());
                        setWeekStart(getWeekStartFromDate(event.target.value));
                      }}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Snaps to the Monday of the chosen week
                    </p>
                  </div>

                  {weekInvestmentSnapshots.length > 0 && (
                    <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <h3 className="font-semibold">Investment snapshots</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        First-of-month values for{" "}
                        {new Date(
                          `${weekInvestmentSnapshots[0].date}T00:00:00Z`,
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "long",
                        })}
                        .
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {weekInvestmentSnapshots.map((snapshot) => (
                          <label key={snapshot.accountId} className="block">
                            <span className="text-sm font-semibold text-zinc-700">
                              {snapshot.name}
                            </span>
                            <input
                              value={snapshot.value}
                              inputMode="decimal"
                              placeholder="0.00"
                              aria-label={`${snapshot.name} snapshot value`}
                              onChange={(event) =>
                                updateWeekInvestmentSnapshot(
                                  snapshot.accountId,
                                  event.target.value,
                                )
                              }
                              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right tabular-nums"
                            />
                          </label>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="mt-6">
                    <h3 className="font-semibold">Transactions</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Pick the day each transaction belongs to. All days are
                      within the selected week.
                    </p>

                    {!canAddWeekTransactions && (
                      <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                        Add accounts and finance categories before logging
                        transactions.
                      </p>
                    )}

                    <div className="mt-3 space-y-3">
                      {weekTransactions.length === 0 && (
                        <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">
                          No transactions logged for this week
                        </p>
                      )}

                      {weekTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="grid gap-2 rounded-lg border border-zinc-200 p-3 lg:grid-cols-[110px_120px_1fr_1fr_140px_auto]"
                        >
                          <select
                            value={transaction.date}
                            disabled={!canAddWeekTransactions}
                            aria-label="Transaction date"
                            onChange={(event) =>
                              updateWeekTransaction(
                                transaction.id,
                                "date",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                          >
                            {weeklyOptions.days.map((day) => (
                              <option key={day.date} value={day.date}>
                                {day.label} {day.dayNum}
                              </option>
                            ))}
                          </select>
                          <select
                            value={transaction.direction}
                            disabled={!canAddWeekTransactions}
                            aria-label="Transaction direction"
                            onChange={(event) =>
                              updateWeekTransaction(
                                transaction.id,
                                "direction",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                          >
                            <option value="outgoing">Outgoing</option>
                            <option value="income">Income</option>
                            <option value="transfer">Transfer</option>
                          </select>
                          <select
                            value={transaction.accountId}
                            disabled={!canAddWeekTransactions}
                            aria-label="Transaction account"
                            onChange={(event) =>
                              updateWeekTransaction(
                                transaction.id,
                                "accountId",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                          >
                            <option value="">
                              {transaction.direction === "transfer"
                                ? "From account"
                                : "Account"}
                            </option>
                            {weeklyOptions.accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                          {transaction.direction === "transfer" ? (
                            <select
                              value={transaction.transferAccountId}
                              disabled={!canAddWeekTransactions}
                              aria-label="Destination account"
                              onChange={(event) =>
                                updateWeekTransaction(
                                  transaction.id,
                                  "transferAccountId",
                                  event.target.value,
                                )
                              }
                              className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                            >
                              <option value="">To account</option>
                              {weeklyOptions.accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={transaction.categoryId}
                              disabled={!canAddWeekTransactions}
                              aria-label="Transaction category"
                              onChange={(event) =>
                                updateWeekTransaction(
                                  transaction.id,
                                  "categoryId",
                                  event.target.value,
                                )
                              }
                              className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                            >
                              <option value="">Category</option>
                              {weeklyOptions.categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            value={transaction.amount}
                            disabled={!canAddWeekTransactions}
                            inputMode="decimal"
                            placeholder="0.00"
                            aria-label="Transaction amount"
                            onChange={(event) =>
                              updateWeekTransaction(
                                transaction.id,
                                "amount",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1.5 text-right tabular-nums disabled:bg-zinc-100"
                          />
                          <button
                            type="button"
                            className="min-w-24 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                            onClick={() => removeWeekTransaction(transaction.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-[110px_120px_1fr_1fr_140px_auto]">
                        <select
                          value={newWeekTransaction.date}
                          disabled={!canAddWeekTransactions}
                          aria-label="New transaction date"
                          onChange={(event) =>
                            updateNewWeekTransaction("date", event.target.value)
                          }
                          className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                        >
                          {weeklyOptions.days.map((day) => (
                            <option key={day.date} value={day.date}>
                              {day.label} {day.dayNum}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newWeekTransaction.direction}
                          disabled={!canAddWeekTransactions}
                          aria-label="New transaction direction"
                          onChange={(event) =>
                            updateNewWeekTransaction(
                              "direction",
                              event.target.value,
                            )
                          }
                          className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                        >
                          <option value="outgoing">Outgoing</option>
                          <option value="income">Income</option>
                          <option value="transfer">Transfer</option>
                        </select>
                        <select
                          value={newWeekTransaction.accountId}
                          disabled={!canAddWeekTransactions}
                          aria-label="New transaction account"
                          onChange={(event) =>
                            updateNewWeekTransaction(
                              "accountId",
                              event.target.value,
                            )
                          }
                          className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                        >
                          <option value="">
                            {newWeekTransaction.direction === "transfer"
                              ? "From account"
                              : "Account"}
                          </option>
                          {weeklyOptions.accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        {newWeekTransaction.direction === "transfer" ? (
                          <select
                            value={newWeekTransaction.transferAccountId}
                            disabled={!canAddWeekTransactions}
                            aria-label="New transaction destination account"
                            onChange={(event) =>
                              updateNewWeekTransaction(
                                "transferAccountId",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                          >
                            <option value="">To account</option>
                            {weeklyOptions.accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={newWeekTransaction.categoryId}
                            disabled={!canAddWeekTransactions}
                            aria-label="New transaction category"
                            onChange={(event) =>
                              updateNewWeekTransaction(
                                "categoryId",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
                          >
                            <option value="">Category</option>
                            {weeklyOptions.categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          value={newWeekTransaction.amount}
                          disabled={!canAddWeekTransactions}
                          inputMode="decimal"
                          placeholder="0.00"
                          aria-label="New transaction amount"
                          onChange={(event) =>
                            updateNewWeekTransaction(
                              "amount",
                              event.target.value,
                            )
                          }
                          className="rounded-md border border-zinc-300 px-2 py-1.5 text-right tabular-nums disabled:bg-zinc-100"
                        />
                        <button
                          type="button"
                          disabled={!canAddWeekTransactions}
                          className="min-w-24 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-zinc-300"
                          onClick={addNewWeekTransaction}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="mt-6">
                    <h3 className="font-semibold">Completed habits</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Tick each day you completed the habit. Monthly habits are
                      managed in Day mode.
                    </p>

                    {weeklyOptions.habits.length === 0 ? (
                      <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">
                        No daily or weekly habits setup
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <div className="min-w-[640px]">
                          <div
                            className="grid items-center gap-2 border-b border-zinc-200 pb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500"
                            style={{
                              gridTemplateColumns:
                                "minmax(160px, 1fr) repeat(7, minmax(2.5rem, 3rem))",
                            }}
                          >
                            <span className="text-left normal-case tracking-normal">
                              Habit
                            </span>
                            {weeklyOptions.days.map((day) => (
                              <span
                                key={day.date}
                                className={
                                  day.isToday
                                    ? "text-emerald-700"
                                    : undefined
                                }
                              >
                                {day.label}
                                <span className="block text-[10px] font-medium tabular-nums text-zinc-400">
                                  {day.dayNum}
                                </span>
                              </span>
                            ))}
                          </div>

                          <div className="divide-y divide-zinc-100">
                            {weeklyOptions.habits.map((habit) => (
                              <div
                                key={habit.id}
                                className="grid items-center gap-2 py-2"
                                style={{
                                  gridTemplateColumns:
                                    "minmax(160px, 1fr) repeat(7, minmax(2.5rem, 3rem))",
                                }}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-semibold">
                                    {habit.name}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                                    {habit.schedule} · {habit.streakLabel}{" "}
                                    streak
                                  </p>
                                </div>
                                {weeklyOptions.days.map((day) => {
                                  const key = `${habit.id}:${day.date}`;
                                  const checked = weekCompletionKeys.has(key);
                                  return (
                                    <label
                                      key={day.date}
                                      className="flex cursor-pointer items-center justify-center"
                                    >
                                      <span className="sr-only">
                                        {habit.name} on {day.label}{" "}
                                        {day.dayNum}
                                      </span>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          toggleWeekCompletion(
                                            habit.id,
                                            day.date,
                                          )
                                        }
                                        className="h-5 w-5"
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {weeklyOptions.monthlyHabitCount > 0 && (
                      <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs font-medium text-blue-800">
                        {weeklyOptions.monthlyHabitCount} monthly{" "}
                        {weeklyOptions.monthlyHabitCount === 1
                          ? "habit is"
                          : "habits are"}{" "}
                        only available in Day mode (one completion per month).
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
              <button
                type="button"
                disabled={pending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-white"
                onClick={resetForm}
              >
                Discard changes
              </button>
              <button
                type="submit"
                disabled={pending || loadingOptions}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-zinc-300"
              >
                {pending ? "Saving" : "Save log"}
              </button>
            </div>
          </form>
        )}
    </dialog>
  );
}
