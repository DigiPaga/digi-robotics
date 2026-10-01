# DigiRobotics — Pre-submission Audit (2026-10-01)

Scope: the whole repository at `main` (`f009583`) plus the open branch `feat/musdg-eip3009` (PR #4, 42 commits).
Measured against the Arbitrum Open House Singapore Buildathon rules (`hackahton-info.md`).
Submission closes **2026-10-04 23:59**.

Judging criteria: (1) Smart Contract Quality, (2) Product-Market Fit, (3) Innovation, (4) Real Problem Solving.
Hard requirement: **deployed on an Arbitrum chain**. One Overall prize is reserved for Robinhood Chain and one for Arbitrum.

---

## 1. Verdict

The x402 agent runtime (`x402-server/src/agent`, `src/x402`, `routes/agentDemo.ts`) is genuinely good engineering: real x402 v2, EIP-3009 payments, spending policy, idempotency, settlement checks and SSE.
The web build, lint and tests are green.

**On `main`, however, the project would score poorly on criterion 1 and is at risk on the deployment requirement:**

| # | Problem | Why it matters for judging |
|---|---|---|
| P0-1 | The live x402 demo defaults to **Base Sepolia (eip155:84532)**, not Arbitrum (`x402-server/src/config/env.ts:15-26`, `agent/x402Buyer.ts:33`, `routes/agentDemo.ts:181`). README claims Arbitrum Sepolia + Robinhood. | Deployment requirement and credibility |
| P0-2 | Deployed `RoboticsMarketplace` on both chains is bound to an unusable token. On 421614 it is `0x75faF114eAfb1bDbE4F43213fE49d7C47Aa714b3` (not Circle USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`). On 46630 it is `0x…0001` (the ecrecover precompile). `paymentToken` is immutable. | Contracts on-chain cannot perform their core function |
| P0-3 | Deployed `AgentRegistry` (`0x7Fdf…4331`) lets anyone re-register any agent address and overwrite its owner. The deployed bytecode predates the duplicate check in HEAD. | Security finding a judge can reproduce in one call |
| P0-4 | x402 `payTo` / `AGENT_ALLOWED_PAY_TO` is `0x7Fdf…4331`, i.e. the **AgentRegistry contract** (`x402-server/.env.example:34,46`, `tests/fixtures.ts:4`, runbook). Funds sent there on Arbitrum are locked forever. On Base nobody holds its key. | Loss of funds; looks careless |
| P0-5 | README labels the only deployed contracts "Legacy and Prototype". It shows **no contract addresses**, no live demo URL and no video. It lists `AssetVault` as deployed (it is a 7-line stub that was never deployed). | Judges cannot find or verify any on-chain work |
| P0-6 | Web checkout is stuck on `main`: 421614 is mapped to "USDC" (wrong address), and the app's own `/usdg/i` guard rejects it (`web/src/lib/stablecoinConfig.ts:10-15`, `network-utils.ts:31-33`). | The human rail does not work |

**PR #4 fixes most of P0-1, P0-4 and P0-6, plus much of the contracts story. Landing it, deploying it and documenting the deployment is the single highest-leverage task left.**

---

## 2. PR #4 (`feat/musdg-eip3009`) status

Verified locally in a worktree:

- Contracts: **97/97 tests pass** (solc 0.8.24, Cancun).
- x402-server: `typecheck` and `lint` are clean; tests pass 41 / skip 1.

What it brings:

- **`tokens/ERC3009.sol` + `MockUSDG`.** EIP-3009 (`transferWithAuthorization`, `receiveWithAuthorization`, `cancelAuthorization`), EIP-2612 permit, and ERC-1271 via `SignatureChecker`. High-s, window-boundary and ERC-1271 tests are included.
- **A real `X402Facilitator`.**
  - OZ `Ownable2Step` + `ReentrancyGuardTransient`.
  - Settler allowlist, with the settler role revoked on ownership change.
  - Payee sanity checks and a balance-delta check.
  - A `PaymentSettled(resourceId, …)` attribution event, with NatSpec that honestly documents the bypass path.
  - Good quality.
- **`DeployX402.s.sol`.** Requires a separate `X402_SETTLER` on testnets and writes `contracts/deployments/`.
- **x402-server.**
  - `REAL_MUSDG_X402` mode on `eip155:421614` / `eip155:46630`.
  - An in-process facilitator (`src/x402/localFacilitator.ts`, `settlementContractScheme.ts`).
  - A per-network chain registry with explorer URLs (`src/x402/chains.ts`).
  - Rate limiting on the paid route.
  - A nonce-managed facilitator signer.
  - An Anvil end-to-end test running in CI.
- **web.** mUSDG instead of USDC on 421614, and the Robinhood RPC/explorer fixed to `rpc.testnet.chain.robinhood.com` / `explorer.testnet.chain.robinhood.com`.

Gaps still present on PR #4:

- `X402_MODE` still defaults to `REAL_X402_TEST_ASSET` on `eip155:84532` (`x402-server/src/config/env.ts:15-17`). **Flip the default to `REAL_MUSDG_X402` + `eip155:421614`.** Keep Base only as an explicit opt-in, or delete it.
- Nothing is deployed yet: `contracts/deployments/` holds only `.gitkeep`.
- The runbook, `deployment/README.md`, `docs/testing.md`, `docs/architecture-and-walkthrough.md`, `tests/fixtures.ts`, `policy.test.ts` and `live-x402.test.ts` still describe Base Sepolia.
- `TEST_SELLER` / `.env.example` payTo is still the AgentRegistry address. Use a dedicated treasury EOA, and in `loadEnv` assert `getCode(payTo)` is empty unless the address is explicitly allowlisted.
- The process serves one network at a time. A single 402 that offers **both** rails (`accepts: [421614, 46630]`) would be a stronger story for both reserved prizes.

---

## 3. Smart contracts (`contracts/`)

`main`: build OK and 37/37 tests pass.

| Metric | Value |
|---|---|
| Line coverage | 71% |
| **Branch coverage** | **18%** |
| Fuzz tests | 2 (trivial) |
| Invariant tests | 0 (README claims "fuzzing and invariant testing") |

### Findings on `main`

| Sev | Location | Issue | Fix |
|---|---|---|---|
| Critical | deployed `AgentRegistry` (both chains); `AgentRegistryV2.sol:17-39` | No duplicate-registration check in the deployed code or in V2. Nothing proves the caller controls `agentAddress`. V2 also overwrites `_agentOwners`. | Revert if registered. Require `msg.sender == agent` or an EIP-712 / ERC-1271 proof. Redeploy. |
| Critical | `script/Deploy.s.sol:15-16`, `script/DeployRobinhood.s.sol:13` | Hallucinated USDC address (`…14b3`) and `0x…01` baked into immutable `paymentToken`. This breaks the repo's own AGENTS.md rule ("never hallucinate contract addresses"). | Read token addresses from env. Guard with `block.chainid` and `token.code.length > 0`. Redeploy. |
| High | `X402Facilitator.sol` (main) | Stub: anyone can call it, it ignores the signature, moves no funds, and only emits `PaymentSettled`. | Replaced by PR #4 |
| High | `MockUSDG.sol` (main) | Plain ERC-20 with no EIP-3009, although README advertises EIP-3009. | Replaced by PR #4 |
| High | `RoboticsMarketplace*.sol` `purchaseWithAgent` | "Agent-verified purchase" checks only that some address is registered. The buyer passes any registered address. | Bind to `msg.sender` / EIP-3009 `from`, or to an ERC-8004 agent wallet |
| High | `x402-server/src/contracts/abi.ts:64-91`, `marketplace.ts:10-11` | ABI targets V2 (`getAsset`, `totalAssets`), but V1 is what is deployed. Calls revert and the error is swallowed. | Generate ABIs from `out/`. Delete the dead TS contract layer. |
| Medium | `RoboticsMarketplaceV2.sol:71-78` | CEI regression: `isSold` is written after external calls. No reentrancy guard. | State first, then `nonReentrant` |
| Medium | `libraries/SafeTransfer.sol` | No contract-existence check, so with a misconfigured token (exactly what was deployed) purchases "succeed" for free. | Use OZ `SafeERC20` (already vendored) |
| Medium | `RoboticsMarketplaceV2.sol:35-40,89-100` | Constructor fee is not capped (above 10000 underflows); zero addresses are not checked; fee changes are instant. | Validate; snapshot the fee per listing |
| Medium | `utils/Pausable.sol` | Hand-rolled ownership is fixed forever, emits a non-standard `OwnershipTransferred`, and clashes with the agent-level `transferOwnership` in RegistryV2. | OZ `Ownable2Step` + `Pausable` |
| Medium | deployed vs HEAD | Deployed bytecode ≠ current source: different sizes, and the broadcast commits are not in history. It cannot be source-verified. Fixes 97c3015 / 30b7550 are V2-only and V2 was never deployed. | Redeploy from a tagged commit and verify |
| Medium | `test/GasSnapshot.t.sol:34,40,51` | `vm.snapshotGasLastCall` is called before the measured call, so it records setup/approve gas. | `vm.startSnapshotGas` / `stopSnapshotGas` |
| Low | all | `require` strings instead of custom errors; floating pragma; NatSpec only on V1; "V2" is not upgradeable (just copies); `AssetVault` / `IMarketplace` are dead; `test_VerifyAgent` asserts nothing | Consolidate (see §8) |
| Low | `foundry.toml` `[etherscan]` | Deprecated Arbiscan V1 API URL; no Robinhood Blockscout verifier; `VerifyContracts.s.sol` is a placeholder | `arbitrum_sepolia = { key = "${ETHERSCAN_API_KEY}", chain = 421614 }`; `--verifier blockscout` for 46630 |
| **Ops** | git history, commit `f6b4ab8` | **An Alchemy Arbitrum Sepolia API key is still in history.** | **Rotate the key now** |

### ERC-8004

`AgentRegistry` is address-keyed and has no NFT, no `agentURI` / registration file, no `agentWallet` proof, and no reputation or validation registries.
Calling it "ERC-8004" overstates it. Two options:

- **(a)** Integrate the official ERC-8004 reference registries if they are deployed on 421614 / 46630.
  - Get the addresses from the `erc-8004/erc-8004-contracts` README and verify them on the explorer; do not copy addresses from this report.
  - Have the buyer agent register once and post `giveFeedback` with the x402 tx hash as proof of payment.
- **(b)** Rename it to "agent allowlist" in the docs.

Option (a) is cheap and scores on Innovation.

### Deployment inventory

From `contracts/broadcast/**/run-latest.json`; deployer `0xB282…F5f1`.

| Chain | Contract | Address | Usable? |
|---|---|---|---|
| 421614 | AgentRegistry (pre-dup-check) | `0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331` | Hijackable |
| 421614 | RoboticsMarketplace V1 | `0xFd6F3e01c60870a8978665fF2EE872861590bEc3` | No (bad token) |
| 421614 | MockUSDG (plain ERC-20) | `0x39271d08C111912B1F32465745f3123a878C83Bb` (docs only; broadcast not committed) | Checkout only, no EIP-3009 |
| 46630 | AgentRegistry | `0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331` | Hijackable |
| 46630 | RoboticsMarketplace V1 | `0xFd6F3e01c60870a8978665fF2EE872861590bEc3` | No (token `0x…01`) |

The same deployer key is also the x402 test buyer and the store wallet (`web/docs/ECOMMERCE_SETUP.md:28`, `x402-server/src/tests/fixtures.ts:3`). Split it into deployer / facilitator-settler / agent-buyer / treasury keys.

---

## 4. x402-server

On `main`, `npm test` passes (14/14, 1 skipped), and `typecheck` and `lint` are green. **The green result is misleading:** `tsconfig.json:16-28` and the lint script whitelist only the new agent-demo files.
Compiling all of `src/**` gives **60 syntax errors**: template literals were stripped, e.g. `as ;` and `const url = ;`. They are in:

- `routes/verify.ts`, `routes/assets.ts`
- `contracts/marketplace.ts`, `contracts/agentRegistry.ts`
- `facilitator/arbitrum.ts`, `facilitator/robinhood.ts`
- `utils/ipfs.ts`

### Dead or fake code a judge will read

Delete it; git history keeps it.

| Path | State |
|---|---|
| `src/integrations/*.ts` (20 files: stripe, twilio, openai, anthropic, chainlink, …) | Each file contains only the literal `$content` |
| `src/index.ts`, `routes/{assets,bounties,catalog,hardware,purchase,submissions,verify}.ts` | Legacy entry point; mocks ("settlement simulated", random quality scores); does not compile |
| `src/agents/*` | Fake orchestrator / "B2B outreach to Tesla, Figure" that only logs |
| `src/facilitator/{arbitrum,robinhood}.ts` | Do not parse; "settle" by sending 0 ETH to the buyer |
| `src/middleware/x402.ts`, `utils/{signature,nonceManager,ipfs,arbitrum-gas,logger}.ts`, `services/*`, `contracts/*`, `config/{index,networks}.ts`, `types/{index,data-flows}.ts` | Used only by legacy code; broken or misleading |
| `tests/*.ts`, `vitest.config.ts` | vitest is not installed; tests target the legacy server |
| `Makefile`, `docker-compose.yml`, `x402-server/x402-server/Dockerfile`, `x402-server/web/Dockerfile` | All broken: literal `\t` in the Makefile, wrong compose contexts, `dist/index.js` vs `dist/server.js`, `next.config.js` vs `.ts` |

**Keep:** `src/agent/*`, `src/x402/*`, `routes/agentDemo.ts`, `data/*`, `config/env.ts`, `utils/redact.ts`, `app.ts`, `server.ts`, `src/tests/*`, and `telegramBot.ts` (with the hardening below).
After deleting the rest, widen `tsconfig` `include` to `src/**/*.ts` and lint all of `src/`, so that green CI is honest.

### Other findings

| Sev | Location | Issue | Fix |
|---|---|---|---|
| Medium | `utils/redact.ts:15-18`, `routes/agentDemo.ts:184` | viem error messages include `URL: <rpc>`. Alchemy/QuickNode keys in the path leak through unauthenticated `GET /agent-demo/runs/:id` and SSE. | Use `BaseError.shortMessage`; redact `https?://\S+` |
| Medium | `routes/agentDemo.ts:57-89`, `app.ts:10` | `POST /agent-demo/runs` spends the hot wallet with no auth, `cors({origin:true})` and no helmet. SSE is never closed at terminal state. | Rate limit + optional demo token; end the stream on `unlocked` / `failed` |
| Medium | `.env.example:43-44`, `agent/runStore.ts:74-81` | The budget allows exactly **one payment per process lifetime** and the reservation is never released. The second demo for a judge fails with `POLICY_REJECTED`. | Rolling window; release on pre-sign failure |
| Medium | `routes/agentDemo.ts:169-172` | Settlement check is a strict balance delta, which breaks with concurrent runs (default 3). It never parses the `Transfer` log. | `parseEventLogs` on the receipt: asset / from / to / value |
| Medium | `telegramBot.ts:82,47-59` | Uncaught `bot.launch()` rejection kills the API. Download status is not checked. Files are never deleted. Raw egocentric video is pinned unencrypted to public IPFS (privacy). It promises payouts that don't exist. | Catch, clean up, encrypt or keep private, soften the copy |
| Low | `x402/resourceServer.ts:39` | `resource.url` is the literal `…/datasets/:id/content` | Let core derive it; `app.set("trust proxy", 1)` |
| Low | `app.ts:10` | CORS has no `exposedHeaders`, so browser x402 clients can't read `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE` | Expose them |
| Low | `data/protectedDatasetContent.ts:28` | HMAC secret is `randomBytes` per process, so links die on restart | `ACCESS_LINK_SECRET` env |
| Low | `data/protectedDatasetContent.ts:13-26` | The "dataset" unlocked is a manifest with a `private://` ref; nothing real is delivered | Serve a real (small) sample clip / manifest from storage |
| Low | `discovery.ts:36` | One malformed Bazaar entry drops all results | try/catch per item |

---

## 5. Web (`web/`)

`tsc`, `lint`, `vitest` (97 tests) and `next build` all pass on `main`, and the build needs no env vars.

| Sev | Location | Issue | Fix |
|---|---|---|---|
| Critical | `src/lib/stablecoinConfig.ts:10-15` | Checkout is permanently paused on `main` (USDC vs the `/usdg/i` guard; no faucet) | Fixed in PR #4 |
| Critical | `src/lib/agent-demo-client.ts:83`, `AgentDemoConsole.tsx:303-308` | The agent demo is disabled for the documented backend config (Base). The production default backend is `http://localhost:3001` (mixed content). | Deploy x402-server publicly; set `NEXT_PUBLIC_X402_BACKEND_URL`; use PR #4's Arbitrum mode |
| Critical | `src/app/api/orders/route.ts:27,73-76` | Orders are written to `data/orders.json`, but Vercel's FS is read-only, so a paid order returns 400 after payment. PII is stored in plaintext. | Upstash / Vercel KV (`SET order:{tx} NX`) or derive from `Transfer` logs |
| High | `src/app/api/orders/route.ts:94-101` | Server never checks that `paymentAddress` is the Kernel account of `walletAddress`, so anyone can claim someone else's payment by tx hash | Recompute the counterfactual Kernel address server-side, or verify via ERC-1271 / 6492 |
| High | `components/auth/AuthFlowProvider.tsx:33-36` | Every login `router.push("/getting-started")`, which kicks the user out of checkout | `redirectTo` option; connected state in the navbar |
| High | UI-wide | No contract address or explorer link anywhere. `/agent-demo` isn't linked from the navbar, footer, landing page or sitemap. | "On-chain proof" section / `/proof` page; hero CTA to the demo |
| Medium | `components/ui/Reveal.tsx:11`, `HeroSection.tsx:189-199` | Hero `h1` is server-rendered with `opacity:0` (bad LCP / no-JS) | Don't animate above the fold |
| Medium | `api/subscribe`, `api/data-requests` | No rate limit or honeypot; Kit custom field is POSTed on every request | Rate limit, honeypot, zod |
| Medium | `next.config.ts` | No security headers or CSP | Add headers |
| Medium | `lib/orders.ts:21-22` | Order-history signature has no nonce or expiry, so it can be replayed forever | Add issued-at + TTL or SIWE |
| Low | `package.json` | Unused deps: `@x402/*` (incl. 14 MB `@x402/svm`), `react-hook-form`, `@hookform/resolvers`. Dead `lib/zerodev/*`, `lib/thirdweb-config.ts`. `ThirdwebProvider` in the root layout adds ~240 KB gzip to blog pages. | Prune; scope the provider |
| Low | `Footer.tsx:130,141`, `MarketplaceSection.tsx:254-258` | Privacy / Terms and marketplace CTAs are placeholder anchors | Real targets or remove |

---

## 6. Claims vs reality

Fix these before a judge notices. Each claim should be either removed or backed by a link.

| Claim | Where | Reality |
|---|---|---|
| x402 settles on Robinhood + Arbitrum Sepolia | README:21,30,82,266,577 | `main`: Base Sepolia only. PR #4 adds Arbitrum / Robinhood but nothing is deployed yet. |
| "Human mUSDG checkout ✅" | README:572 | Broken on `main` |
| AssetVault "escrow, deployed" | README:338 | 7-line stub, never deployed |
| ERC-8004 | README, AGENTS.md | Address allowlist, not ERC-8004 |
| Fuzzing + invariant tests | README:122,535 | 2 trivial fuzz tests, 0 invariants |
| Wagmi v2, QuickNode, Dune, Pinata (web), Prisma, Stylus | README tech table, deck, `docs/architecture.md` | Not used (Pinata only in the Telegram bot) |
| ERC-4337 **session keys** | README:306,324 | Kernel account + paymaster only; `web/docs/ZERODEV_PHASE2.md` says session keys are not active |
| "Shared types" | README:121 | Types are duplicated in web and server |
| "Overall Score 95/100" | `docs/ETHSKILLS_CHECKLIST.md:25` | Self-awarded; checklist items are false for deployed V1 |
| Telegram ingestion ✅, campaign discovery ✅, USDG/PYUSD payouts | README:107-110, hero | Prototype / not implemented |
| Deck: "earn USDC", "passive yield", "98% of users", six `[Insert: …]` placeholders, `href="#"` CTAs | `pitch-deck/index.html` | Contradicts the site and the project's own blog; unsourced |

---

## 7. Repo, docs and CI

### Junk and duplication (safe to remove)

- Empty files: `main`, `contracts/react`.
- Root `lib/{forge-std,openzeppelin-contracts}` submodules duplicate `contracts/lib/*`. Remove them from `.gitmodules` and from `contracts/foundry.lock` (`../lib/*` entries).
- Tracked `contracts/cache/**` (27 files) and `contracts/broadcast/**/31337/**`. Keep only the testnet `run-latest.json` files.
  - Suggested `.gitignore`: `contracts/cache/`, `contracts/out/`, `contracts/broadcast/**/31337/`, `contracts/broadcast/**/run-[0-9]*.json`.
  - Today the root `.gitignore` also blocks committing **new** testnet broadcasts, which is why the MockUSDG broadcast is missing.
- Unused files: `prisma/schema.prisma`, `contracts/deployments-local.json` (wrong deployer), `contracts/cache/test-failures`, `pitch-deck/assets/` (duplicate 420 KB logo).
- Fake scripts that print success without doing anything: `scripts/{audit-slither,generate-types,monitor-contracts,seed-test-data,verify-deployment,test-local}.sh`.
- Scripts that don't parse or are dead: `scripts/{seed-catalog,create-test-assets}.ts`.
- `scripts/deploy-arbitrum-robust.sh` deploys the broken V1 script.
- Root `.env.example` is a single line of literal `\n`.
- Docs that are stale or describe unmounted endpoints: `docs/{API,AGENT_DISCOVERY,api-testing-guide,deployment-runbook,ETHSKILLS_CHECKLIST,VISUAL_MODEL_DEPLOYMENT,FAQ_AI_OPTIMIZED}.md` and `docs/diagrams/*`.
- One-line literal-`\n` stubs: `docs/{architecture,agent-integration,pitch,x402-flow}.md`.
- Case collision `docs/ARCHITECTURE.md` vs `docs/architecture.md`.
- Duplicate `CONTRIBUTING.md` and duplicate `llms.txt` / `web/public/ai/llm.txt`. `llms.txt` has an unclosed code fence and a broken link.
- `hackahton-info.md`: misspelled filename, and it links `DigiPaga/digi-agent-arbitrum` instead of `DigiPaga/digi-robotics`.

### Inconsistent configuration

- Robinhood RPC: `rpc.testnet.chain.robinhood.com` (used by the successful deployment) vs `sepolia.rpc.robinhood.com` (`web/.env.example`, `web/docs/ROBINHOOD_CHAIN_SETUP.md`, `x402-server/.env.example:53`). The explorer also differs. PR #4 fixes web.
- Env var names: `ARBITRUM_SEPOLIA_RPC` vs `ARBITRUM_SEPOLIA_RPC_URL`; `ARBISCAN_API_KEY` vs `ETHERSCAN_API_KEY`.
- Domains: `digirobotics.xyz` vs `digirobotics.com` vs `api.digipaga.com`.
- `deployment/README.md:38` gates the release on `eip155:84532`.

### CI (`.github/workflows/ci.yml`)

- Node `'20'` is EOL. Use `node-version-file: .nvmrc` and bump it to 22.
- Use `submodules: true` instead of `recursive`; recursive clones OZ twice plus OZ's nested submodules.
- x402-server job: add `typecheck`, `lint` and `build`, which are already green.
- contracts job: add `forge fmt --check` (after one `forge fmt`), `forge build --sizes`, and a pinned Foundry version.
- Add `permissions: contents: read`, a `concurrency` group and `paths` filters.
- `arbitrum-fork-test.yml` matches a non-existent `ForkTest`, and its env name doesn't match `foundry.toml`. Either delete it, or add `test/fork/Deployed.fork.t.sol` that asserts code and wiring at the README addresses on 421614 and 46630. That second option is cheap, judge-facing evidence.

### README gaps for submission

The README is missing all of the following:

- deployed addresses with explorer links per chain
- live demo URL
- demo video
- a 2-minute "try it" path
- an honest real-vs-planned table with tx-hash evidence
- the GitHub repo homepage and description; the description currently reads "Repository for the Arbitrum Singapore Hacker House"

---

## 8. Plan for the remaining 3 days

Do **not** restructure into workspaces before the deadline: it breaks every path, the Vercel and CI config, and the open PR, for zero judging value.

### Day 1 — Oct 2: make it real on Arbitrum

1. **Rotate the leaked Alchemy key.**
2. Fix PR #4's remaining gaps and merge it:
   - default `REAL_MUSDG_X402` + `eip155:421614`;
   - treasury EOA as `payTo`;
   - purge 84532 from docs and fixtures.
3. Create fresh, separate keys: deployer, settler, agent buyer, treasury.
4. Deploy and verify on **421614 and 46630**: MockUSDG (EIP-3009) and X402Facilitator. Verify on Arbiscan via the Etherscan V2 API, and on Robinhood via Blockscout. Commit `contracts/deployments/*.json` and the testnet `run-latest.json` files.
5. Deploy x402-server as one persistent process (Railway, Render or Fly; not serverless). Set `X402_RESOURCE_BASE_URL`, `AGENT_ALLOWED_HOSTS` and the web `NEXT_PUBLIC_X402_BACKEND_URL`.
6. Run one paid agent purchase on each chain and record both tx hashes.

### Day 2 — Oct 3: contract quality and cleanup

1. Contracts:
   - Retire V1/V2 `RoboticsMarketplace`, `AgentRegistry*`, `AssetVault`, `IMarketplace`, custom `SafeTransfer` and `Pausable`. Move them to `contracts/legacy/`, or delete them.
   - The core set becomes **MockUSDG (ERC-3009) + X402Facilitator**, optionally plus ERC-8004 integration (§3).
   - If time allows, turn the facilitator's `resourceId` into a license record (`hasAccess[resourceId][payer]`). The resource server then unlocks only after reading it on-chain, which makes the contract load-bearing in the x402 flow.
2. Tests:
   - Add handler-based **invariant tests**, for example: an authorization nonce is never reused; `PaymentSettled` implies the payee balance grew by the amount; the facilitator never holds funds.
   - Add a fork test against the deployed addresses.
   - Fix the gas snapshot test.
   - Report `forge coverage`.
3. One cleanup PR: everything in §4 "dead code" and §7 "junk".
4. Widen the x402-server `tsconfig` / lint.
5. CI fixes from §7.
6. Quick hardening:
   - x402-server: redact URLs in errors, a rolling spend budget, close SSE at the end, `Transfer`-log settlement check.
   - web: orders in KV, Kernel-address binding, no login redirect away from checkout.

### Day 3 — Oct 4 (deadline 23:59): story and evidence

1. README rewrite, top-down:
   - one-line pitch
   - live demo, video and deck links
   - "Try it in 2 minutes"
   - **Deployed & verified contracts** table per chain, with explorer links and the demo tx hashes
   - architecture
   - honest status table
   - local dev
2. Remove the unsupported claims (§6).
3. Web: an "On-chain proof" section, `/agent-demo` linked from the hero and navbar, and the sitemap.
4. Record a 90-second demo video: 402 → sign → settle on Arbiscan → unlock; then Robinhood; then human checkout.
5. Clean up the pitch deck: no placeholders, live links, consistent token naming (mUSDG on testnet, USDG/PYUSD as the mainnet plan).
6. HackQuest submission form; set the GitHub homepage and topics.

### Stretch (only if Days 1-3 are done)

- A single 402 offering both rails (`accepts: [421614, 46630]`).
- ERC-8004 reputation feedback with the x402 tx as proof of payment.
- A small Stylus (Rust) component, e.g. a dataset-manifest Merkle verifier called from Solidity. It shows Arbitrum-native innovation.

### After the hackathon

- pnpm workspace with:
  - `apps/web`, `apps/x402-server`
  - `packages/contracts`
  - `packages/shared`: chain registry, ABIs and addresses generated from deployments, and the run/event types currently duplicated in web and server
- Durable storage for runs and orders.
- Multisig ownership.
- Slither and coverage gates in CI.

---

## 9. What could not be verified from the audit sandbox

The sandbox proxy blocked RPCs, explorers and x402.org, so the following still need checking:

- On-chain bytecode at the listed addresses (`cast code <addr> --rpc-url …`).
- The facilitator `/supported` list.
- The official Robinhood testnet RPC and explorer hosts.
- The Paxos USDG / PYUSD addresses in `x402-server/.env.example:17-20`.
- The ERC-8004 reference deployments.

Confirm each before putting it in the README.
