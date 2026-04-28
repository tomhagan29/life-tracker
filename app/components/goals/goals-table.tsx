"use client";

import type { GoalActionState } from "@/app/actions/goals";
import {
  createGoal,
  createGoalMilestone,
  deleteGoal,
  deleteGoalMilestone,
  toggleGoalComplete,
  toggleGoalMilestoneComplete,
  updateGoal,
  updateGoalMilestone,
} from "@/app/actions/goals";
import { Fragment, useState } from "react";

type GoalType = "milestone" | "numerical";

export type GoalRow = {
  id: number;
  name: string;
  type: GoalType;
  typeLabel: string;
  targetAmount: string;
  currentAmount: string;
  progress: string;
  isComplete: boolean;
  deadline: string;
  deadlineValue: string;
  milestones: GoalMilestoneRow[];
};

export type GoalMilestoneRow = {
  id: number;
  name: string;
  description: string;
  isComplete: boolean;
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
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(
    null,
  );
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

  async function handleToggleGoalComplete(id: number, isComplete: boolean) {
    setPendingAction(`toggle-goal-${id}`);
    setActionState({ ok: true });

    const result = await toggleGoalComplete(id, isComplete);
    setActionState(result);
    setPendingAction(null);
  }

  async function handleCreateMilestone(
    goalId: number,
    formData: FormData,
    form: HTMLFormElement,
  ) {
    setPendingAction(`create-milestone-${goalId}`);
    setActionState({ ok: true });

    const result = await createGoalMilestone(goalId, formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      form.reset();
    }
  }

  async function handleUpdateMilestone(id: number, formData: FormData) {
    setPendingAction(`update-milestone-${id}`);
    setActionState({ ok: true });

    const result = await updateGoalMilestone(id, formData);
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      setEditingMilestoneId(null);
    }
  }

  async function handleDeleteMilestone(id: number) {
    setPendingAction(`delete-milestone-${id}`);
    setActionState({ ok: true });

    const result = await deleteGoalMilestone(id);
    setActionState(result);
    setPendingAction(null);
  }

  async function handleToggleMilestoneComplete(
    id: number,
    isComplete: boolean,
  ) {
    setPendingAction(`toggle-milestone-${id}`);
    setActionState({ ok: true });

    const result = await toggleGoalMilestoneComplete(id, isComplete);
    setActionState(result);
    setPendingAction(null);
  }

  function getMilestoneSummary(row: GoalRow) {
    const count = row.milestones.length;
    return `${count} ${count === 1 ? "milestone" : "milestones"}`;
  }

  function renderMilestonePanel(row: GoalRow) {
    const addMilestoneFormId = `add-goal-milestone-form-${row.id}`;

    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-950">Milestones</p>
            <p className="text-sm text-zinc-500">{getMilestoneSummary(row)}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_360px]">
          <div>
            {row.milestones.length === 0 ? (
              <p className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm font-medium text-zinc-500">
                No milestones yet
              </p>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {row.milestones.map((milestone) => {
                  const isEditing = editingMilestoneId === milestone.id;
                  const editMilestoneFormId = `edit-goal-milestone-form-${milestone.id}`;

                  return (
                    <div
                      key={milestone.id}
                      className="rounded-md border border-zinc-200 bg-white p-3"
                    >
                      {isEditing ? (
                        <div className="grid gap-2">
                          <form
                            id={editMilestoneFormId}
                            onSubmit={(event) => {
                              event.preventDefault();
                              handleUpdateMilestone(
                                milestone.id,
                                new FormData(event.currentTarget),
                              );
                            }}
                          />
                          <input
                            form={editMilestoneFormId}
                            name="name"
                            defaultValue={milestone.name}
                            className="rounded-md border border-zinc-300 px-2 py-1"
                          />
                          <textarea
                            form={editMilestoneFormId}
                            name="description"
                            defaultValue={milestone.description}
                            rows={3}
                            placeholder="Notes"
                            className="resize-y rounded-md border border-zinc-300 px-2 py-1"
                          />
                          <input
                            form={editMilestoneFormId}
                            name="deadline"
                            type="date"
                            defaultValue={milestone.deadlineValue}
                            className="rounded-md border border-zinc-300 px-2 py-1"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              form={editMilestoneFormId}
                              type="submit"
                              disabled={
                                pendingAction ===
                                `update-milestone-${milestone.id}`
                              }
                              className="rounded-md bg-blue-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-blue-500"
                            >
                              {pendingAction ===
                              `update-milestone-${milestone.id}`
                                ? "Saving"
                                : "Save"}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-semibold hover:bg-zinc-50"
                              onClick={() => setEditingMilestoneId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p
                              className={`font-semibold ${
                                milestone.isComplete
                                  ? "text-zinc-500 line-through"
                                  : "text-zinc-950"
                              }`}
                            >
                              {milestone.name}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              {milestone.isComplete
                                ? "Complete"
                                : milestone.deadline}
                            </p>
                            {milestone.description && (
                              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={
                                pendingAction ===
                                `toggle-milestone-${milestone.id}`
                              }
                              className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                                milestone.isComplete
                                  ? "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                              onClick={() =>
                                handleToggleMilestoneComplete(
                                  milestone.id,
                                  !milestone.isComplete,
                                )
                              }
                            >
                              {milestone.isComplete
                                ? "Reopen"
                                : "Complete"}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50"
                              onClick={() =>
                                setEditingMilestoneId(milestone.id)
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={
                                pendingAction ===
                                `delete-milestone-${milestone.id}`
                              }
                              className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              onClick={() =>
                                handleDeleteMilestone(milestone.id)
                              }
                            >
                              {pendingAction ===
                              `delete-milestone-${milestone.id}`
                                ? "Deleting"
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-3">
            <p className="text-sm font-semibold text-zinc-950">
              Add milestone
            </p>
            <div className="mt-3 grid gap-2">
              <form
                id={addMilestoneFormId}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateMilestone(
                    row.id,
                    new FormData(event.currentTarget),
                    event.currentTarget,
                  );
                }}
              />
              <input
                form={addMilestoneFormId}
                name="name"
                placeholder="Milestone"
                className="rounded-md border border-zinc-300 px-2 py-1"
              />
              <textarea
                form={addMilestoneFormId}
                name="description"
                rows={4}
                placeholder="Notes"
                className="resize-y rounded-md border border-zinc-300 px-2 py-1"
              />
              <input
                form={addMilestoneFormId}
                name="deadline"
                type="date"
                className="rounded-md border border-zinc-300 px-2 py-1"
              />
              <button
                form={addMilestoneFormId}
                type="submit"
                disabled={pendingAction === `create-milestone-${row.id}`}
                className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-zinc-300"
              >
                {pendingAction === `create-milestone-${row.id}`
                  ? "Adding"
                  : "Add milestone"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Type and target</th>
              <th className="px-5 py-3 text-right font-semibold">Progress</th>
              <th className="px-5 py-3 font-semibold">Deadline</th>
              <th className="px-5 py-3 text-right font-semibold" />
            </tr>
          </thead>

          <tbody>
            {goals.map((row) => {
              const isEditing = editingGoalId === row.id;
              const editFormId = `edit-goal-form-${row.id}`;

              return (
                <Fragment key={row.id}>
                  <tr className="border-t border-zinc-100">
                    <td className="px-5 py-4 font-semibold">
                      {isEditing ? (
                        <input
                          form={editFormId}
                          name="name"
                          defaultValue={row.name}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 font-normal"
                        />
                      ) : (
                        <span
                          className={
                            row.isComplete ? "text-zinc-500 line-through" : ""
                          }
                        >
                          {row.name}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-zinc-500">
                      {isEditing ? (
                        <GoalAmountFields
                          form={editFormId}
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
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold">
                      {row.isComplete
                        ? "Complete"
                        : row.type === "milestone"
                          ? getMilestoneSummary(row)
                          : row.progress}
                    </td>

                    <td className="px-5 py-4 text-zinc-500">
                      {isEditing ? (
                        <input
                          form={editFormId}
                          name="deadline"
                          type="date"
                          defaultValue={row.deadlineValue}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-zinc-950"
                        />
                      ) : (
                        row.deadline
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <Fragment key="editing-goal-actions">
                            <form
                              id={editFormId}
                              onSubmit={(event) => {
                                event.preventDefault();
                                handleUpdateGoal(
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
                              {pendingAction === `update-${row.id}`
                                ? "Saving"
                                : "Save"}
                            </button>
                            <button
                              type="button"
                              disabled={pendingAction === `update-${row.id}`}
                              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                              onClick={() => setEditingGoalId(null)}
                            >
                              Cancel
                            </button>
                          </Fragment>
                        ) : (
                          <Fragment key="view-goal-actions">
                            <button
                              type="button"
                              disabled={pendingAction === `toggle-goal-${row.id}`}
                              className={`rounded-md border px-2.5 py-1.5 text-sm font-semibold ${
                                row.isComplete
                                  ? "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                              onClick={() =>
                                handleToggleGoalComplete(
                                  row.id,
                                  !row.isComplete,
                                )
                              }
                            >
                              {row.isComplete ? "Reopen" : "Complete"}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                              onClick={(event) => {
                                event.preventDefault();
                                setEditingGoalId(row.id);
                              }}
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
                          </Fragment>
                        )}
                      </div>
                    </td>
                  </tr>

                  {row.type === "milestone" && (
                    <tr className="border-t border-zinc-100">
                      <td colSpan={5} className="px-5 pb-5 pt-0">
                        {renderMilestonePanel(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>

          <tfoot>
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
          </tfoot>
        </table>
      </div>
    </div>
  );
}
