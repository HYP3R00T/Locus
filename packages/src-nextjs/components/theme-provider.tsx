"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ConfigurationProvider } from "@/components/configuration-provider";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="locus-theme"
    >
      <ConfigurationProvider>{children}</ConfigurationProvider>
    </NextThemeProvider>
  );
}
