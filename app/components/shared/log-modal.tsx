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
  direction: "outgoing" | "income";
  amount: string;
  accountId: string;
  categoryId: string;
};

type LogModalProps = {
  open: boolean;
  onClose: () => void;
};

const today = new Date().toISOString().slice(0, 10);

function createTransactionDraft(): TransactionDraft {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    direction: "outgoing",
    amount: "",
    accountId: "",
    categoryId: "",
  };
}

export function LogModal({ open, onClose }: LogModalProps) {
  const router = useRouter();
  const [options, setOptions] = useState<DailyLogOptions | null>(null);
  const hasRequestedOptions = useRef(false);
  const [transactions, setTransactions] = useState<TransactionDraft[]>([
    createTransactionDraft(),
  ]);
  const [completedHabitIds, setCompletedHabitIds] = useState<number[]>([]);
  const [logDate, setLogDate] = useState(today);
  const [actionState, setActionState] = useState<DailyLogActionState>({
    ok: true,
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || options || hasRequestedOptions.current) {
      return;
    }

    hasRequestedOptions.current = true;
    getDailyLogOptions()
      .then(setOptions)
      .catch(() =>
        setActionState({
          ok: false,
          message: "Could not load log options. Please try again.",
        }),
      );
  }, [open, options]);

  const canAddTransactions = useMemo(
    () =>
      Boolean(
        options && options.accounts.length > 0 && options.categories.length > 0,
      ),
    [options],
  );
  const loadingOptions = open && !options && actionState.ok;

  if (!open) {
    return null;
  }

  function updateTransaction(
    id: number,
    field: keyof Omit<TransactionDraft, "id">,
    value: string,
  ) {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id ? { ...transaction, [field]: value } : transaction,
      ),
    );
  }

  function removeTransaction(id: number) {
    setTransactions((current) =>
      current.length === 1
        ? [createTransactionDraft()]
        : current.filter((transaction) => transaction.id !== id),
    );
  }

  function toggleHabit(habitId: number) {
    setCompletedHabitIds((current) =>
      current.includes(habitId)
        ? current.filter((id) => id !== habitId)
        : [...current, habitId],
    );
  }

  function resetForm() {
    setTransactions([createTransactionDraft()]);
    setCompletedHabitIds([]);
    setLogDate(today);
    setActionState({ ok: true });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setActionState({ ok: true });

    const filledTransactions = transactions.filter(
      (transaction) =>
        transaction.amount.trim() !== "" ||
        transaction.accountId !== "" ||
        transaction.categoryId !== "",
    );
    const formData = new FormData();
    formData.set("date", logDate);
    formData.set("transactions", JSON.stringify(filledTransactions));
    formData.set("habitIds", JSON.stringify(completedHabitIds));

    const result = await submitDailyLog(formData);
    setActionState(result);
    setPending(false);

    if (result.ok) {
      resetForm();
      router.refresh();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/45 px-4 py-6 sm:items-center">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold">Daily log</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Add transactions and mark completed habits
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50"
            onClick={() => {
              setActionState({ ok: true });
              onClose();
            }}
          >
            Close
          </button>
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
              <div className="max-w-48">
                <label className="text-sm font-semibold text-zinc-700" htmlFor="log-date">
                  Date
                </label>
                <input
                  id="log-date"
                  type="date"
                  value={logDate}
                  onChange={(event) => setLogDate(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5"
                />
              </div>

              <section className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Transactions</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Income adds to the account, outgoing subtracts from it
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canAddTransactions}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
                    onClick={() =>
                      setTransactions((current) => [
                        ...current,
                        createTransactionDraft(),
                      ])
                    }
                  >
                    Add row
                  </button>
                </div>

                {!canAddTransactions && (
                  <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                    Add at least one account and finance category before logging
                    transactions.
                  </p>
                )}

                <div className="mt-3 space-y-3">
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
                        <option value="">Account</option>
                        {options?.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
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
                </div>
              </section>

              <section className="mt-6">
                <h3 className="font-semibold">Completed habits</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Checked habits will have their streak incremented
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
                            {habit.schedule} · {habit.streak} day streak
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
                Reset
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
      </div>
    </div>
  );
}
