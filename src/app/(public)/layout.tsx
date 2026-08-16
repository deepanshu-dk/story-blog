import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b-2 border-amber-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap">
          <Link
            href="/"
            className="whitespace-nowrap font-[family-name:var(--font-geist-sans)] text-2xl font-bold text-amber-900"
          >
            House of Stories
          </Link>

          <form action="/search" method="get" className="order-3 w-full sm:order-none sm:flex-1">
            <label htmlFor="site-search" className="sr-only">
              कथा खोजें
            </label>
            <div className="flex">
              <input
                id="site-search"
                type="text"
                name="q"
                placeholder="व्रत या त्योहार का नाम खोजें..."
                className="w-full rounded-l-lg border-2 border-r-0 border-amber-300 px-4 py-3 text-lg focus:border-amber-600 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="खोजें"
                className="rounded-r-lg border-2 border-amber-800 bg-amber-800 px-5 py-3 text-lg font-medium text-white hover:bg-amber-900"
              >
                खोजें
              </button>
            </div>
          </form>

          <nav className="flex gap-6 font-[family-name:var(--font-geist-sans)] text-lg font-medium text-neutral-700">
            <Link href="/" className="hover:text-amber-900">
              Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-amber-200 bg-white p-6 text-center text-base text-neutral-600">
        House of Stories
      </footer>
    </div>
  );
}
