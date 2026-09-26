import { NextResponse } from "next/server";

type DataRequest = {
  workEmail: string;
  company: string;
  dataType: string;
  scenario: string;
  captureEstimate: string;
  requirements?: string;
};

function validString(value: unknown, minimum = 1): value is string {
  return typeof value === "string" && value.trim().length >= minimum;
}

export async function POST(request: Request) {
  const endpoint = process.env.DATA_REQUEST_ENDPOINT?.trim();
  if (!endpoint) return NextResponse.json({ message: "Data-request intake is not configured yet. Please contact the DigiRobotics team directly." }, { status: 503 });

  let body: Partial<DataRequest>;
  try { body = (await request.json()) as Partial<DataRequest>; }
  catch { return NextResponse.json({ message: "The request body was not valid JSON." }, { status: 400 }); }

  if (!validString(body.workEmail) || !/^\S+@\S+\.\S+$/.test(body.workEmail) || !validString(body.company) || !validString(body.dataType) || !validString(body.scenario, 20) || !validString(body.captureEstimate)) {
    return NextResponse.json({ message: "Please complete every required field with valid information." }, { status: 400 });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, source: "digirobotics.xyz", submittedAt: new Date().toISOString() }),
      cache: "no-store",
    });
    if (!upstream.ok) return NextResponse.json({ message: "The request service did not accept this submission. Please try again later." }, { status: 502 });
    return NextResponse.json({ accepted: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "The request service is temporarily unavailable. Please try again later." }, { status: 502 });
  }
}
