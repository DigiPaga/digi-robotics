import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.KIT_API_KEY?.trim();
  const formId = process.env.KIT_FORM_ID?.trim();
  if (!apiKey || !formId) {
    return NextResponse.json({ message: "Marketplace updates are not configured yet. Please try again later." }, { status: 503 });
  }

  try {
    const response = await fetch(`https://api.kit.com/v4/forms/${encodeURIComponent(formId)}/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: JSON.stringify({ email_address: email }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ message: "We could not add you right now. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ subscribed: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "The subscription service is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
