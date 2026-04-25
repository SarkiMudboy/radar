"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export type ServerActionState = {
  error?: string;
  success?: boolean;
} | null;

/**
 * Surfaces server action results with Sonner toasts. Uses a microtask + cleanup
 * so React Strict Mode’s effect double-invocation does not duplicate toasts.
 */
export function useServerActionFeedback(
  state: ServerActionState,
  options: {
    successMessage: string;
    onSuccess?: () => void;
    /** @default true */
    errorToast?: boolean;
  },
) {
  const { successMessage, onSuccess, errorToast = true } = options;

  useEffect(() => {
    if (state == null) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (state.error && errorToast) {
        toast.error(state.error);
        return;
      }
      if (state.success) {
        toast.success(successMessage);
        onSuccess?.();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state, successMessage, onSuccess, errorToast]);
}
