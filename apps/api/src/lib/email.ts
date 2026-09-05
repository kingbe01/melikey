const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "melikey <onboarding@resend.dev>";
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; skipping email send");
    return false;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    console.error("Resend email send failed", res.status, await res.text().catch(() => ""));
    return false;
  }

  return true;
}
