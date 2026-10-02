"use client";

interface GreetingHeaderProps {
  firstName: string;
  journeyCount: number;
  query: string;
  onQueryChange: (query: string) => void;
}

export function GreetingHeader({ firstName, journeyCount, query, onQueryChange }: GreetingHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="type-label text-clay-deep">Your African journey</p>
        <h1 className="type-h1 mt-1.5 text-balance">Hello, {firstName}</h1>
        <p className="type-small mt-1 text-ink/65">
          {journeyCount === 0
            ? "Welcome. Your future safaris will gather here."
            : `${journeyCount} ${journeyCount === 1 ? "journey" : "journeys"} with African Bison.`}
        </p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div role="search" className="relative w-full sm:w-64">
          <label htmlFor="portal-search" className="sr-only">
            Search your safaris
          </label>
          <input
            id="portal-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search safaris, references"
            autoComplete="off"
            className="type-small portal-card w-full py-2.5 pr-9 pl-4 placeholder:text-ink/40 focus:border-clay"
          />
          <span aria-hidden="true" className="absolute top-1/2 right-3 -translate-y-1/2 text-ink/40">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" />
            </svg>
          </span>
        </div>
        <a
          href="#updates"
          aria-label="Jump to latest updates"
          className="portal-card type-small relative grid h-11 w-11 shrink-0 place-items-center text-ink/70 hover:text-ink"
        >
          <span aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2.5a4.5 4.5 0 0 0-4.5 4.5c0 3-1.2 4-1.2 4h11.4s-1.2-1-1.2-4A4.5 4.5 0 0 0 9 2.5Z" />
              <path d="M7.3 13.5a1.8 1.8 0 0 0 3.4 0" />
            </svg>
          </span>
        </a>
      </div>
    </div>
  );
}
