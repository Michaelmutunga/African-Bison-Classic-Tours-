"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useGesture } from "@use-gesture/react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";
import styles from "@/components/tours/dome-gallery.module.css";
import {
  buildDomeTiles,
  clampDome,
  domeTileBaseRotation,
  isDomeTileFocusable,
  normalizeDomeAngle,
  wrapDomeAngleSigned,
  type DomePoolEntry,
  type DomeTile,
} from "@/components/tours/dome-math";

export type { DomePoolEntry };

export interface DomeGalleryProps {
  /** Safari tiles. No remote defaults: pass local imagery only. */
  images: DomePoolEntry[];
  fit?: number;
  fitBasis?: "auto" | "min" | "max" | "width" | "height";
  minRadius?: number;
  maxRadius?: number;
  padFactor?: number;
  overlayBlurColor?: string;
  maxVerticalRotationDeg?: number;
  dragSensitivity?: number;
  enlargeTransitionMs?: number;
  segments?: number;
  dragDampening?: number;
  openedImageWidth?: string;
  openedImageHeight?: string;
  imageBorderRadius?: string;
  openedImageBorderRadius?: string;
  grayscale?: boolean;
}

function getDataNumber(
  el: HTMLElement,
  name: string,
  fallback: number,
): number {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const parsed = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * DomeGallery for /tours (TypeScript port of the React Bits component).
 *
 * Safari tiles laid out on a draggable sphere. Selecting a tile enlarges
 * it into a preview carrying the real tour title, length and a link to
 * its itinerary. Only front-centre tiles are keyboard reachable; every
 * journey is also listed in the semantic index below the dome.
 */
export function DomeGallery({
  images,
  fit = 0.5,
  fitBasis = "auto",
  minRadius = 320,
  maxRadius = 1100,
  padFactor = 0.25,
  overlayBlurColor = "#0e0d0b",
  maxVerticalRotationDeg = 5,
  dragSensitivity = 20,
  enlargeTransitionMs = 300,
  segments = 21,
  dragDampening = 2,
  openedImageWidth = "400px",
  openedImageHeight = "400px",
  imageBorderRadius = "2px",
  openedImageBorderRadius = "2px",
  grayscale = false,
}: DomeGalleryProps) {
  const reduced = usePrefersReducedMotion();
  const transitionMs = reduced ? 0 : enlargeTransitionMs;

  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const focusedElRef = useRef<HTMLDivElement | null>(null);
  const originalTilePositionRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const inertiaRAF = useRef<number | null>(null);
  const openingRef = useRef(false);
  const openStartedAtRef = useRef(0);
  const lastDragEndAt = useRef(0);
  const scrollLockedRef = useRef(false);

  const lockScroll = useCallback(() => {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    document.body.classList.add("dg-scroll-lock");
  }, []);

  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return;
    if (rootRef.current?.getAttribute("data-enlarging") === "true") return;
    scrollLockedRef.current = false;
    document.body.classList.remove("dg-scroll-lock");
  }, []);

  const items: DomeTile[] = useMemo(
    () => buildDomeTiles(images, segments),
    [images, segments],
  );

  const applyTransform = useCallback((xDeg: number, yDeg: number) => {
    const el = sphereRef.current;
    if (el) {
      el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  }, []);

  const lockedRadiusRef = useRef<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const minDim = Math.min(w, h);
      const maxDim = Math.max(w, h);
      const aspect = w / h;
      let basis: number;
      switch (fitBasis) {
        case "min":
          basis = minDim;
          break;
        case "max":
          basis = maxDim;
          break;
        case "width":
          basis = w;
          break;
        case "height":
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }
      let radius = basis * fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = clampDome(radius, minRadius, maxRadius);
      lockedRadiusRef.current = Math.round(radius);

      const viewerPad = Math.max(8, Math.round(minDim * padFactor));
      root.style.setProperty("--radius", `${lockedRadiusRef.current}px`);
      root.style.setProperty("--viewer-pad", `${viewerPad}px`);
      root.style.setProperty("--overlay-blur-color", overlayBlurColor);
      root.style.setProperty("--tile-radius", imageBorderRadius);
      root.style.setProperty("--enlarge-radius", openedImageBorderRadius);
      root.style.setProperty("--image-filter", grayscale ? "grayscale(1)" : "none");
      applyTransform(rotationRef.current.x, rotationRef.current.y);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [
    fit,
    fitBasis,
    minRadius,
    maxRadius,
    padFactor,
    overlayBlurColor,
    grayscale,
    imageBorderRadius,
    openedImageBorderRadius,
    applyTransform,
  ]);

  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y);
  }, [applyTransform]);

  const stopInertia = useCallback(() => {
    if (inertiaRAF.current !== null) {
      cancelAnimationFrame(inertiaRAF.current);
      inertiaRAF.current = null;
    }
  }, []);

  const startInertia = useCallback(
    (vx: number, vy: number) => {
      if (reduced) return;
      const MAX_V = 1.4;
      let vX = clampDome(vx, -MAX_V, MAX_V) * 80;
      let vY = clampDome(vy, -MAX_V, MAX_V) * 80;
      let frames = 0;
      const d = clampDome(dragDampening ?? 0.6, 0, 1);
      const frictionMul = 0.94 + 0.055 * d;
      const stopThreshold = 0.015 - 0.01 * d;
      const maxFrames = Math.round(90 + 270 * d);
      const step = () => {
        vX *= frictionMul;
        vY *= frictionMul;
        if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
          inertiaRAF.current = null;
          return;
        }
        if (++frames > maxFrames) {
          inertiaRAF.current = null;
          return;
        }
        const nextX = clampDome(
          rotationRef.current.x - vY / 200,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg,
        );
        const nextY = wrapDomeAngleSigned(rotationRef.current.y + vX / 200);
        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);
        inertiaRAF.current = requestAnimationFrame(step);
      };
      stopInertia();
      inertiaRAF.current = requestAnimationFrame(step);
    },
    [dragDampening, maxVerticalRotationDeg, stopInertia, applyTransform, reduced],
  );

  useGesture(
    {
      onDragStart: (state) => {
        if (focusedElRef.current) return;
        stopInertia();
        const pointer = state.event as unknown as {
          clientX: number;
          clientY: number;
        };
        draggingRef.current = true;
        movedRef.current = false;
        startRotRef.current = { ...rotationRef.current };
        startPosRef.current = { x: pointer.clientX, y: pointer.clientY };
      },
      onDrag: (state) => {
        if (focusedElRef.current || !draggingRef.current || !startPosRef.current)
          return;
        const pointer = state.event as unknown as {
          clientX: number;
          clientY: number;
        };
        const { last, velocity = [0, 0], direction = [0, 0], movement } = state;
        const dxTotal = pointer.clientX - startPosRef.current.x;
        const dyTotal = pointer.clientY - startPosRef.current.y;
        if (!movedRef.current) {
          const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
          if (dist2 > 16) movedRef.current = true;
        }
        const nextX = clampDome(
          startRotRef.current.x - dyTotal / dragSensitivity,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg,
        );
        const nextY = wrapDomeAngleSigned(
          startRotRef.current.y + dxTotal / dragSensitivity,
        );
        if (rotationRef.current.x !== nextX || rotationRef.current.y !== nextY) {
          rotationRef.current = { x: nextX, y: nextY };
          applyTransform(nextX, nextY);
        }
        if (last) {
          draggingRef.current = false;
          const [vMagX, vMagY] = velocity;
          const [dirX, dirY] = direction;
          let vx = (vMagX ?? 0) * (dirX ?? 0);
          let vy = (vMagY ?? 0) * (dirY ?? 0);
          if (
            Math.abs(vx) < 0.001 &&
            Math.abs(vy) < 0.001 &&
            Array.isArray(movement)
          ) {
            const [mx, my] = movement;
            vx = clampDome(((mx ?? 0) / dragSensitivity) * 0.02, -1.2, 1.2);
            vy = clampDome(((my ?? 0) / dragSensitivity) * 0.02, -1.2, 1.2);
          }
          if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005)
            startInertia(vx, vy);
          if (movedRef.current) lastDragEndAt.current = performance.now();
          movedRef.current = false;
        }
      },
    },
    { target: mainRef, eventOptions: { passive: true } },
  );

  const closeEnlarged = useCallback(() => {
    if (performance.now() - openStartedAtRef.current < 250) return;
    const el = focusedElRef.current;
    if (!el) return;
    const parent = el.parentElement;
    const overlay = viewerRef.current?.querySelector(
      `.${styles["enlarge"]}`,
    ) as HTMLElement | null;
    if (!parent || !overlay) return;
    const refDiv = parent.querySelector('[data-dome-reference="true"]');
    const originalPos = originalTilePositionRef.current;
    const finish = () => {
      if (refDiv) refDiv.remove();
      parent.style.setProperty("--rot-y-delta", "0deg");
      parent.style.setProperty("--rot-x-delta", "0deg");
      el.style.visibility = "";
      el.style.zIndex = "0";
      focusedElRef.current = null;
      rootRef.current?.removeAttribute("data-enlarging");
      openingRef.current = false;
      unlockScroll();
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* focus return is best-effort */
      }
    };
    if (!originalPos) {
      overlay.remove();
      finish();
      return;
    }
    const currentRect = overlay.getBoundingClientRect();
    const rootRect = rootRef.current?.getBoundingClientRect();
    if (!rootRect) {
      overlay.remove();
      finish();
      return;
    }
    const animatingOverlay = document.createElement("div");
    animatingOverlay.className = styles["enlarge-closing"] ?? "";
    animatingOverlay.style.cssText = `position:absolute;left:${currentRect.left - rootRect.left}px;top:${currentRect.top - rootRect.top}px;width:${currentRect.width}px;height:${currentRect.height}px;z-index:9999;border-radius:var(--enlarge-radius,2px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${transitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;`;
    const originalImg = overlay.querySelector("img");
    if (originalImg) {
      const img = originalImg.cloneNode() as HTMLImageElement;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      animatingOverlay.appendChild(img);
    }
    overlay.remove();
    rootRef.current?.appendChild(animatingOverlay);
    void animatingOverlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      animatingOverlay.style.left = `${originalPos.left - rootRect.left}px`;
      animatingOverlay.style.top = `${originalPos.top - rootRect.top}px`;
      animatingOverlay.style.width = `${originalPos.width}px`;
      animatingOverlay.style.height = `${originalPos.height}px`;
      animatingOverlay.style.opacity = "0";
    });
    const cleanup = () => {
      animatingOverlay.remove();
      originalTilePositionRef.current = null;
      finish();
    };
    if (transitionMs === 0) {
      cleanup();
      return;
    }
    animatingOverlay.addEventListener("transitionend", cleanup, { once: true });
  }, [transitionMs, unlockScroll]);

  useEffect(() => {
    const scrim = scrimRef.current;
    if (!scrim) return;
    const onScrimClick = () => closeEnlarged();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEnlarged();
    };
    scrim.addEventListener("click", onScrimClick);
    window.addEventListener("keydown", onKey);
    return () => {
      scrim.removeEventListener("click", onScrimClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [closeEnlarged]);

  const openItemFromElement = useCallback(
    (el: HTMLDivElement) => {
      if (openingRef.current) return;
      openingRef.current = true;
      openStartedAtRef.current = performance.now();
      lockScroll();
      const parent = el.parentElement;
      if (!parent) {
        openingRef.current = false;
        unlockScroll();
        return;
      }
      focusedElRef.current = el;
      const offsetX = getDataNumber(parent, "offsetX", 0);
      const offsetY = getDataNumber(parent, "offsetY", 0);
      const sizeX = getDataNumber(parent, "sizeX", 2);
      const sizeY = getDataNumber(parent, "sizeY", 2);
      const slug = parent.dataset["slug"] ?? "";
      const title = parent.dataset["title"] ?? "";
      const days = getDataNumber(parent, "days", 0);
      const category = parent.dataset["category"] ?? "";
      const parentRot = domeTileBaseRotation(offsetX, offsetY, sizeX, sizeY, segments);
      const parentY = normalizeDomeAngle(parentRot.rotateY);
      const globalY = normalizeDomeAngle(rotationRef.current.y);
      let rotY = -(parentY + globalY) % 360;
      if (rotY < -180) rotY += 360;
      const rotX = -parentRot.rotateX - rotationRef.current.x;
      parent.style.setProperty("--rot-y-delta", `${rotY}deg`);
      parent.style.setProperty("--rot-x-delta", `${rotX}deg`);
      const refDiv = document.createElement("div");
      refDiv.className = styles["item__image"] ?? "";
      refDiv.dataset["domeReference"] = "true";
      refDiv.style.opacity = "0";
      refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
      parent.appendChild(refDiv);

      void refDiv.offsetHeight;

      const tileRect = refDiv.getBoundingClientRect();
      const mainRect = mainRef.current?.getBoundingClientRect();
      const frameRect = frameRef.current?.getBoundingClientRect();

      if (!mainRect || !frameRect || tileRect.width <= 0 || tileRect.height <= 0) {
        openingRef.current = false;
        focusedElRef.current = null;
        refDiv.remove();
        unlockScroll();
        return;
      }

      originalTilePositionRef.current = {
        left: tileRect.left,
        top: tileRect.top,
        width: tileRect.width,
        height: tileRect.height,
      };
      el.style.visibility = "hidden";
      el.style.zIndex = "0";

      const overlay = document.createElement("div");
      overlay.className = styles["enlarge"] ?? "";
      overlay.style.position = "absolute";
      overlay.style.left = `${frameRect.left - mainRect.left}px`;
      overlay.style.top = `${frameRect.top - mainRect.top}px`;
      overlay.style.width = `${frameRect.width}px`;
      overlay.style.height = `${frameRect.height}px`;
      overlay.style.opacity = "0";
      overlay.style.zIndex = "30";
      overlay.style.willChange = "transform, opacity";
      overlay.style.transformOrigin = "top left";
      overlay.style.transition = `transform ${transitionMs}ms ease, opacity ${transitionMs}ms ease`;

      const rawSrc = parent.dataset["src"] ?? el.querySelector("img")?.src ?? "";
      const img = document.createElement("img");
      img.src = rawSrc;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      overlay.appendChild(img);

      const caption = document.createElement("div");
      caption.className = styles["enlarge__caption"] ?? "";
      const eyebrow = document.createElement("p");
      eyebrow.className = styles["enlarge__eyebrow"] ?? "";
      eyebrow.textContent =
        days > 0 ? `${category} · ${days} day${days === 1 ? "" : "s"}` : category;
      const heading = document.createElement("p");
      heading.className = styles["enlarge__title"] ?? "";
      heading.textContent = title;
      const link = document.createElement("a");
      link.className = styles["enlarge__link"] ?? "";
      link.href = `/tours/${slug}`;
      link.textContent = "View itinerary →";
      caption.append(eyebrow, heading, link);
      overlay.appendChild(caption);

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = styles["enlarge__close"] ?? "";
      closeButton.textContent = "✕";
      closeButton.setAttribute("aria-label", "Close preview");
      closeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeEnlarged();
      });
      overlay.appendChild(closeButton);

      viewerRef.current?.appendChild(overlay);
      const tx0 = tileRect.left - frameRect.left;
      const ty0 = tileRect.top - frameRect.top;
      const sx0 = tileRect.width / frameRect.width;
      const sy0 = tileRect.height / frameRect.height;
      const validSx0 = Number.isFinite(sx0) && sx0 > 0 ? sx0 : 1;
      const validSy0 = Number.isFinite(sy0) && sy0 > 0 ? sy0 : 1;
      overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

      window.setTimeout(() => {
        if (!overlay.parentElement) return;
        overlay.style.opacity = "1";
        overlay.style.transform = "translate(0px, 0px) scale(1, 1)";
        rootRef.current?.setAttribute("data-enlarging", "true");
        link.focus({ preventScroll: true });

        // Second phase: settle the preview to its configured size,
        // centred in the frame.
        const onFirstEnd = (event: TransitionEvent) => {
          if (event.propertyName !== "transform") return;
          overlay.removeEventListener("transitionend", onFirstEnd);
          const prevTransition = overlay.style.transition;
          overlay.style.transition = "none";
          const tempWidth = openedImageWidth || `${frameRect.width}px`;
          const tempHeight = openedImageHeight || `${frameRect.height}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
          const newRect = overlay.getBoundingClientRect();
          overlay.style.width = `${frameRect.width}px`;
          overlay.style.height = `${frameRect.height}px`;
          void overlay.offsetWidth;
          overlay.style.transition = `left ${transitionMs}ms ease, top ${transitionMs}ms ease, width ${transitionMs}ms ease, height ${transitionMs}ms ease`;
          const centeredLeft =
            frameRect.left - mainRect.left + (frameRect.width - newRect.width) / 2;
          const centeredTop =
            frameRect.top - mainRect.top + (frameRect.height - newRect.height) / 2;
          requestAnimationFrame(() => {
            overlay.style.left = `${centeredLeft}px`;
            overlay.style.top = `${centeredTop}px`;
            overlay.style.width = tempWidth;
            overlay.style.height = tempHeight;
          });
          const cleanupSecond = () => {
            overlay.removeEventListener("transitionend", cleanupSecond);
            overlay.style.transition = prevTransition;
          };
          if (transitionMs === 0) {
            cleanupSecond();
            return;
          }
          overlay.addEventListener("transitionend", cleanupSecond, {
            once: true,
          });
        };
        if (transitionMs === 0) {
          // Reduced motion: skip the flight, land the preview directly.
          overlay.style.opacity = "1";
          overlay.style.transform = "translate(0px, 0px) scale(1, 1)";
          overlay.style.width = openedImageWidth || `${frameRect.width}px`;
          overlay.style.height = openedImageHeight || `${frameRect.height}px`;
          rootRef.current?.setAttribute("data-enlarging", "true");
          return;
        }
        overlay.addEventListener("transitionend", onFirstEnd);
      }, 16);
    },
    [
      transitionMs,
      lockScroll,
      unlockScroll,
      segments,
      closeEnlarged,
      openedImageHeight,
      openedImageWidth,
    ],
  );

  const onTileClick = useCallback(
    (event: { currentTarget: HTMLDivElement }) => {
      if (draggingRef.current) return;
      if (movedRef.current) return;
      if (performance.now() - lastDragEndAt.current < 80) return;
      if (openingRef.current) return;
      openItemFromElement(event.currentTarget);
    },
    [openItemFromElement],
  );

  const onTilePointerUp = useCallback(
    (event: { currentTarget: HTMLDivElement; pointerType: string }) => {
      if (event.pointerType !== "touch") return;
      if (draggingRef.current) return;
      if (movedRef.current) return;
      if (performance.now() - lastDragEndAt.current < 80) return;
      if (openingRef.current) return;
      openItemFromElement(event.currentTarget);
    },
    [openItemFromElement],
  );

  const onTileKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (openingRef.current) return;
      openItemFromElement(event.currentTarget as HTMLDivElement);
    },
    [openItemFromElement],
  );

  useEffect(() => {
    return () => {
      document.body.classList.remove("dg-scroll-lock");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles["sphere-root"] ?? ""}
      style={
        {
          "--segments-x": segments,
          "--segments-y": segments,
          "--overlay-blur-color": overlayBlurColor,
          "--tile-radius": imageBorderRadius,
          "--enlarge-radius": openedImageBorderRadius,
          "--image-filter": grayscale ? "grayscale(1)" : "none",
        } as CSSProperties
      }
    >
      <div ref={mainRef} className={styles["sphere-main"] ?? ""}>
        <div className={styles["stage"] ?? ""}>
          <div ref={sphereRef} className={styles["sphere"] ?? ""}>
            {items.map((tile, i) => {
              const focusable = isDomeTileFocusable(tile.x);
              return (
                <div
                  key={`${tile.x},${tile.y},${i}`}
                  className={styles["item"] ?? ""}
                  data-src={tile.src}
                  data-offset-x={tile.x}
                  data-offset-y={tile.y}
                  data-size-x={tile.sizeX}
                  data-size-y={tile.sizeY}
                  data-slug={tile.slug}
                  data-title={tile.title}
                  data-days={tile.days}
                  data-category={tile.categoryLabel}
                  style={
                    {
                      "--offset-x": tile.x,
                      "--offset-y": tile.y,
                      "--item-size-x": tile.sizeX,
                      "--item-size-y": tile.sizeY,
                    } as CSSProperties
                  }
                >
                  <div
                    className={styles["item__image"] ?? ""}
                    role="button"
                    tabIndex={focusable ? 0 : -1}
                    aria-hidden={!focusable}
                    aria-label={`${tile.title}, ${tile.days} day${tile.days === 1 ? "" : "s"}. Open preview`}
                    onClick={(event) =>
                      onTileClick({ currentTarget: event.currentTarget })
                    }
                    onPointerUp={(event) =>
                      onTilePointerUp({
                        currentTarget: event.currentTarget,
                        pointerType: event.pointerType,
                      })
                    }
                    onKeyDown={onTileKeyDown}
                  >
                    {/* Plain img: tiles live inside imperative 3D transforms
                        and are cloned with cloneNode for the enlarge flight,
                        which next/image cannot do. Sources are local,
                        lazy and async-decoded. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tile.src}
                      draggable={false}
                      alt={tile.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles["overlay"] ?? ""} aria-hidden="true" />
        <div className={styles["overlay--blur"] ?? ""} aria-hidden="true" />
        <div
          className={`${styles["edge-fade"]} ${styles["edge-fade--top"]}`}
          aria-hidden="true"
        />
        <div
          className={`${styles["edge-fade"]} ${styles["edge-fade--bottom"]}`}
          aria-hidden="true"
        />

        <div className={styles["viewer"] ?? ""} ref={viewerRef}>
          <div ref={scrimRef} className={styles["scrim"] ?? ""} />
          <div ref={frameRef} className={styles["frame"] ?? ""} />
        </div>
      </div>
    </div>
  );
}
