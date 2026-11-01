"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavigationAction({
  compact = false,
  className,
  ...props
}: ComponentProps<typeof Button> & { compact?: boolean }) {
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "default"}
      className={cn(
        "h-9 shrink-0 gap-3 aria-expanded:bg-transparent hover:aria-expanded:bg-sidebar-accent [&_svg]:size-4",
        compact ? "mx-auto w-9 justify-center px-0" : "w-full justify-start px-3",
        className,
      )}
      {...props}
    />
  );
}
