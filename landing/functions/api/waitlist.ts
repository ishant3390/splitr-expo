// Cloudflare Pages Function — POST /api/waitlist (save email) & GET /api/waitlist (count)

interface Env {
  WAITLIST: KVNamespace;
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
