# Contributing to DigiRobotics

Thank you for your interest in contributing to DigiRobotics! Please read this document before making any changes.

## How to Contribute
1. Fork the repository, or create a branch directly if you have write access.
2. Create a new branch from `main`, named after the kind of change: `fix/short-description`, `feat/short-description`, or `chore/short-description`.
3. Make your changes and ensure the checks for every package you touched pass locally (see [Running the Checks Locally](#running-the-checks-locally)).
4. Commit your changes: `git commit -m 'feat: add your feature description'`.
5. Push to the branch: `git push origin feat/short-description`.
6. Open a Pull Request against `main`.

## Pull Requests
- One concern per pull request. Unrelated fixes go in separate pull requests.
- Keep each pull request small enough to review in one pass.
- CI runs the `web`, `contracts`, `x402-server`, and `x402-e2e` jobs defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on every pull request. Make sure they pass before asking for a review.

## Commit Messages
- Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`, for example `fix(contracts): record the caller as seller in batchListAssets` or `feat(web): private /ops dashboard`.
- Common types in this repository: `feat`, `fix`, `chore`, `docs`, `test`, `ci`.
- Write commit messages in English.
- Keep commits atomic: one logical change per commit.

## Running the Checks Locally

Node.js 20.9 or later and [Foundry](https://book.getfoundry.sh/getting-started/installation) are required.

### web
```bash
cd web
npm ci
npm run lint
npm test
npm run build
```

### contracts
```bash
git submodule update --init --recursive
cd contracts
forge build
forge test -vvv
```

### x402-server
```bash
cd x402-server
npm ci
npm run typecheck
npm run lint
npm test
```

The end-to-end test deploys the contracts to a local Anvil chain and runs a full mUSDG x402 payment. It needs Foundry on `PATH`:
```bash
cd x402-server
npm run test:e2e
```

## Generated Files
Do not commit build output or generated files, for example:
- `contracts/cache/` and `contracts/out/`
- `web/next-env.d.ts`
- `web/.next/`, `web/.open-next/`, and `web/.wrangler/`
- `node_modules/` and `dist/`

## Secrets
- Secrets never go in the repository: no private keys, API keys, bot tokens, OAuth client secrets, or filled-in `.env`, `.env.local`, or `.dev.vars` files.
- Only the `*.example` files are committed, and they hold variable names and public values only.
- Production secrets are set on the Cloudflare Workers with `wrangler secret put`.
- This repository is public. If a secret is committed by mistake, rotate it; removing it in a later commit is not enough.

## Code Style
- Follow the existing code style.
- Write clear, concise commit messages in English.
- Ensure all documentation is written in English.
