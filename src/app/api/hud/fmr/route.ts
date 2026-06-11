import { NextResponse } from "next/server";
import { fmrByZip, fmrForBeds, resolveHudToken, HudError } from "@/lib/server/hud";

export const runtime = "nodejs";
export const maxDuration = 30;

// Free HUD Fair Market Rent lookup by ZIP. Returns rent by bedroom + a pick.
export async function POST(req: Request) {
  const token = resolveHudToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "no-key", message: "Add a free HUD API token in Settings to use HUD rent data." },
      { status: 400 }
    );
  }

  let body: { zip?: string; address?: string; beds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  let zip = body.zip?.trim();
  if (!zip && body.address) zip = body.address.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1];
  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "missing-zip", message: "A 5-digit ZIP code is required." }, { status: 400 });
  }

  try {
    const fmr = await fmrByZip(zip, token);
    const rent = body.beds !== undefined ? fmrForBeds(fmr.rentByBed, body.beds) : undefined;
    return NextResponse.json({ zip, ...fmr, rent });
  } catch (e) {
    const err = e as HudError;
    return NextResponse.json({ error: "hud", message: err.message }, { status: err.status || 500 });
  }
}
