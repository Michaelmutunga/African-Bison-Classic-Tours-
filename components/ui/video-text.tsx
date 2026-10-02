"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/cn";

export interface VideoTextProps {
  /** Self-hosted video URL (CSP media-src is 'self' only). */
  src: string;
  /** Poster still shown while the clip loads. */
  poster?: string;
  /** Plain-text word rendered with video inside the letterforms. */
  children: ReactNode;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: "auto" | "metadata" | "none";
  /** Number becomes vw units so the giant word scales with the viewport. */
  fontSize?: string | number;
  fontWeight?: string | number;
  textAnchor?: string;
  dominantBaseline?: string;
  fontFamily?: string;
  videoTestId?: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
}

function textOf(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  return "";
}

/**
 * Video-filled display type (MagicUI VideoText, adapted).
 *
 * The word is an SVG text mask over a covering <video>, so the safari
 * footage plays inside the letterforms. Decorative video stays
 * aria-hidden; the readable sentence lives in sr-only text at the call
 * site. Bison adaptations: `@/lib/cn`, self-hosted src only, poster,
 * forwarded video ref, no remote defaults.
 */
export function VideoText({
  src,
  poster,
  children,
  className = "",
  autoPlay = true,
  muted = true,
  loop = true,
  preload = "metadata",
  fontSize = 17,
  fontWeight = 560,
  textAnchor = "middle",
  dominantBaseline = "middle",
  fontFamily = '"Fraunces", Georgia, serif',
  videoTestId,
  videoRef,
}: VideoTextProps) {
  const content = textOf(children);
  const innerRef = useRef<HTMLVideoElement | null>(null);
  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      innerRef.current = node;
      if (typeof videoRef === "object" && videoRef !== null) {
        videoRef.current = node;
      }
    },
    [videoRef],
  );

  // React 19 drops the `muted` content attribute on <video>, so set it
  // imperatively. Autoplay policy and the e2e contract need it present.
  useEffect(() => {
    const video = innerRef.current;
    if (muted && video && !video.hasAttribute("muted")) {
      video.setAttribute("muted", "");
    }
  }, [muted]);
  // vw units scale with the viewport on their own, so the mask is pure
  // derived state: no effect, no resize listener, no cascading render.
  const svgMask = useMemo(() => {
    const responsiveFontSize =
      typeof fontSize === "number" ? `${fontSize}vw` : fontSize;
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return (
      `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>` +
      `<text x='50%' y='50%' font-size='${responsiveFontSize}' ` +
      `font-weight='${String(fontWeight)}' text-anchor='${textAnchor}' ` +
      `dominant-baseline='${dominantBaseline}' font-family='${fontFamily}'>${escaped}</text></svg>`
    );
  }, [content, fontSize, fontWeight, textAnchor, dominantBaseline, fontFamily]);

  const dataUrlMask = `url("data:image/svg+xml,${encodeURIComponent(svgMask)}")`;

  return (
    <div className={cn("relative size-full", className)}>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          maskImage: svgMask ? dataUrlMask : undefined,
          WebkitMaskImage: svgMask ? dataUrlMask : undefined,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      >
        <video
          ref={setVideoNode}
          data-testid={videoTestId}
          className="h-full w-full object-cover"
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      <span className="sr-only">{content}</span>
    </div>
  );
}
