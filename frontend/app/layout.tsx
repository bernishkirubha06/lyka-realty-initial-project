import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import FloatingAIChatbot from "@/components/FloatingAIChatbot";

export const metadata: Metadata = {
  title: "Lyka Realty | PropAI - AI Real Estate Intelligence & Property Recommendations",
  description: "Premier AI-powered luxury real estate advisory for Dubai and India. Voice and conversational requirement extraction, smart property matching, and private tour bookings.",
  icons: {
    icon: "/lyka-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090A0D] text-zinc-100 antialiased selection:bg-[#C5A869]/30 selection:text-white">
        {children}
        <Suspense fallback={null}>
          <FloatingAIChatbot />
        </Suspense>
      </body>
    </html>
  );
}
