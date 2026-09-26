import { NextResponse } from "next/server";
import { subscribeToKit } from "@/lib/kit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown; source?: unknown; item?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  const source = body.source === "gear_waitlist" ? "gear_waitlist" : "newsletter";
  const item = typeof body.item === "string" ? body.item.trim().slice(0, 160) : undefined;
  if (source === "gear_waitlist" && !item) return NextResponse.json({ message: "Please choose an item to follow." }, { status: 400 });

  try {
    await subscribeToKit({ email, source, item });
    return NextResponse.json({ subscribed: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "KIT_NOT_CONFIGURED") return NextResponse.json({ message: "Marketplace updates are not configured yet. Please try again later." }, { status: 503 });
    return NextResponse.json({ message: "The subscription service is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
