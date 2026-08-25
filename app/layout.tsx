import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KANBN", template: "%s · KANBN" },
  description: "A focused, self-hosted Kanban board.",
  icons: { icon: "/assets/kanbn-lighthouse.png" },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(() => { try { const s = localStorage.getItem('kanbn-theme') || 'system'; const d = s === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : s; document.documentElement.dataset.theme = d; document.documentElement.dataset.themePreference = s; } catch { document.documentElement.dataset.theme = 'light'; } })()`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
