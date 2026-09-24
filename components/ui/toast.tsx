"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/cn";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone?: "neutral" | "earth" | "clay";
}

const ToastContext = createContext<{ notify: (toast: Omit<ToastItem, "id">) => void }>({
  notify: () => undefined,
});

export const useToast = () => useContext(ToastContext);

let nextId = 1;

const tones = {
  neutral: "border-ink/20",
  earth: "border-earth",
  clay: "border-clay",
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = nextId++;
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "rounded-[2px] border border-l-4 bg-ink px-4 py-3 text-ivory",
              tones[toast.tone ?? "neutral"],
            )}
          >
            <p className="type-small font-semibold">{toast.title}</p>
            {toast.description ? (
              <p className="type-caption text-ivory/80">{toast.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
