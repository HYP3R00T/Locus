import type { Metadata } from "next";
import { WindowFrame } from "@/components/layout/window-frame";
import { ThemeProvider } from "@/components/theme-provider";
import { WorkbenchProvider } from "@/components/workbench/workbench-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locus",
  description: "A workspace for study and research.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <WorkbenchProvider>
            <WindowFrame>{children}</WindowFrame>
          </WorkbenchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
