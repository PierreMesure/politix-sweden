import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Is your MP on X (and Bluesky, Mastodon...)?",
  description: "This little dashboard lists the Swedish member of parliaments and displays their accounts on X, Bluesky and Mastodon. When possible, it also fetches the date of the latest post to see if the account is active. The data might not be exhaustive as the social media account information is fetched from Wikidata (Wikipedia's database). If you find an error or a missing account, please click \"Edit on Wikidata\” to fix it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
