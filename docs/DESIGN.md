# Design system

## Agent demo identity

| Token | Use |
| :--- | :--- |
| Graphite `#171b25` | Page canvas |
| Near-black `#11151e` | Telemetry surfaces |
| Digi lime `oklch(0.82 0.21 130)` | Active state, trust signal, primary action |
| Syne | Display headline |
| Inter Tight | Body copy |
| JetBrains Mono | Protocol telemetry, addresses, amounts, state labels |

The `/agent-demo` page uses an editorial headline, dense telemetry console, and compact evidence panels. It deliberately avoids animated fake progress: motion is limited to current-state indicators driven by backend events and respects `prefers-reduced-motion` through the global stylesheet.

## Interaction rules

- One **Run agent demo** action is visible and disabled while a run is active.
- Settlement success is shown only for the backend `unlocked` state.
- Candidate selection explains its deterministic score and allowlist reasons.
- The transaction link appears only when a facilitator receipt includes a real hash.
- Failures remain visible, preserve their typed code, and allow a fresh idempotent run.
