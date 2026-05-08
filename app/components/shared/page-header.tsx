"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getDateLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
const getServerDateLabel = () => "";

export function PageHeader(props: { title: string }) {
  const dateLabel = useSyncExternalStore(
    subscribe,
    getDateLabel,
    getServerDateLabel,
  );

  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="min-h-5 text-sm font-medium text-zinc-500">{dateLabel}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">
          {props.title}
        </h2>
      </div>
    </header>
  );
}
