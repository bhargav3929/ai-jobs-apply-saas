import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "JobAgent.ai - Automate Your Job Applications",
  description: "Send 20 personalized job applications daily while you sleep. AI-powered LinkedIn job automation.",
  keywords: ["job application", "linkedin automation", "job search", "ai job agent"],
  openGraph: {
    title: "JobAgent.ai - Automate Your Job Applications",
    description: "Send 20 personalized job applications daily while you sleep.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
