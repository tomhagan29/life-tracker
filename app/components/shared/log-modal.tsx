"use client";

import {
  getDailyLogOptions,
  submitDailyLog,
  type DailyLogActionState,
  type DailyLogOptions,
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
};

type InvestmentSnapshotDraft = {
  accountId: number;
  name: string;
  value: string;
};

type LogModalProps = {
  open: boolean;
  onClose: () => void;
};

function createTransactionDraft(): TransactionDraft {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    direction: "outgoing",
    amount: "",
    accountId: "",
    categoryId: "",
    transferAccountId: "",
  };
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function LogModal({ open, onClose }: LogModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<DailyLogOptions | null>(null);
  const [transactions, setTransactions] = useState<TransactionDraft[]>([]);
  const [newTransaction, setNewTransaction] = useState(createTransactionDraft);
  const [completedHabitIds, setCompletedHabitIds] = useState<number[]>([]);
  const [investmentSnapshots, setInvestmentSnapshots] = useState<
    InvestmentSnapshotDraft[]
  >([]);
  const [logDate, setLogDate] = useState(getTodayDateString);
  const [actionState, setActionState] = useState<DailyLogActionState>({
    ok: true,
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
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
          })),
        );
        setNewTransaction(createTransactionDraft());
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
  }, [open, logDate]);

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
  const loadingOptions = open && !options && actionState.ok;

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
    setActionState({ ok: true });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      className="mx-auto mt-6 w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-lg bg-white p-0 shadow-xl backdrop:bg-zinc-950/45 sm:my-auto"
    >
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <h2 id="log-modal-title" className="text-xl font-semibold">
            Daily log
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add transactions and mark completed habits
          </p>
        </div>
        <button
          type="button"
          aria-label="Close daily log"
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

        {!actionState.ok && actionState.message && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            {actionState.message}
          </div>
        )}

        {loadingOptions && !options ? (
          <p className="p-5 text-sm font-medium text-zinc-500">Loading log options...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
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
