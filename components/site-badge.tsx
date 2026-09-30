import Image from "next/image";

/**
 * Brand badge: the client buffalo logo with the wordmark. The logo art
 * stays upright and static (rotating readable ring text would hurt
 * legibility); it doubles as the favicon source (app/icon.png) and the
 * preloader mark.
 */
export function SiteBadge({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 leading-none">
      <Image
        src="/images/brand/logo.png"
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        style={{ width: size, height: size }}
        className="shrink-0"
        priority={false}
      />
      <span className="leading-none">
        <span className="type-label block">African Bison</span>
        <span className="font-display block text-xl font-semibold tracking-tight">
          Classic Tours
        </span>
      </span>
    </span>
  );
}
