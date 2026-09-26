# DigiRobotics web app

The production frontend for `digirobotics.xyz`, built with Next.js 16, React 19, Tailwind CSS 4, Thirdweb embedded wallets, ZeroDev, and Kit.

## Routes

| Route | Purpose |
| :--- | :--- |
| `/` | Marketing landing page, contributor registration, marketplace preview, and custom-data intake. |
| `/getting-started` | Post-registration contributor instructions. |
| `/gear` | Filterable capture-equipment catalog and item-specific Kit waitlists. |
| `/api/subscribe` | Newsletter and gear-waitlist subscription intake. |
| `/api/data-requests` | Custom-data request intake backed by the shared Kit integration. |

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Enables Google and email-OTP embedded-wallet registration. |
| `NEXT_PUBLIC_ZERODEV_PROJECT_ID` | ZeroDev project identifier. |
| `NEXT_PUBLIC_ZERODEV_RPC_URL` | Optional ZeroDev-compatible RPC override. |
| `NEXT_PUBLIC_CHAIN_ID` | Chain used by the Thirdweb connection UI. |
| `KIT_API_KEY` | Server-only Kit API v4 key. |
| `KIT_FORM_ID` | Kit form receiving newsletter, gear, and data-request subscribers. |

Never expose `KIT_API_KEY` through a `NEXT_PUBLIC_` variable.

## Validation

```bash
npm run lint
npx tsc --noEmit
npx next build --webpack
```

The webpack build command is a useful fallback in restricted environments where Turbopack cannot open its temporary local process port.
