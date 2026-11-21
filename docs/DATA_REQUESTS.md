# Custom data request integration

The Phase 1 form posts JSON to `POST /api/data-requests`. The route validates the required fields and passes the work email plus a structured request note to the same Kit account and form used by newsletter and gear-waitlist signups.

The shared server helper in `src/lib/kit.ts` performs three operations:

1. Idempotently ensures the required DigiRobotics custom fields exist in Kit.
2. Upserts the subscriber with `source: data_request` and the structured request note.
3. Adds the subscriber to the form configured by `KIT_FORM_ID`.

The request note contains company, data type, estimated capture count, task/scenario, and additional requirements. API credentials are read only from `KIT_API_KEY` and `KIT_FORM_ID`; neither value is sent to the browser.

## Request fields

| Field | Required | Validation |
| :--- | :--- | :--- |
| `workEmail` | Yes | Valid email address. |
| `company` | Yes | Non-empty string. |
| `dataType` | Yes | Non-empty string. |
| `scenario` | Yes | At least 20 characters. |
| `captureEstimate` | Yes | Non-empty value from the numeric form control. |
| `requirements` | No | Included in the Kit request note when supplied. |

The route returns success only after Kit accepts both the subscriber upsert and form association. Configuration and upstream failures produce inline error states in the public form rather than a false success message.
