"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useConfiguration } from "@/components/configuration-provider";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/workbench/action-tooltip";

export function ThemeToggle() {
  const { resolvedTheme } = useTheme();
  const { appearance, themes, selectTheme, writable } = useConfiguration();
  const targetMode = resolvedTheme === "dark" ? "light" : "dark";
  const preferred = targetMode === "dark" ? appearance.darkTheme : appearance.lightTheme;
  const nextTheme =
    themes.find((theme) => theme.id === preferred && theme.mode === targetMode)?.id ??
    `default-${targetMode}`;

  return (
    <ActionTooltip label="Toggle color theme">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle color theme"
        disabled={!writable}
        onClick={() => void selectTheme(nextTheme)}
      >
        <MoonIcon className="dark:hidden" aria-hidden="true" />
        <SunIcon className="hidden dark:block" aria-hidden="true" />
      </Button>
    </ActionTooltip>
  );
}
