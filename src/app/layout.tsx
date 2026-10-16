import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AppBar } from "@/components/app-bar";
import { playerBySlug } from "@/lib/players";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Parlay Picker",
  description: "Build a group parlay, one pick per person.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const me = session && playerBySlug(session) ? session : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-20 font-sans">
        {children}
        <AppBar me={me} />
      </body>
    </html>
  );
}
