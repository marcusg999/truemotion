// Server-only — never import from client components or pages with "use client".
// HL_WEBHOOK_URL is a Netlify server-side env var; it must never be NEXT_PUBLIC_.

interface HLContact {
  name: string;
  handle: string;
  tier: string;
  archetype: string;
}

export async function pushContactToHL(contact: HLContact): Promise<void> {
  const webhookUrl = process.env.HL_WEBHOOK_URL;
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: contact.name,
      custom_fields: {
        handle: contact.handle,
        tier: contact.tier,
        archetype: contact.archetype,
      },
    }),
  });

  if (!res.ok) {
    console.error(`HighLevel webhook failed: ${res.status} ${await res.text()}`);
  }
}
