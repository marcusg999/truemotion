"use client";
import Script from "next/script";

const WIDGET_ID = process.env.NEXT_PUBLIC_CRM_WIDGET_ID;

export function CrmTracker() {
  if (process.env.NODE_ENV !== "production" || !WIDGET_ID) return null;

  // Replace dangerouslySetInnerHTML below with the exact script provided by House Reno Profits.
  // If the snippet is a chat widget, change strategy to "lazyOnload".
  return (
    <Script
      id="hl-tracker"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `/* TODO: paste HL snippet here — widget/location id: ${WIDGET_ID} */`,
      }}
    />
  );
}
