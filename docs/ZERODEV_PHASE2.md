# ZeroDev Phase 2 Permission Architecture

Phase 1 authenticates users and prepares the smart-account boundary; it does not activate session keys, deploy accounts automatically, or send test UserOperations.

## Ownership and approval

- The human owner remains the root authority and must explicitly approve any delegation.
- An agent may receive only a narrowly scoped session permission; it is never a replacement owner.
- The UI must show the active owner, delegated agent, permitted actions, expiry, and revocation state.

## Enforced policy

- Allowlist exact target contracts and function selectors.
- Apply per-operation and cumulative value limits where value transfer is possible.
- Set short expirations and rate limits appropriate to the campaign task.
- Enforce policy in the smart account/session-key validator, not in prompt text or backend checks alone.

## Key custody and incident response

- Agent/session keys belong in a server-side KMS, HSM, TEE, or audited remote signer.
- Never store agent keys in browser local storage, source code, committed environment files, or client-readable variables.
- Owners need a visible one-action revocation path. Compromise response must revoke the permission, rotate the remote key, preserve an audit record, and notify affected owners.
- Log grants, attempted actions, successful UserOperations, failures, revocations, and policy changes without logging private keys or sensitive payloads.

## CROPS record

- **Chosen default:** owner-controlled Kernel account with explicit, expiring, selector-level agent permissions.
- **Censorship resistance:** bundler/paymaster/RPC vendors can refuse service; keep them replaceable and document direct owner-controlled recovery paths.
- **Open and free:** integration boundaries and permission policy remain inspectable and self-hostable under the repository license.
- **Privacy:** authentication, RPC, bundler, and campaign submission providers can observe user metadata; collect only necessary data and disclose providers before activation.
- **Security:** no silent wallet creation, automatic deployment, unlimited approvals, or browser-stored session keys. Owner revocation is mandatory.
- **Accepted compromise:** sponsored operations depend on configured vendor infrastructure; Phase 2 must expose sponsorship status honestly and never describe an unsponsored operation as gasless.
