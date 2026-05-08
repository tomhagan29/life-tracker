"use client";

import type { HabitActionState } from "@/app/actions/habits";
import {
  createHabit,
  deleteHabit,
  updateHabit,
} from "@/app/actions/habits";
import { Column, DataTable } from "@/app/components/shared/data-table";
import { useState } from "react";

export type HabitRow = {
  id: number;
  name: string;
  category: string;
  categoryId: number;
  streak: number;
  streakLabel: string;
  schedule: string;
  scheduleValue: string;
};

export type HabitOption = {
  id: number;
  name: string;
};

type HabitsTableProps = {
  habits: HabitRow[];
  categories: HabitOption[];
};

const frequencies = Array.from({ length: 7 }, (_, index) => index + 1);

function ScheduleSelect({
  form,
  defaultValue = "daily",
  disabled,
  ariaLabel,
}: {
  form: string;
  defaultValue?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <select
      form={form}
      name="schedule"
      defaultValue={defaultValue}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-zinc-950 disabled:bg-zinc-100"
    >
      <option value="daily">Daily</option>
      <option value="monthly">Monthly</option>
      {frequencies.map((frequency) => (
        <option key={frequency} value={`weekly-${frequency}`}>
          {frequency}/week
        </option>
      ))}
    </select>
  );
}

export function HabitsTable({ habits, categories }: HabitsTableProps) {
  const addFormId = "add-habit-form";
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [actionState, setActionState] = useState<HabitActionState>({
    ok: true,
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const canAddHabit = categories.length > 0;

  async function handleCreateHabit(
    formData: FormData,
    form: HTMLFormElement,
  ) {
    setPendingAction("create");
    setActionState({ ok: true });

    const result = await createHabit(formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      form.reset();
    }
  }

  async function handleUpdateHabit(id: number, formData: FormData) {
    setPendingAction(`update-${id}`);
    setActionState({ ok: true });

    const result = await updateHabit(id, formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      setEditingHabitId(null);
    }
  }

  async function handleDeleteHabit(id: number) {
    setPendingAction(`delete-${id}`);
    setActionState({ ok: true });

    const result = await deleteHabit(id);
    setActionState(result);
    setPendingAction(null);
  }

  const columns: Column<HabitRow>[] = [
    {
      key: "name",
      header: "Name",
      className: "font-semibold",
      cell: (row) =>
        editingHabitId === row.id ? (
          <input
            form={`edit-habit-form-${row.id}`}
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
        editingHabitId === row.id ? (
          <select
            form={`edit-habit-form-${row.id}`}
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
      key: "schedule",
      header: "Schedule",
      className: "text-zinc-500",
      cell: (row) =>
        editingHabitId === row.id ? (
          <ScheduleSelect
            form={`edit-habit-form-${row.id}`}
            defaultValue={row.scheduleValue}
          />
        ) : (
          row.schedule
        ),
    },
    {
      key: "streak",
      header: "Streak",
      className: "text-right font-semibold",
      cell: (row) => row.streakLabel,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => {
        const isEditing = editingHabitId === row.id;
        const editFormId = `edit-habit-form-${row.id}`;

        return (
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <form
                  id={editFormId}
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleUpdateHabit(row.id, new FormData(event.currentTarget));
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
                  onClick={() => setEditingHabitId(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                  onClick={() => setEditingHabitId(row.id)}
                >
                  Edit
                </button>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleDeleteHabit(row.id);
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
          <h3 className="text-xl font-semibold">Habits</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Routines, streaks, and recurring targets
          </p>
        </div>
      </div>

      {!actionState.ok && actionState.message && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {actionState.message}
        </div>
      )}

      {!canAddHabit && (
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
          Add at least one habit category before creating habits.
        </div>
      )}

      <DataTable
        rows={habits}
        columns={columns}
        getRowKey={(row) => row.id}
        footer={
          <tr className="border-t border-zinc-200 bg-zinc-50">
            <td className="px-5 py-3">
              <form
                id={addFormId}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateHabit(
                    new FormData(event.currentTarget),
                    event.currentTarget,
                  );
                }}
              />
              <input
                form={addFormId}
                name="name"
                placeholder="Habit name"
                aria-label="New habit name"
                disabled={!canAddHabit}
                className="w-full rounded-md border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
              />
            </td>
            <td className="px-5 py-3">
              <select
                form={addFormId}
                name="categoryId"
                aria-label="New habit category"
                disabled={!canAddHabit}
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
              <ScheduleSelect
                form={addFormId}
                disabled={!canAddHabit}
                ariaLabel="New habit schedule"
              />
            </td>
            <td className="px-5 py-3">
              <p className="text-right font-semibold text-zinc-500">0 days</p>
            </td>
            <td className="px-5 py-3 text-right">
              <button
                form={addFormId}
                type="submit"
                disabled={!canAddHabit || pendingAction === "create"}
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
