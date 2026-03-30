import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import Script from "next/script";
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
            <Script
              id="gtag-base"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                  });
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