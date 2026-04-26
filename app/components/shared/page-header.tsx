export function PageHeader(props: { title: string }) {
  const d = new Date();
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-500">{d.toDateString()}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">
          {props.title}
        </h2>
      </div>
    </header>
  );
}
