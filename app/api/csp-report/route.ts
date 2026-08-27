export async function POST(request: Request) {
  try {
    const body = (await request.text()).slice(0, 12_000);
    console.warn(
      JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", route: "/api/csp-report", cspReport: body }),
    );
  } catch (error) {
    console.error("[csp-report] unable to read report", error);
  }
  return new Response(null, { status: 204 });
}
