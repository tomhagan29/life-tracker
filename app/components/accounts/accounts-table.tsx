"use client";

import { useState } from "react";
import type { AccountActionState } from "../../actions/accounts";
import {
  createAccount,
  deleteAccount,
  updateAccount,
} from "../../actions/accounts";
import { Column, DataTable } from "../shared/data-table";

type AccountType = "current" | "savings" | "credit" | "investment";

export type AccountRow = {
  id: number;
  name: string;
  type: string;
  rawType: AccountType;
  balance: string;
  balanceValue: number;
  outgoings: string;
  outgoingsValue: number;
  transactionCount: number;
  budgetItemCount: number;
  investmentSnapshotCount: number;
};

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit" },
  { value: "investment", label: "Investment" },
];

export function AccountsTable({ accounts }: { accounts: AccountRow[] }) {
  const addFormId = "add-account-form";
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [actionState, setActionState] = useState<AccountActionState>({
    ok: true,
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const rows = accounts;

  async function handleCreateAccount(
    formData: FormData,
    form: HTMLFormElement,
  ) {
    setPendingAction("create");
    setActionState({ ok: true });

    const result = await createAccount(formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      form.reset();
    }
  }

  async function handleUpdateAccount(id: number, formData: FormData) {
    setPendingAction(`update-${id}`);
    setActionState({ ok: true });

    const result = await updateAccount(id, formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      setEditingAccountId(null);
    }
  }

  function getDeleteWarning(row: AccountRow) {
    return (
      `${row.name} has ${row.transactionCount} transactions, ` +
      `${row.budgetItemCount} budget items, and ` +
      `${row.investmentSnapshotCount} investment snapshots. ` +
      "Move or delete those records before deleting the account."
    );
  }

  function hasLinkedRecords(row: AccountRow) {
    return (
      row.transactionCount > 0 ||
      row.budgetItemCount > 0 ||
      row.investmentSnapshotCount > 0
    );
  }

  async function handleDeleteAccount(row: AccountRow) {
    if (hasLinkedRecords(row)) {
      setActionState({
        ok: false,
        message: getDeleteWarning(row),
      });
      return;
    }

    const confirmed = window.confirm(
      `Delete account ${row.name}? This account has ` +
        `${row.transactionCount} transactions, ${row.budgetItemCount} budget items, ` +
        `and ${row.investmentSnapshotCount} investment snapshots. This is irreversible.`,
    );

    if (!confirmed) {
      return;
    }

    setPendingAction(`delete-${row.id}`);
    setActionState({ ok: true });

    const result = await deleteAccount(row.id);
    setActionState(result);
    setPendingAction(null);
  }

  const columns: Column<AccountRow>[] = [
    {
      key: "name",
      header: "Name",
      className: "font-semibold",
      cell: (row) =>
        editingAccountId === row.id ? (
          <input
            form={`edit-account-form-${row.id}`}
            name="name"
            defaultValue={row.name}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 font-normal"
          />
        ) : (
          row.name
        ),
    },
    {
      key: "type",
      header: "Type",
      className: "text-zinc-500",
      cell: (row) =>
        editingAccountId === row.id ? (
          <select
            form={`edit-account-form-${row.id}`}
            name="type"
            defaultValue={row.rawType}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-zinc-950"
          >
            {accountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        ) : (
          row.type
        ),
    },
    {
      key: "balance",
      header: "Balance",
      className: "text-right font-semibold tabular-nums",
      cell: (row) => (
        <div className={editingAccountId === row.id ? "py-1" : ""}>
          <span
            className={row.balanceValue < 0 ? "text-rose-600" : "text-emerald-600"}
          >
            {row.balance}
          </span>
        </div>
      ),
    },
    {
      key: "outgoings",
      header: "Monthly outgoings",
      className: "text-right tabular-nums",
      cell: (row) => (
        <div className={editingAccountId === row.id ? "py-1" : ""}>
          <span
            className={
              row.outgoingsValue > 0 ? "text-zinc-700" : "text-zinc-400"
            }
          >
            {row.outgoings}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => {
        const isEditing = editingAccountId === row.id;
        const editFormId = `edit-account-form-${row.id}`;

        return (
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <form
                  id={editFormId}
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleUpdateAccount(
                      row.id,
                      new FormData(event.currentTarget),
                    );
                  }}
                />
                <button
                  form={editFormId}
                  type="submit"
                  disabled={pendingAction === `update-${row.id}`}
                  className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  {pendingAction === `update-${row.id}` ? "Saving" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={pendingAction === `update-${row.id}`}
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                  onClick={() => setEditingAccountId(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                  onClick={() => setEditingAccountId(row.id)}
                >
                  Edit
                </button>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleDeleteAccount(row);
                  }}
                >
                  <button
                    type="submit"
                    disabled={pendingAction === `delete-${row.id}`}
                    className="rounded-md border border-red-200 px-2.5 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    {pendingAction === `delete-${row.id}`
                      ? "Deleting"
                      : "Delete"}
                  </button>
                </form>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Accounts</h3>
          <p className="mt-1 text-sm text-zinc-500">Your account balances</p>
        </div>
      </div>

      {!actionState.ok && actionState.message && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {actionState.message}
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        footer={
          <tr className="border-t border-zinc-200 bg-zinc-50">
            <td className="px-5 py-3">
              <form
                id={addFormId}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateAccount(
                    new FormData(event.currentTarget),
                    event.currentTarget,
                  );
                }}
              />
              <input
                form={addFormId}
                name="name"
                placeholder="Account name"
                aria-label="New account name"
                className="w-full rounded-md border border-zinc-300 px-2 py-1"
              />
            </td>

            <td className="px-5 py-3">
              <select
                className="w-full rounded-md border border-zinc-300 px-2 py-1"
                form={addFormId}
                name="type"
                aria-label="New account type"
              >
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </td>

            <td className="px-5 py-3">
              <input
                form={addFormId}
                name="balance"
                placeholder="0.00"
                aria-label="New account starting balance"
                className="w-full rounded-md border border-zinc-300 px-2 py-1 text-right tabular-nums"
              />
            </td>

            <td className="px-5 py-3" />

            <td className="px-5 py-3 text-right">
              <button
                form={addFormId}
                type="submit"
                disabled={pendingAction === "create"}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                {pendingAction === "create" ? "Adding" : "Add"}
              </button>
            </td>
          </tr>
        }
      />
    </div>
  );
}
