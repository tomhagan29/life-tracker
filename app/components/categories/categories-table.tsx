"use client";

import type { CategoryActionState } from "@/app/actions/categories";
import {
  createFinanceCategory,
  createHabitCategory,
  deleteFinanceCategory,
  deleteHabitCategory,
  updateFinanceCategory,
  updateHabitCategory,
} from "@/app/actions/categories";
import { Column, DataTable } from "@/app/components/shared/data-table";
import { useState } from "react";

type CategoryKind = "finance" | "habit";

export type CategoryRow = {
  id: number;
  name: string;
};

type CategoriesTableProps = {
  title: string;
  description: string;
  kind: CategoryKind;
  categories: CategoryRow[];
};

const categoryActions = {
  finance: {
    create: createFinanceCategory,
    update: updateFinanceCategory,
    delete: deleteFinanceCategory,
  },
  habit: {
    create: createHabitCategory,
    update: updateHabitCategory,
    delete: deleteHabitCategory,
  },
};

export function CategoriesTable({
  title,
  description,
  kind,
  categories,
}: CategoriesTableProps) {
  const addFormId = `add-${kind}-category-form`;
  const actions = categoryActions[kind];
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [actionState, setActionState] = useState<CategoryActionState>({
    ok: true,
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function handleCreateCategory(
    formData: FormData,
    form: HTMLFormElement,
  ) {
    setPendingAction("create");
    setActionState({ ok: true });

    const result = await actions.create(formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      form.reset();
    }
  }

  async function handleUpdateCategory(id: number, formData: FormData) {
    setPendingAction(`update-${id}`);
    setActionState({ ok: true });

    const result = await actions.update(id, formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      setEditingCategoryId(null);
    }
  }

  async function handleDeleteCategory(id: number) {
    setPendingAction(`delete-${id}`);
    setActionState({ ok: true });

    const result = await actions.delete(id);
    setActionState(result);
    setPendingAction(null);
  }

  const columns: Column<CategoryRow>[] = [
    {
      key: "name",
      header: "Name",
      className: "font-semibold",
      cell: (row) =>
        editingCategoryId === row.id ? (
          <input
            form={`edit-${kind}-category-form-${row.id}`}
            name="name"
            defaultValue={row.name}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 font-normal"
          />
        ) : (
          row.name
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => {
        const isEditing = editingCategoryId === row.id;
        const editFormId = `edit-${kind}-category-form-${row.id}`;

        return (
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <form
                  id={editFormId}
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleUpdateCategory(
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
                  onClick={() => setEditingCategoryId(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                  onClick={() => setEditingCategoryId(row.id)}
                >
                  Edit
                </button>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleDeleteCategory(row.id);
                  }}
                >
                  <button
                    type="submit"
                    disabled={pendingAction === `delete-${row.id}`}
                    className="rounded-md border border-red-200 px-2.5 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    {pendingAction === `delete-${row.id}` ? "Deleting" : "Delete"}
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
      <div className="border-b border-zinc-200 p-5">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>

      {!actionState.ok && actionState.message && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {actionState.message}
        </div>
      )}

      <DataTable
        rows={categories}
        columns={columns}
        getRowKey={(row) => row.id}
        footer={
          <tr className="border-t border-zinc-200 bg-zinc-50">
            <td className="px-5 py-3">
              <form
                id={addFormId}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateCategory(
                    new FormData(event.currentTarget),
                    event.currentTarget,
                  );
                }}
              />
              <input
                form={addFormId}
                name="name"
                placeholder="Category name"
                className="w-full rounded-md border border-zinc-300 px-2 py-1"
              />
            </td>
            <td className="px-5 py-3 text-right">
              <button
                form={addFormId}
                type="submit"
                disabled={pendingAction === "create"}
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
