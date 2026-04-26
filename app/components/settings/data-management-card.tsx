"use client";

import {
  exportUserData,
  importUserData,
  resetUserData,
  type UserDataActionState,
} from "@/app/actions/user-data";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function DataManagementCard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionState, setActionState] = useState<UserDataActionState>({
    ok: true,
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function handleExport() {
    setPendingAction("export");
    setActionState({ ok: true });

    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `life-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setActionState({ ok: true, message: "Export created." });
    } catch {
      setActionState({ ok: false, message: "Could not export data." });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleImport(file: File) {
    const confirmed = window.confirm(
      "Importing will delete all existing data and replace it with the selected file. Continue?",
    );

    if (!confirmed) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setPendingAction("import");
    setActionState({ ok: true });

    try {
      const formData = new FormData();
      formData.set("data", await file.text());
      const result = await importUserData(formData);
      setActionState(result);

      if (result.ok) {
        router.refresh();
      }
    } catch {
      setActionState({ ok: false, message: "Could not import data." });
    } finally {
      setPendingAction(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "This will permanently delete all accounts, categories, budget items, habits, goals, transactions, and check-ins. Continue?",
    );

    if (!confirmed) {
      return;
    }

    setPendingAction("reset");
    setActionState({ ok: true });

    const result = await resetUserData();
    setActionState(result);
    setPendingAction(null);

    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 p-5">
        <h3 className="text-xl font-semibold">Data management</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Export, replace, or clear the local Life Tracker database
        </p>
      </div>

      {actionState.message && (
        <div
          className={`border-b px-5 py-3 text-sm font-medium ${
            actionState.ok
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {actionState.message}
        </div>
      )}

      <div className="grid gap-4 p-5 lg:grid-cols-3">
        <button
          type="button"
          disabled={pendingAction !== null}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-zinc-300"
          onClick={handleExport}
        >
          {pendingAction === "export" ? "Exporting" : "Export all data"}
        </button>

        <label className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-semibold hover:bg-zinc-50 has-disabled:pointer-events-none has-disabled:bg-zinc-100 has-disabled:text-zinc-400">
          {pendingAction === "import" ? "Importing" : "Import data"}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            disabled={pendingAction !== null}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                handleImport(file);
              }
            }}
          />
        </label>

        <button
          type="button"
          disabled={pendingAction !== null}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:bg-zinc-100 disabled:text-zinc-400"
          onClick={handleReset}
        >
          {pendingAction === "reset" ? "Resetting" : "Reset database"}
        </button>
      </div>
    </div>
  );
}
