"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  BUILDER_STORAGE_KEY,
  EMPTY_DRAFT,
  restoreDraft,
  tripDays,
  type BuilderDraft,
} from "@/lib/builder";

export const STEPS = [
  { id: "where", label: "Where" },
  { id: "experience", label: "Experience" },
  { id: "dates", label: "Dates" },
  { id: "travellers", label: "Travellers" },
  { id: "style", label: "Style" },
  { id: "interests", label: "Interests" },
  { id: "destinations", label: "Destinations" },
  { id: "accommodation", label: "Stay" },
  { id: "transport", label: "Transport" },
  { id: "activities", label: "Activities" },
  { id: "review", label: "Review" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

/** Per-step gating: which fields must be valid to continue. */
export function stepErrors(step: StepId, draft: BuilderDraft): string[] {
  switch (step) {
    case "where":
      return draft.regions.length === 0 ? ["Choose at least one region"] : [];
    case "experience":
      return [];
    case "dates": {
      const errors: string[] = [];
      if (!draft.startDate) errors.push("Pick a start date");
      if (!draft.endDate) errors.push("Pick an end date");
      if (draft.startDate && draft.endDate) {
        const days = tripDays(draft);
        if (days < 2) errors.push("End date must be after the start date (min 2 days)");
        if (days > 30) errors.push("Over 30 days — send an enquiry instead");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(`${draft.startDate}T00:00:00Z`) < today) {
          errors.push("Start date is in the past");
        }
      }
      return errors;
    }
    case "travellers": {
      const total = draft.adults + draft.children + draft.infants;
      if (total < 1) return ["Add at least one traveller"];
      if (total > 18) return ["Groups over 18 travel as group safaris — send an enquiry"];
      return [];
    }
    case "style":
      return draft.travelStyle ? [] : ["Choose private or shared"];
    case "interests":
      return [];
    case "destinations":
      return draft.destinationSlugs.length === 0 ? ["Choose at least one destination"] : [];
    case "accommodation":
      return draft.comfort ? [] : ["Choose a comfort level"];
    case "transport":
      return draft.transport ? [] : ["Choose how you travel"];
    case "activities":
      return [];
    case "review":
      return [];
  }
}

interface BuilderContextValue {
  draft: BuilderDraft;
  stepIndex: number;
  step: StepId;
  loaded: boolean;
  maxReached: number;
  setField: <K extends keyof BuilderDraft>(key: K, value: BuilderDraft[K]) => void;
  toggleItem: (key: "regions" | "experiences" | "interests" | "addOnSlugs", item: string) => void;
  toggleDestination: (slug: string) => void;
  moveDestination: (slug: string, direction: -1 | 1) => void;
  goTo: (index: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilder(): BuilderContextValue {
  const value = useContext(BuilderContext);
  if (!value) throw new Error("useBuilder must be used inside BuilderProvider");
  return value;
}

function loadDraft(): BuilderDraft {
  try {
    return restoreDraft(window.localStorage.getItem(BUILDER_STORAGE_KEY));
  } catch {
    return EMPTY_DRAFT;
  }
}

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BuilderDraft>(EMPTY_DRAFT);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Intentional post-hydration restore from an external system
    // (localStorage). Reading it during render would mismatch SSR HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadDraft());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private browsing etc: the builder still works for the session.
    }
  }, [draft, loaded ]);

  const setField = useCallback<BuilderContextValue["setField"]>((key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const toggleItem = useCallback<BuilderContextValue["toggleItem"]>((key, item) => {
    setDraft((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
      };
    });
  }, []);

  const toggleDestination = useCallback((slug: string) => {
    setDraft((current) => ({
      ...current,
      destinationSlugs: current.destinationSlugs.includes(slug)
        ? current.destinationSlugs.filter((s) => s !== slug)
        : [...current.destinationSlugs, slug],
    }));
  }, []);

  const moveDestination = useCallback((slug: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.destinationSlugs.indexOf(slug);
      const swapWith = index + direction;
      if (index < 0 || swapWith < 0 || swapWith >= current.destinationSlugs.length) {
        return current;
      }
      const next = [...current.destinationSlugs];
      const moving = next[index];
      const other = next[swapWith];
      if (moving === undefined || other === undefined) return current;
      next[index] = other;
      next[swapWith] = moving;
      return { ...current, destinationSlugs: next };
    });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, STEPS.length - 1));
      // Can only jump to steps already reached (or back).
      if (clamped <= maxReached || clamped < stepIndex) {
        setStepIndex(clamped);
      }
    },
    [maxReached, stepIndex],
  );

  const next = useCallback(() => {
    setStepIndex((current) => {
      const nextIndex = Math.min(current + 1, STEPS.length - 1);
      setMaxReached((max) => Math.max(max, nextIndex));
      return nextIndex;
    });
  }, []);

  const back = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setStepIndex(0);
    setMaxReached(0);
    try {
      window.localStorage.removeItem(BUILDER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const step = STEPS[stepIndex]?.id ?? "where";

  const value = useMemo(
    () => ({
      draft,
      stepIndex,
      step,
      loaded,
      maxReached,
      setField,
      toggleItem,
      toggleDestination,
      moveDestination,
      goTo,
      next,
      back,
      reset,
    }),
    [draft, stepIndex, step, loaded, maxReached, setField, toggleItem, toggleDestination, moveDestination, goTo, next, back, reset],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}
