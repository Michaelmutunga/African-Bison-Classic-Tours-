/**
 * Schematic route rail (Phase 4). Deliberately NOT geographic: it shows stop
 * order and nights. Real maps with distances land behind a mapping-service
 * boundary — we never fake travel times.
 */
export function RouteMap({
  route,
}: {
  route: { slug: string; name: string; nights: number }[];
}) {
  if (route.length === 0) return null;
  const rowHeight = 76;
  const height = route.length * rowHeight + 24;

  return (
    <figure aria-label="Route schematic, not to scale">
      <svg
        viewBox={`0 0 340 ${height}`}
        className="h-auto w-full max-w-md"
        role="img"
        aria-label={`Route: ${route.map((stop) => `${stop.name} (${stop.nights} nights)`).join(", then ")}`}
      >
        {route.map((stop, index) => {
          const y = 24 + index * rowHeight;
          const isLast = index === route.length - 1;
          return (
            <g key={stop.slug}>
              {!isLast ? (
                <line
                  x1="24"
                  y1={y + 14}
                  x2="24"
                  y2={y + rowHeight + 14}
                  stroke="#14120f"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ) : null}
              <circle cx="24" cy={y + 8} r="11" fill="#14120f" />
              <text
                x="24"
                y={y + 12.5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#faf7f1"
              >
                {index + 1}
              </text>
              <text x="48" y={y + 6} fontSize="13" fontWeight="650" fill="#14120f">
                {stop.name.length > 30 ? `${stop.name.slice(0, 30)}…` : stop.name}
              </text>
              <text x="48" y={y + 22} fontSize="11" fill="#14120f" opacity="0.65">
                {stop.nights} night{stop.nights === 1 ? "" : "s"}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="type-caption mt-1 text-ink/60">
        Schematic route order — not to scale, no travel times implied.
      </figcaption>
    </figure>
  );
}
