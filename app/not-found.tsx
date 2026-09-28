import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="type-label text-clay-deep">African Bison Classic Tours</p>
      <h1 className="type-h1 mt-2">This trail has gone quiet</h1>
      <p className="type-small mt-3 text-ink/70">
        The page you asked for doesn&apos;t exist. Booking references stay private — unknown
        references land here rather than confirming anything.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="type-small border border-ink/20 px-5 py-2.5 hover:border-ink">
          Home
        </Link>
        <Link href="/tours" className="type-small border border-ink/20 px-5 py-2.5 hover:border-ink">
          Explore safaris
        </Link>
      </div>
    </main>
  );
}
