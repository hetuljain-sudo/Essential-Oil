/**
 * Sending email.
 *
 * Over plain fetch, like Razorpay, and for the same reason: the surface we
 * need is one POST, and an SDK on this path is a dependency that buys
 * nothing.
 *
 * Two providers, chosen by `EMAIL_PROVIDER`, because which one works depends
 * on something outside this code: whether you own a domain. Resend expects
 * you to verify a domain you control and will otherwise only deliver to your
 * own address. Brevo lets you verify a single sender address — a Gmail
 * address included — and send from that. On *.vercel.app with no domain yet,
 * Brevo is the one that works; after a domain is bought, either does. The
 * switch is one environment variable rather than a rewrite.
 *
 * ---
 *
 * The rule this file exists to keep: **never claim an email was sent when it
 * was not.** Every function here returns a result saying what actually
 * happened, and no caller is given a boolean it could mistake for success.
 * The whole reason email is being added is that the site had several places
 * implying a message had gone out when nothing had; replacing that with code
 * that silently swallows a provider error would be the same bug wearing a
 * better hat.
 */

const PROVIDERS = {
  brevo: {
    url: "https://api.brevo.com/v3/smtp/email",
    headers: (key) => ({ "api-key": key, "content-type": "application/json", accept: "application/json" }),
    body: ({ from, fromName, to, toName, subject, text, replyTo }) => ({
      sender: { email: from, name: fromName },
      to: [{ email: to, name: toName || undefined }],
      replyTo: replyTo ? { email: replyTo } : undefined,
      subject,
      textContent: text,
    }),
    idOf: (body) => body?.messageId ?? null,
  },
  resend: {
    url: "https://api.resend.com/emails",
    headers: (key) => ({ authorization: `Bearer ${key}`, "content-type": "application/json" }),
    body: ({ from, fromName, to, subject, text, replyTo }) => ({
      from: fromName ? `${fromName} <${from}>` : from,
      to: [to],
      reply_to: replyTo || undefined,
      subject,
      text,
    }),
    idOf: (body) => body?.id ?? null,
  },
};

/**
 * What is configured, without revealing any of it.
 *
 * `db/check.mjs` prints this. It names no key and no address beyond the
 * domain, so the output can be pasted into a bug report.
 */
export function emailStatus() {
  const provider = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();
  const key = process.env.EMAIL_API_KEY ?? "";
  const from = process.env.EMAIL_FROM ?? "";

  if (!provider && !key && !from) return { configured: false, reason: "nothing set" };
  if (!PROVIDERS[provider]) {
    return { configured: false, reason: `EMAIL_PROVIDER must be ${Object.keys(PROVIDERS).join(" or ")}` };
  }
  if (!key) return { configured: false, provider, reason: "EMAIL_API_KEY is not set" };
  if (!from.includes("@")) return { configured: false, provider, reason: "EMAIL_FROM is not an address" };

  return { configured: true, provider, fromDomain: from.split("@")[1] };
}

export const emailConfigured = () => emailStatus().configured;

/**
 * Send one message.
 *
 * Never throws. Returns `{ sent: true, id }` or `{ sent: false, reason }`,
 * because every caller has to tell somebody the truth about what happened and
 * an exception halfway through settling an order helps nobody.
 *
 * `reason` is for us — it can name the provider's complaint. Callers decide
 * what, if anything, a customer or an admin is told.
 */
export async function sendEmail({ to, toName, subject, text, replyTo }) {
  const status = emailStatus();
  if (!status.configured) {
    return { sent: false, reason: `email is not configured: ${status.reason}` };
  }
  if (!to || !String(to).includes("@")) {
    return { sent: false, reason: "no recipient address" };
  }

  const provider = PROVIDERS[status.provider];
  const payload = provider.body({
    from: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME || "Sarvha",
    to, toName, subject, text,
    replyTo: replyTo || process.env.EMAIL_REPLY_TO || "",
  });

  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: provider.headers(process.env.EMAIL_API_KEY),
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Their message, kept for the log. It names the real cause —
      // unverified sender, daily cap reached, bad key — and guessing at it
      // from a status code wastes an afternoon.
      const detail = body?.message ?? body?.error?.message ?? `HTTP ${res.status}`;
      return { sent: false, reason: `${status.provider}: ${detail}` };
    }

    return { sent: true, id: provider.idOf(body), provider: status.provider };
  } catch (err) {
    return { sent: false, reason: `could not reach ${status.provider}: ${err.message}` };
  }
}
