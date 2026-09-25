"use client";

import { BuilderProvider, STEPS, stepErrors, useBuilder } from "@/components/builder/builder-context";
import { StepErrors } from "@/components/builder/option-cards";
import { ReviewStep } from "@/components/builder/review";
import type { BuilderStepData } from "@/components/builder/steps";
import {
  AccommodationStep,
  ActivitiesStep,
  DatesStep,
  DestinationsStep,
  ExperienceStep,
  InterestsStep,
  StyleStep,
  TransportStep,
  TravellersStep,
  WhereStep,
} from "@/components/builder/steps";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Spinner } from "@/components/ui/states";
import { cn } from "@/lib/cn";

function StepRail() {
  const { stepIndex, maxReached, goTo } = useBuilder();
  return (
    <ol aria-label="Builder progress" className="flex flex-wrap gap-1.5">
      {STEPS.map((step, index) => {
        const reached = index <= maxReached;
        const current = index === stepIndex;
        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={!reached}
              onClick={() => goTo(index)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "type-caption cursor-pointer rounded-full border px-3 py-1.5",
                current
                  ? "border-ink bg-ink text-ivory"
                  : reached
                    ? "border-ink/25 hover:border-ink"
                    : "cursor-not-allowed border-ink/10 text-ink/35",
              )}
            >
              {index + 1}. {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepBody({ data }: { data: BuilderStepData }) {
  const { step } = useBuilder();
  switch (step) {
    case "where":
      return <WhereStep />;
    case "experience":
      return <ExperienceStep />;
    case "dates":
      return <DatesStep seasons={data.seasons} />;
    case "travellers":
      return <TravellersStep />;
    case "style":
      return <StyleStep />;
    case "interests":
      return <InterestsStep />;
    case "destinations":
      return <DestinationsStep destinations={data.destinations} />;
    case "accommodation":
      return <AccommodationStep />;
    case "transport":
      return <TransportStep />;
    case "activities":
      return <ActivitiesStep addOns={data.addOns} />;
    case "review":
      return <ReviewStep data={data} />;
  }
}

function StepNav() {
  const { draft, step, stepIndex, back, next } = useBuilder();
  const errors = stepErrors(step, draft);
  const isReview = step === "review";
  if (isReview) {
    return (
      <div className="mt-8">
        <Button variant="secondary" onClick={back}>
          ← Back to activities
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-8">
      <StepErrors errors={errors} />
      <div className="mt-4 flex flex-wrap gap-3">
        {stepIndex > 0 ? (
          <Button variant="secondary" onClick={back}>
            ← Back
          </Button>
        ) : null}
        <Button onClick={next} disabled={errors.length > 0}>
          Continue →
        </Button>
      </div>
    </div>
  );
}

function BuilderShell({ data }: { data: BuilderStepData }) {
  const { loaded, reset } = useBuilder();
  if (!loaded) {
    return (
      <Container className="py-16">
        <Spinner label="Loading your saved plan" />
      </Container>
    );
  }
  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="type-label text-clay-deep">Design your safari</p>
          <h1 className="type-h1 mt-2 text-balance">Build it your way, step by step</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Start over with a blank plan?")) reset();
          }}
          className="type-small cursor-pointer underline underline-offset-4 text-ink/60"
        >
          Start over
        </button>
      </div>
      <p className="type-small mt-2 text-ink/60">
        Progress saves automatically in this browser — leave and come back any time.
      </p>
      <div className="mt-6">
        <StepRail />
      </div>
      <div className="mt-8 max-w-3xl">
        <StepBody data={data} />
        <StepNav />
      </div>
    </Container>
  );
}

export function Builder({ data }: { data: BuilderStepData }) {
  return (
    <BuilderProvider>
      <BuilderShell data={data} />
    </BuilderProvider>
  );
}
