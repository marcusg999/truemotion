import type { NextConfig } from "next";

// When a CSP is added, include these HighLevel/LeadConnector hosts:
//   script-src / connect-src : *.leadconnectorhq.com  *.msgsndr.com
//   img-src                  : images.leadconnectorhq.com  storage.googleapis.com
//   frame-src (chat/forms)   : *.leadconnectorhq.com
// Confirm exact hosts from the snippet before activating.

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
