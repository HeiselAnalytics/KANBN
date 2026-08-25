export default function Loading() {
  return (
    <div className="flex h-dvh">
      <div className="hidden w-[284px] animate-pulse border-r border-[var(--border)] bg-[var(--sidebar)] p-4 lg:block" />
      <div className="flex-1 p-4">
        <div className="h-10 w-64 animate-pulse rounded-[7px] bg-[var(--secondary)]" />
        <div className="mt-4 flex gap-4 overflow-hidden">
          {[0, 1, 2].map((item) => <div key={item} className="h-80 w-[304px] shrink-0 animate-pulse rounded-[7px] bg-[var(--secondary)]" />)}
        </div>
      </div>
    </div>
  );
}
