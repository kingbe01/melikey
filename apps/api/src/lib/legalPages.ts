const EFFECTIVE_DATE = "September 7, 2026";
const CONTACT_EMAIL = "support@melikey.me";

// Shared wrapper so both pages render consistently without a templating
// dependency — this is served directly by Express, not built by Expo/React.
function page(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — melikey</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px 64px; color: #2C3E50; line-height: 1.6; }
  h1 { color: #0188EC; font-size: 24px; }
  h2 { font-size: 17px; margin-top: 32px; }
  p, li { font-size: 15px; }
  .effective-date { color: #8698A8; font-size: 13px; margin-top: -8px; }
  .notice { background: #D8EDFC; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #0061A9; margin-bottom: 24px; }
  a { color: #0188EC; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export const PRIVACY_POLICY_HTML = page(
  "Privacy Policy",
  `
<h1>Privacy Policy</h1>
<p class="effective-date">Effective ${EFFECTIVE_DATE}</p>
<div class="notice">melikey is currently an early-stage app in closed testing (TestFlight). This policy describes what we collect today and will be revisited before any wider public release.</div>

<h2>Information we collect</h2>
<ul>
  <li><strong>Account information:</strong> email address, username, and password (stored as a one-way hash, never in plain text).</li>
  <li><strong>Content you create:</strong> "Likeys" (a rating, optional comment, and optional photo tied to a place), and an optional profile photo.</li>
  <li><strong>Location:</strong> your device's location when you open the app or search nearby places, used to find businesses and populate your feed. We do not continuously track location in the background, and we do not store a history of your location — only the place data tied to Likeys you choose to post.</li>
  <li><strong>Follow relationships:</strong> who you follow and who follows you.</li>
  <li><strong>Push notification token:</strong> if you enable notifications, a device token used to deliver them.</li>
</ul>

<h2>How we use this information</h2>
<p>To operate the core features of the app: authenticating you, showing your feed, delivering notifications, and letting people you approve see the Likeys you post. We do not use your data for advertising, and we do not sell your data.</p>

<h2>Who we share information with</h2>
<p>We use a small number of service providers to run the app, each only for the specific task below:</p>
<ul>
  <li><strong>Resend</strong> — sends transactional emails (e.g. password reset codes).</li>
  <li><strong>Apple Maps Server API</strong> — used to search for and geocode places; only your search text and coordinates are sent, not your account information.</li>
  <li><strong>Expo</strong> — relays push notifications to your device.</li>
  <li><strong>Neon</strong> and <strong>Render</strong> — host our database and backend server.</li>
</ul>
<p>We do not share your information with any other third party, and we do not sell it.</p>

<h2>Data retention</h2>
<p>We keep your account and content until you ask us to delete it. Reach out at the contact below to request deletion of your account and associated data.</p>

<h2>Your choices</h2>
<p>You can edit or delete any Likey you've posted, change your username or profile photo, and disable notification permissions at any time from your device settings. To delete your account entirely, contact us below.</p>

<h2>Children's privacy</h2>
<p>melikey is not directed at children under 13, and we do not knowingly collect information from them.</p>

<h2>Changes to this policy</h2>
<p>We may update this policy as the app evolves. We'll update the effective date above when we do.</p>

<h2>Contact</h2>
<p>Questions about this policy or your data: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`
);

export const TERMS_OF_SERVICE_HTML = page(
  "Terms of Service",
  `
<h1>Terms of Service</h1>
<p class="effective-date">Effective ${EFFECTIVE_DATE}</p>
<div class="notice">melikey is currently an early-stage app in closed testing. These terms are a standard baseline for that stage and haven't been reviewed by an attorney — they'll be revisited before any wider public release.</div>

<h2>Acceptance of terms</h2>
<p>By creating an account or using melikey, you agree to these terms. If you don't agree, please don't use the app.</p>

<h2>The service</h2>
<p>melikey is an early-stage, invite-based app for sharing recommendations with people you follow. Features, availability, and data may change or be reset at any time without notice while the app is in this stage.</p>

<h2>Your account</h2>
<p>You're responsible for keeping your password secure and for activity that happens under your account. You must provide accurate information when signing up.</p>

<h2>Your content</h2>
<p>You own the Likeys, comments, and photos you post. By posting them, you grant melikey a license to store and display that content to the followers you've approved, for the purpose of operating the app. You're responsible for making sure you have the right to post what you post, and for its accuracy.</p>

<h2>Acceptable use</h2>
<p>Don't use melikey to post illegal content, harass others, impersonate someone else, or spam. We may remove content or suspend accounts that violate this.</p>

<h2>No warranty</h2>
<p>melikey is provided "as is," in active early development, without warranties of any kind. We don't guarantee the accuracy of place information (sourced from Apple Maps) or that the service will be uninterrupted or error-free.</p>

<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, melikey and its operator aren't liable for any indirect, incidental, or consequential damages arising from your use of the app.</p>

<h2>Termination</h2>
<p>You can stop using melikey and request account deletion at any time. We may suspend or terminate access for violating these terms.</p>

<h2>Changes to these terms</h2>
<p>We may update these terms as the app evolves. Continuing to use melikey after a change means you accept the updated terms.</p>

<h2>Governing law</h2>
<p>These terms are governed by the laws of the State of Tennessee, without regard to conflict-of-law principles.</p>

<h2>Contact</h2>
<p>Questions about these terms: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`
);
