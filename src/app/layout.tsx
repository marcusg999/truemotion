import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { BottomNav } from "@/components/BottomNav";
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
  title: "True Motion — TRP.L A&R Pipeline",
  description:
    "True Motion: artist evaluation, archetype classification, and human-gated outreach for TRP.L.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 pb-24 sm:pb-10">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
