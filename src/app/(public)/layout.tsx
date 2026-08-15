import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-amber-200 bg-white">
        <nav className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-geist-sans)] text-lg font-semibold text-amber-900"
          >
            House of Stories
          </Link>
          <div className="flex gap-4 font-[family-name:var(--font-geist-sans)] text-sm text-neutral-600">
            <Link href="/" className="hover:text-amber-900">
              Home
            </Link>
            <Link href="/search" className="hover:text-amber-900">
              Search
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-amber-200 bg-white p-6 text-center text-sm text-neutral-500">
        House of Stories
      </footer>
    </div>
  );
}
