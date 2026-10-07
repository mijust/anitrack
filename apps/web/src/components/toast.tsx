"use client";

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error";
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; tone: ToastTone; action?: ToastAction };
type ToastOptions = { tone?: ToastTone; action?: ToastAction };

const ToastContext = createContext<((message: string, options?: ToastOptions) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { id, message, tone: options.tone ?? "default", action: options.action }]);
      window.setTimeout(() => dismiss(id), options.action ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className="animate-enter pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-border-strong bg-card/95 py-2 pl-3 pr-2 text-sm shadow-xl shadow-black/20 backdrop-blur"
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                item.tone === "error" ? "bg-danger/15 text-danger" : "bg-success/15 text-success",
              )}
            >
              {item.tone === "error" ? <XIcon width={12} height={12} /> : <CheckIcon width={12} height={12} />}
            </span>
            <span className="line-clamp-2">{item.message}</span>
            {item.action && (
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
                className="shrink-0 rounded-full px-3 py-1 font-medium text-accent hover:bg-accent-soft"
              >
                {item.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => dismiss(item.id)}
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon width={14} height={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
