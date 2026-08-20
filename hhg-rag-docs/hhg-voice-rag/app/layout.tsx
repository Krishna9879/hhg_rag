import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice RAG — Grounded Q&A | HH Goa 2026",
  description:
    "Ask a question by voice, get a grounded, cited answer from MSMARCO-XI. " +
    "Powered by Sarvam AI STT, multilingual-e5 embeddings, Qdrant vector search, and Groq LLM.",
  keywords: ["RAG", "voice", "MSMARCO", "Sarvam", "Groq", "Qdrant", "HH Goa"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
