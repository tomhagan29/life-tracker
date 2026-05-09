"use client";

import {
  exportUserData,
  importUserData,
  resetUserData,
  type UserDataActionState,
} from "@/app/actions/user-data";
import {
  importDataSchema,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from "@/lib/user-data-import-schema";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const jsonMimeTypes = new Set(["application/json", "text/json"]);

type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

type TauriWindow = Window & {
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoke;
    };
  };
  __TAURI_INTERNALS__?: {
    invoke?: TauriInvoke;
  };
};

function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") {
    return null;
  }

  const tauriWindow = window as TauriWindow;
  return (
    tauriWindow.__TAURI__?.core?.invoke ??
    tauriWindow.__TAURI_INTERNALS__?.invoke ??
    null
  );
}

function downloadExport(filename: string, contents: string) {
  const blob = new Blob([contents], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DataManagementCard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionState, setActionState] = useState<UserDataActionState>({
    ok: true,
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleExport() {
    setPendingAction("export");
    setActionState({ ok: true });

    try {
      const data = await exportUserData();
      const contents = JSON.stringify(data, null, 2);
      const filename = `life-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      const tauriInvoke = getTauriInvoke();

      if (tauriInvoke) {
        const savedPath = await tauriInvoke<string>("save_user_export", {
          filename,
          contents,
        });
        setActionState({ ok: true, message: `Export saved to ${savedPath}.` });
        return;
      }

      downloadExport(filename, contents);
      setActionState({ ok: true, message: "Export created." });
    } catch {
      setActionState({ ok: false, message: "Could not export data." });
    } finally {
      setPendingAction(null);
      clearFileInput();
    }
  }

  async function handleImport(file: File) {
    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      setActionState({
        ok: false,
        message: "Choose a JSON export file that is 10 MB or smaller.",
      });

      clearFileInput();

      return;
    }

    const hasJsonType = jsonMimeTypes.has(file.type);
    const hasJsonExtension = file.name.toLowerCase().endsWith(".json");

    if (!hasJsonType && !(file.type === "" && hasJsonExtension)) {
      setActionState({
        ok: false,
        message: "Choose a JSON export file.",
      });

      clearFileInput();

      return;
    }

    let rawImport: string;
    let parsedJson: unknown;

    try {
      rawImport = await file.text();
      parsedJson = JSON.parse(rawImport);
    } catch {
      setActionState({
        ok: false,
        message: "The selected file is not valid JSON.",
      });

      clearFileInput();

      return;
    }

    const parsed = importDataSchema.safeParse(parsedJson);

    if (!parsed.success) {
      setActionState({
        ok: false,
        message:
          parsed.error.issues[0]?.message ?? "The import file is invalid.",
      });

      clearFileInput();

      return;
    }

    const confirmed = window.confirm(
      "Importing will delete all existing data and replace it with the selected file. Continue?",
    );

    if (!confirmed) {
      clearFileInput();
      return;
    }

    setPendingAction("import");
    setActionState({ ok: true });

    try {
      const formData = new FormData();
      formData.set("data", rawImport);
      const result = await importUserData(formData);
      setActionState(result);

      if (result.ok) {
        router.refresh();
      }
    } catch {
      setActionState({ ok: false, message: "Could not import data." });
    } finally {
      setPendingAction(null);
      clearFileInput();
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

      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={pendingAction !== null}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50"
          onClick={handleExport}
        >
          {pendingAction === "export" ? "Exporting" : "Export all data"}
        </button>

        <label className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-semibold hover:bg-zinc-50 has-disabled:pointer-events-none has-disabled:opacity-50">
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

        <div className="hidden sm:block sm:flex-1" aria-hidden="true" />

        <button
          type="button"
          disabled={pendingAction !== null}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          onClick={handleReset}
        >
          {pendingAction === "reset" ? "Resetting" : "Reset database"}
        </button>
      </div>
    </div>
  );
}
