const navigationItems = [
  { label: "Overview", href: "/" },
  { label: "Accounts", href: "/accounts" },
  { label: "Budgets", href: "/" },
  { label: "Habits", href: "/" },
  { label: "Goals", href: "/" },
  { label: "Settings", href: "/" },
];

export function Sidebar() {
  return (
    <aside className="border-b border-zinc-200 bg-white px-5 py-4 lg:border-b-0 lg:border-r lg:py-6">
      <div className="flex items-center justify-between lg:block">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Life Tracker
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            Life tracker
          </h1>
        </div>
        <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white lg:mt-8 lg:w-full">
          + Log
        </button>
      </div>

      <nav className="mt-6 flex gap-2 overflow-x-auto text-sm font-medium lg:flex-col lg:overflow-visible">
        {navigationItems.map((item, index) => (
          <a
            key={index}
            className={`whitespace-nowrap rounded-lg px-3 py-2 ${
              index === 0
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
            href={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section className="mt-8 hidden rounded-lg border border-zinc-200 bg-[#eef8f2] p-4 lg:block">
        <p className="text-sm font-semibold text-zinc-950">April snapshot</p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          You are $412 under budget with four habits on pace for a monthly best.
        </p>
      </section>
    </aside>
  );
}
