import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locus",
  description: "A workspace for study and research.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
