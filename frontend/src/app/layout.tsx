import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { ClientShellLoader } from "@/components/ClientShellLoader";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "welp — Blockchain Review Platform",
  description:
    "Check in to local businesses, write immutable reviews, earn WELP tokens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
      style={{ backgroundColor: "hsl(36, 50%, 98%)" }}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ backgroundColor: "hsl(36, 50%, 98%)", color: "#1A1A1A" }}
      >
        <ClientShellLoader>{children}</ClientShellLoader>
      </body>
    </html>
  );
}
