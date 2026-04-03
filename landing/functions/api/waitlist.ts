// Cloudflare Pages Function — POST /api/waitlist (save email) & GET /api/waitlist (count)

interface Env {
  WAITLIST: KVNamespace;
  RESEND_API_KEY: string;
}

async function sendWelcomeEmail(email: string, apiKey: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Splitr <hello@splitr.ai>",
        to: email,
        subject: "You're on the Splitr waitlist! 🎉",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; color: #0d9488; margin: 0;">Splitr</h1>
            </div>
            <h2 style="font-size: 22px; font-weight: 600; color: #1e293b; margin: 0 0 16px;">You're on the list!</h2>
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
              Thanks for signing up for early access to Splitr — the fastest way to split expenses with friends. No awkwardness, no hassle.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
              We'll let you know as soon as we launch. You'll be among the first to try it out.
            </p>
            <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <p style="font-size: 14px; color: #0d9488; font-weight: 600; margin: 0 0 8px;">What's coming:</p>
              <ul style="font-size: 14px; color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Split expenses in seconds</li>
                <li>AI-powered receipt scanning</li>
                <li>Smart settlement suggestions</li>
                <li>Multi-currency support</li>
              </ul>
            </div>
            <p style="font-size: 14px; color: #94a3b8; margin: 0;">
              — The Splitr Team
            </p>
          </div>
        `,
      }),
    });
  } catch {
    // Don't fail the signup if email fails
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Simple email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Check if already signed up
    const existing = await env.WAITLIST.get(`email:${email}`);
    if (existing) {
      return Response.json(
        { message: "You're already on the list!", alreadyExists: true },
        { headers: CORS_HEADERS }
      );
    }

    // Store email with timestamp
    await env.WAITLIST.put(
      `email:${email}`,
      JSON.stringify({
        email,
        signedUpAt: new Date().toISOString(),
        source: request.headers.get("Referer") ?? "direct",
      })
    );

    // Increment counter
    const countStr = await env.WAITLIST.get("meta:count");
    const count = (countStr ? parseInt(countStr, 10) : 0) + 1;
    await env.WAITLIST.put("meta:count", String(count));

    // Send welcome email (non-blocking — don't fail signup if email fails)
    if (env.RESEND_API_KEY) {
      await sendWelcomeEmail(email, env.RESEND_API_KEY);
    }

    return Response.json(
      { message: "You're in! We'll let you know when we launch.", count },
      { headers: CORS_HEADERS }
    );
  } catch {
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const countStr = await env.WAITLIST.get("meta:count");
  const count = countStr ? parseInt(countStr, 10) : 0;

  return Response.json({ count }, { headers: CORS_HEADERS });
};
