"use client";

import { useEffect, useId, useRef } from "react";
import { toast } from "@/components/ui/toast";

// One notice per source/message; rerenders and theme previews must not duplicate it.
export function useNotice(
  message: string | null | undefined,
  title: string,
  type: "error" | "warning" = "error",
) {
  const id = useId();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!message) {
      last.current = null;
      return;
    }
    if (last.current === message) return;
    last.current = message;
    toast.add({
      id,
      title,
      description: message,
      type,
      timeout: type === "error" ? 0 : undefined,
      priority: type === "error" ? "high" : "low",
    });
  }, [id, message, title, type]);
}
