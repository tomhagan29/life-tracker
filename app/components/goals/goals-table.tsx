"use client";

import type { GoalActionState } from "@/app/actions/goals";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";
import { Column, DataTable } from "@/app/components/shared/data-table";
import { useState } from "react";

type GoalType = "milestone" | "numerical";

export type GoalRow = {
  id: number;
  name: string;
  type: GoalType;
  typeLabel: string;
  targetAmount: string;
  currentAmount: string;
  progress: string;
  deadline: string;
  deadlineValue: string;
};

const goalTypes: { value: GoalType; label: string }[] = [
  { value: "numerical", label: "Numerical" },
  { value: "milestone", label: "Milestone" },
];

function GoalTypeSelect({
  form,
  defaultValue,
  disabled,
  onChange,
}: {
  form: string;
  defaultValue: GoalType;
  disabled?: boolean;
  onChange: (type: GoalType) => void;
}) {
  return (
    <select
      form={form}
      name="type"
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as GoalType)}
      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-zinc-950 disabled:bg-zinc-100"
    >
      {goalTypes.map((type) => (
        <option key={type.value} value={type.value}>
          {type.label}
        </option>
      ))}
    </select>
  );
}

function GoalAmountFields({
  form,
  defaultType,
  defaultCurrentAmount,
  defaultTargetAmount,
  disabled,
}: {
  form: string;
  defaultType: GoalType;
  defaultCurrentAmount?: string;
  defaultTargetAmount?: string;
  disabled?: boolean;
}) {
  const [type, setType] = useState(defaultType);
  const amountsDisabled = disabled || type !== "numerical";

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)]">
      <GoalTypeSelect
        form={form}
        defaultValue={defaultType}
        disabled={disabled}
        onChange={setType}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          form={form}
          name="currentAmount"
          placeholder="Current"
          defaultValue={defaultCurrentAmount}
          disabled={amountsDisabled}
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-right text-zinc-950 disabled:bg-zinc-100"
        />
        <input
          form={form}
          name="targetAmount"
          placeholder="Target"
          defaultValue={defaultTargetAmount}
          disabled={amountsDisabled}
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-right text-zinc-950 disabled:bg-zinc-100"
        />
      </div>
    </div>
  );
}

export function GoalsTable({ goals }: { goals: GoalRow[] }) {
  const addFormId = "add-goal-form";
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [actionState, setActionState] = useState<GoalActionState>({
    ok: true,
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [addFormResetKey, setAddFormResetKey] = useState(0);

  async function handleCreateGoal(formData: FormData, form: HTMLFormElement) {
    setPendingAction("create");
    setActionState({ ok: true });

    const result = await createGoal(formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      form.reset();
      setAddFormResetKey((key) => key + 1);
    }
  }

  async function handleUpdateGoal(id: number, formData: FormData) {
    setPendingAction(`update-${id}`);
    setActionState({ ok: true });

    const result = await updateGoal(id, formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      setEditingGoalId(null);
    }
  }

  async function handleDeleteGoal(id: number) {
    setPendingAction(`delete-${id}`);
    setActionState({ ok: true });

    const result = await deleteGoal(id);
    setActionState(result);
    setPendingAction(null);
  }

  const columns: Column<GoalRow>[] = [
    {
      key: "name",
      header: "Name",
      className: "font-semibold",
      cell: (row) =>
        editingGoalId === row.id ? (
          <input
            form={`edit-goal-form-${row.id}`}
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
      header: "Type and target",
      className: "text-zinc-500",
      cell: (row) =>
        editingGoalId === row.id ? (
          <GoalAmountFields
            form={`edit-goal-form-${row.id}`}
            defaultType={row.type}
            defaultCurrentAmount={row.currentAmount}
            defaultTargetAmount={row.targetAmount}
          />
        ) : (
          <div>
            <p>{row.typeLabel}</p>
            {row.type === "numerical" && (
              <p className="mt-1 text-xs">
                {row.currentAmount} of {row.targetAmount}
              </p>
            )}
          </div>
        ),
    },
    {
      key: "progress",
      header: "Progress",
      className: "text-right font-semibold",
      cell: (row) => row.progress,
    },
    {
      key: "deadline",
      header: "Deadline",
      className: "text-zinc-500",
      cell: (row) =>
        editingGoalId === row.id ? (
          <input
            form={`edit-goal-form-${row.id}`}
            name="deadline"
            type="date"
            defaultValue={row.deadlineValue}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-zinc-950"
          />
        ) : (
          row.deadline
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => {
        const isEditing = editingGoalId === row.id;
        const editFormId = `edit-goal-form-${row.id}`;

        return (
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <form
                  id={editFormId}
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleUpdateGoal(row.id, new FormData(event.currentTarget));
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
                  onClick={() => setEditingGoalId(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                  onClick={() => setEditingGoalId(row.id)}
                >
                  Edit
                </button>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleDeleteGoal(row.id);
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
          <h3 className="text-xl font-semibold">Goals</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Numerical goals, milestones, progress, and deadlines
          </p>
        </div>
      </div>

      {!actionState.ok && actionState.message && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {actionState.message}
        </div>
      )}

      <DataTable
        rows={goals}
        columns={columns}
        getRowKey={(row) => row.id}
        footer={
          <tr className="border-t border-zinc-200 bg-zinc-50">
            <td className="px-5 py-3">
              <form
                id={addFormId}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateGoal(
                    new FormData(event.currentTarget),
                    event.currentTarget,
                  );
                }}
              />
              <input
                form={addFormId}
                name="name"
                placeholder="Goal name"
                className="w-full rounded-md border border-zinc-300 px-2 py-1"
              />
            </td>
            <td className="px-5 py-3">
              <GoalAmountFields
                key={addFormResetKey}
                form={addFormId}
                defaultType="numerical"
              />
            </td>
            <td className="px-5 py-3 text-right font-semibold text-zinc-500">
              0%
            </td>
            <td className="px-5 py-3">
              <input
                form={addFormId}
                name="deadline"
                type="date"
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
