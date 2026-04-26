"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogModal } from "./log-modal";

type SidebarClientProps = {
  snapshot: {
    title: string;
    text: string;
  };
};

const navigationItems = [
  { label: "Overview", href: "/" },
  { label: "Accounts", href: "/accounts" },
  { label: "Budget", href: "/budget" },
  { label: "Habits", href: "/habits" },
  { label: "Goals", href: "/goals" },
  { label: "Settings", href: "/settings" },
];

export function SidebarClient({ snapshot }: SidebarClientProps) {
  const pathname = usePathname();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  return (
    <>
      <aside className="border-b border-zinc-200 bg-white px-5 py-4 lg:border-b-0 lg:border-r lg:py-6 2xl:px-7 min-[2200px]:px-8">
        <div className="flex items-center justify-between lg:block">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Life Tracker
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">
              Life tracker
            </h1>
          </div>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 lg:mt-8 lg:w-full"
            onClick={() => setIsLogModalOpen(true)}
          >
            + Log
          </button>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto text-sm font-medium lg:flex-col lg:overflow-visible">
          {navigationItems.map((item) => {
            const isActive =
              item.label === "Overview"
                ? pathname === "/"
                : item.href !== "/" && pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                className={`whitespace-nowrap rounded-lg px-3 py-2 ${
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <section className="mt-8 hidden rounded-lg border border-zinc-200 bg-[#eef8f2] p-4 lg:block">
          <p className="text-sm font-semibold text-zinc-950">
            {snapshot.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {snapshot.text}
          </p>
        </section>
      </aside>

      <LogModal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </>
  );
}
