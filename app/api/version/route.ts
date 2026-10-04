export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { version: process.env.COPRO_APP_VERSION ?? "local" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
