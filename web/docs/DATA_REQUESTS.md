# Custom data request integration

The Phase 1 form posts to `POST /api/data-requests`. That server route validates the payload and forwards it to the persistence service configured in `DATA_REQUEST_ENDPOINT`.

The upstream endpoint must return a 2xx response only after persisting or durably queueing the request. Until it is configured, the public form returns a clear unavailable state and never displays a false success message.

Expected JSON fields: `workEmail`, `company`, `dataType`, `scenario`, `captureEstimate`, `requirements`, `source`, and `submittedAt`.
