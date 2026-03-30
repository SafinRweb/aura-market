import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./global.css";
import { GA_ID } from "@/lib/analytics";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Aura Market | 2026 World Cup Prediction Market",
  description: "The ultimate social prediction market for the 2026 FIFA World Cup. Stake your Aura. Prove your knowledge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`${pixelFont.variable} font-pixel`}>
        {children}
      </body>
    </html>
  );
}