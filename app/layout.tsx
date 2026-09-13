import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayfound",
  description: "Know the next step.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
