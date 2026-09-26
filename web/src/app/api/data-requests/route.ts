import { NextResponse } from "next/server";
import { subscribeToKit } from "@/lib/kit";

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
  let body: Partial<DataRequest>;
  try { body = (await request.json()) as Partial<DataRequest>; }
  catch { return NextResponse.json({ message: "The request body was not valid JSON." }, { status: 400 }); }

  if (!validString(body.workEmail) || !/^\S+@\S+\.\S+$/.test(body.workEmail) || !validString(body.company) || !validString(body.dataType) || !validString(body.scenario, 20) || !validString(body.captureEstimate)) {
    return NextResponse.json({ message: "Please complete every required field with valid information." }, { status: 400 });
  }

  try {
    const notes = [
      `Company: ${body.company!.trim()}`,
      `Data type: ${body.dataType!.trim()}`,
      `Estimated captures: ${body.captureEstimate!.trim()}`,
      `Task/scenario: ${body.scenario!.trim()}`,
      `Additional requirements: ${body.requirements?.trim() || "None provided"}`,
    ].join("\n").slice(0, 5000);
    await subscribeToKit({ email: body.workEmail!.trim().toLowerCase(), source: "data_request", notes });
    return NextResponse.json({ accepted: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "KIT_NOT_CONFIGURED") return NextResponse.json({ message: "Data-request intake is not configured yet. Please try again later." }, { status: 503 });
    return NextResponse.json({ message: "The request service is temporarily unavailable. Please try again later." }, { status: 502 });
  }
}
