"use client";

import { useState } from "react";
import type { BudgetItemActionState } from "@/app/actions/budget";
import {
  createBudgetItem,
  deleteBudgetItem,
  updateBudgetItem,
} from "@/app/actions/budget";
import { Column, DataTable } from "@/app/components/shared/data-table";

export type BudgetRow = {
  id: number;
  name: string;
  amount: string;
  amountValue: number;
  dueDay: number | null;
  category: string;
  categoryId: number;
  account: string;
  accountId: number;
};

export type BudgetOption = {
  id: number;
  name: string;
};

type BudgetTableProps = {
  budgetItems: BudgetRow[];
  accounts: BudgetOption[];
  categories: BudgetOption[];
};

const days = Array.from({ length: 31 }, (_, index) => index + 1);

export function BudgetTable({
  budgetItems,
  accounts,
  categories,
}: BudgetTableProps) {
  const addFormId = "add-budget-item-form";
  const [editingBudgetItemId, setEditingBudgetItemId] = useState<number | null>(
    null,
  );
  const [actionState, setActionState] = useState<BudgetItemActionState>({
    ok: true,
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const canAddBudgetItem = accounts.length > 0 && categories.length > 0;

  async function handleCreateBudgetItem(
    formData: FormData,
    form: HTMLFormElement,
  ) {
    setPendingAction("create");
    setActionState({ ok: true });

    const result = await createBudgetItem(formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      form.reset();
    }
  }

  async function handleUpdateBudgetItem(id: number, formData: FormData) {
    setPendingAction(`update-${id}`);
    setActionState({ ok: true });

    const result = await updateBudgetItem(id, formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      setEditingBudgetItemId(null);
    }
  }

  async function handleDeleteBudgetItem(id: number) {
    setPendingAction(`delete-${id}`);
    setActionState({ ok: true });

    const result = await deleteBudgetItem(id);
    setActionState(result);
    setPendingAction(null);
  }

  const columns: Column<BudgetRow>[] = [
    {
      key: "name",
      header: "Name",
      className: "font-semibold",
      cell: (row) =>
        editingBudgetItemId === row.id ? (
          <input
            form={`edit-budget-item-form-${row.id}`}
            name="name"
            defaultValue={row.name}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 font-normal"
          />
        ) : (
          row.name
        ),
    },
    {
      key: "category",
      header: "Category",
      className: "text-zinc-500",
      cell: (row) =>
        editingBudgetItemId === row.id ? (
          <select
            form={`edit-budget-item-form-${row.id}`}
            name="categoryId"
            defaultValue={row.categoryId}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-zinc-950"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        ) : (
          row.category
        ),
    },
    {
      key: "account",
      header: "Account",
      className: "text-zinc-500",
      cell: (row) =>
        editingBudgetItemId === row.id ? (
          <select
            form={`edit-budget-item-form-${row.id}`}
            name="accountId"
            defaultValue={row.accountId}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-zinc-950"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        ) : (
          row.account
        ),
    },
    {
      key: "dueDay",
      header: "Due day",
      className: "text-zinc-500",
      cell: (row) =>
        editingBudgetItemId === row.id ? (
          <select
            form={`edit-budget-item-form-${row.id}`}
            name="dueDay"
            defaultValue={row.dueDay ?? ""}
            className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-zinc-950"
          >
            <option value="">None</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        ) : (
          (row.dueDay ?? "—")
        ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold tabular-nums",
      cell: (row) =>
        editingBudgetItemId === row.id ? (
          <input
            form={`edit-budget-item-form-${row.id}`}
            name="amount"
            defaultValue={row.amount}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-right font-normal text-zinc-950"
          />
        ) : (
          <span className="text-zinc-900">{row.amount}</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => {
        const isEditing = editingBudgetItemId === row.id;
        const editFormId = `edit-budget-item-form-${row.id}`;

        return (
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <form
                  id={editFormId}
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleUpdateBudgetItem(
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
                  onClick={() => setEditingBudgetItemId(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                  onClick={() => setEditingBudgetItemId(row.id)}
                >
                  Edit
                </button>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleDeleteBudgetItem(row.id);
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
          <h3 className="text-xl font-semibold">Budget</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Planned spend by category and account
          </p>
        </div>
      </div>

      {!actionState.ok && actionState.message && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {actionState.message}
        </div>
      )}

      {!canAddBudgetItem && (
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
          Add at least one account and finance category before creating budget
          items.
        </div>
      )}

      <DataTable
        rows={budgetItems}
        columns={columns}
        getRowKey={(row) => row.id}
        footer={
          <tr className="border-t border-zinc-200 bg-zinc-50">
            <td className="px-5 py-3">
              <form
                id={addFormId}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateBudgetItem(
                    new FormData(event.currentTarget),
                    event.currentTarget,
                  );
                }}
              />
              <input
                form={addFormId}
                name="name"
                placeholder="Budget item"
                disabled={!canAddBudgetItem}
                className="w-full rounded-md border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
              />
            </td>
            <td className="px-5 py-3">
              <select
                form={addFormId}
                name="categoryId"
                disabled={!canAddBudgetItem}
                className="w-full rounded-md border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-5 py-3">
              <select
                form={addFormId}
                name="accountId"
                disabled={!canAddBudgetItem}
                className="w-full rounded-md border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-5 py-3">
              <select
                form={addFormId}
                name="dueDay"
                disabled={!canAddBudgetItem}
                className="w-24 rounded-md border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
              >
                <option value="">None</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-5 py-3">
              <input
                form={addFormId}
                name="amount"
                placeholder="0.00"
                disabled={!canAddBudgetItem}
                className="w-full rounded-md border border-zinc-300 px-2 py-1 text-right disabled:bg-zinc-100"
              />
            </td>
            <td className="px-5 py-3 text-right">
              <button
                form={addFormId}
                type="submit"
                disabled={!canAddBudgetItem || pendingAction === "create"}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-zinc-300"
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
