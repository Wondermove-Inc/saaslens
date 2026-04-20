"use client";

import { ThemeProvider } from "next-themes";

export function RootThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme="light"
    >
      {children}
    </ThemeProvider>
  );
}
