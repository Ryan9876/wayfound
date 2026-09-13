import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./typography.css";
import "./desktop-polish.css";
import "./overview-polish.css";
import "./overview-finish.css";
import "./overview-type-spacing.css";
import "./overview-card-spacing.css";
import "./overview-mobile.css";
import "./overview-mobile-typography.css";
import "./overview-mobile-spacing.css";
import "./overview-mobile-density.css";
import "./overview-mobile-first-screen.css";
import "./overview-mobile-action-hierarchy.css";
import "./overview-mobile-cta.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wayfound",
  description: "Know the next step.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
