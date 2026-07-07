import "./globals.css";

import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif } from "next/font/google";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Same State",
  description:
    "Same clinical state. Different model. Verifiable difference. An open-source demo of @0xsarwagya/clinical-receipt against HAPI FHIR and OpenRouter.",
  metadataBase: new URL("https://same-state.sarwagya.wtf"),
  authors: [{ name: "Sarwagya Singh", url: "https://sarwagya.wtf" }],
  openGraph: {
    title: "Same State",
    description:
      "Same clinical state. Different model. Verifiable difference.",
    url: "https://same-state.sarwagya.wtf",
    siteName: "Same State",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@0xsarwagya",
    title: "Same State",
    description:
      "Same clinical state. Different model. Verifiable difference.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
