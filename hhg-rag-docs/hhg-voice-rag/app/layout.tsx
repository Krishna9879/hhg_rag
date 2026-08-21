import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HHG Voice RAG — High-Performance Indic Grounded Q&A",
  description:
    "Ask a question by voice or text, get a strictly grounded, cited answer from MSMARCO-XI Indic dataset. " +
    "Engineered with Sarvam AI STT, 4-strategy Vector Chunking, Qdrant, and Groq ultra-fast LLM.",
  keywords: ["RAG", "voice", "Indic", "Hindi", "MSMARCO", "Sarvam", "Groq", "Qdrant", "HHG"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#0B0F0E] text-[#F5F7F6] antialiased selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
        <Navbar />
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}
