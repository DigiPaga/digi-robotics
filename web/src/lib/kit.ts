import "server-only";

type KitField = { label: string; value: string };

type KitCustomFieldResponse = {
  custom_field?: { key?: string };
};

function kitConfig() {
  const apiKey = process.env.KIT_API_KEY?.trim();
  const formId = process.env.KIT_FORM_ID?.trim();
  if (!apiKey || !formId) throw new Error("KIT_NOT_CONFIGURED");
  return { apiKey, formId };
}

async function kitFetch(path: string, apiKey: string, init: RequestInit) {
  const response = await fetch(`https://api.kit.com/v4${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Kit-Api-Key": apiKey, ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`KIT_${response.status}`);
  return response;
}

async function ensureCustomField(label: string, apiKey: string) {
  const response = await kitFetch("/custom_fields", apiKey, {
    method: "POST",
    body: JSON.stringify({ label }),
  });
  const payload = (await response.json()) as KitCustomFieldResponse;
  const key = payload.custom_field?.key;
  if (!key) throw new Error("KIT_FIELD_KEY_MISSING");
  return key;
}

export async function subscribeToKit({ email, source, item, notes }: {
  email: string;
  source: "newsletter" | "gear_waitlist" | "data_request";
  item?: string;
  notes?: string;
}) {
  const { apiKey, formId } = kitConfig();
  const requestedFields: KitField[] = [
    { label: "DigiRobotics Source", value: source },
    ...(item ? [{ label: "DigiRobotics Item", value: item }] : []),
    ...(notes ? [{ label: "DigiRobotics Request Notes", value: notes }] : []),
  ];
  const keys = await Promise.all(requestedFields.map((field) => ensureCustomField(field.label, apiKey)));
  const fields = Object.fromEntries(keys.map((key, index) => [key, requestedFields[index].value]));

  await kitFetch("/subscribers", apiKey, {
    method: "POST",
    body: JSON.stringify({ email_address: email, fields }),
  });

  const referrer = new URL("https://digirobotics.xyz");
  referrer.searchParams.set("utm_source", source);
  if (item) referrer.searchParams.set("utm_content", item);
  await kitFetch(`/forms/${encodeURIComponent(formId)}/subscribers`, apiKey, {
    method: "POST",
    body: JSON.stringify({ email_address: email, referrer: referrer.toString() }),
  });
}
