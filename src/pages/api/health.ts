export const prerender = false;

// Health para Docker/Coolify (HEALTHCHECK) y monitoreo.
export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
