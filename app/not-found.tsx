import Link from "next/link";

export default function NotFound() {
  return <main className="flex h-dvh items-center justify-center p-6 text-center"><div><h1 className="mb-2 text-2xl font-semibold">Board not found</h1><p className="muted mb-6 mt-0">It may have been deleted.</p><Link className="button no-underline" href="/">Open KANBN</Link></div></main>;
}
