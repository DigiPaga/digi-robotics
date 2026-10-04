/**
 * All deck copy lives here. Slide layout components (slides.tsx) only render
 * structure — editing a word in the pitch should never touch layout code.
 */

export type Motif = {
  x: "left" | "right";
  y: "top" | "bottom";
  size: number; // vw
  opacity: number;
  rings: number;
};

export type ImageMedia = { src: string; alt: string };

export type StepItem = { label: string; strong: string; body: string };
export type LedgerRow = { label: string; items: string };
export type AdvantageRow = { lead: string; body: string };

export const DECK_META = {
  title: "DigiRobotics — Pitch Deck",
  description:
    "DigiRobotics turns first-person task video into verified datasets for robotics teams and AI agents — the first stablecoin-native marketplace for agentic commerce in real-world data collection.",
  ogImage: "/pitch-deck/slide-01-hero-usdg.jpg",
  totalSlides: 12,
} as const;

export const CTA_LINKS = {
  site: { label: "DigiRobotics.xyz", href: "https://digirobotics.xyz" },
  github: { label: "GitHub", href: "https://github.com/DigiPaga/digi-robotics" },
  demo: { label: "Live agent demo", href: "/agent-demo" },
} as const;

// Speaker notes — the pitch script, verbatim, one entry per slide (index 0 = slide 1).
export const SPEAKER_NOTES: readonly string[] = [
  "DigiRobotics lets anyone train robots with their phone and get paid in stablecoins. You record a real task in first person, a robotics team or an AI agent buys it, and the payment settles on-chain.",
  "There are 5.4 billion smartphones, and most of that attention goes into scrolling. Meanwhile robotics teams are short of exactly one thing: first-person video of people doing real tasks. The people who can record it have no simple way to get paid, and today's data marketplaces are manual, slow and built on fiat rails.",
  "Three pieces. One: an embedded wallet with social login, so a contributor needs no seed phrase. Two: an agent-ready marketplace, where an AI agent can discover a dataset, pay for it over x402 and unlock it with no human in the loop. Three: tokenized knowledge. That last part is on the roadmap: today the demo serves a signed manifest, and licensing and IPFS storage come next.",
  "Robots are shipping; their data isn't. Humanoid funding is at a record high and vision-action models are converging. The missing input is human first-person data at scale.",
  "On the supply side, 1.5 billion people work in the gig economy. On the demand side, robotics R&D is a multi-billion-dollar yearly spend. We start with AI-active users in emerging markets, where an extra stablecoin income matters most.",
  "Our wedge: we are the first marketplace paying for robot training data in stablecoins, with agent-ready buying built in. The moat is distribution and data: DigiAgent is built to source robotics buyers and match them with creators, and every validated capture and repeat buyer makes the next campaign easier.",
  "Traditional data marketplaces are small, manually approved and have no agents. We give instant stablecoin payouts, zero-friction onboarding and native x402 purchasing, for humans and for agents.",
  "This is what exists. For people: social login, embedded wallet, checkout in USDG on testnet. For agents: an HTTP 402 challenge, a signed authorization and on-chain settlement that unlocks the resource. Next: capture through Telegram, quality scoring, storage on IPFS, mainnet payouts.",
  "For a contributor it is three steps: log in, record, get paid.",
  "Oscar leads product and design. I handle deployments and integrations. DigiAgent is our autonomous teammate for research.",
  "Everything on this slide is live. The marketplace and gear shop are at digirobotics.xyz. The x402 purchase settles on-chain on two testnets, Arbitrum Sepolia and Robinhood Chain. We are pre-revenue; Telegram capture and the first paid campaign are next.",
  "Built on Arbitrum and Robinhood Chain, x402 for payments, ZeroDev for accounts, USDG-ready. Let me show you the purchase.",
] as const;

// Reveal-step counts (extra "next" presses before a slide advances). 0 = no gating,
// the slide's content enters together as a staggered reveal. Keyed by slide index (0-based).
export const REVEAL_STEPS: Readonly<Record<number, number>> = {
  2: 2, // slide 3 — solution, 3 numbered points
  5: 3, // slide 6 — wedge + 3 moats
  7: 2, // slide 8 — People / Agents / Next
  10: 1, // slide 11 — built items, then the two "next" items
};

export const slide01 = {
  kicker: ["DigiRobotics"],
  headline: [
    { text: "Train robots with your phone.", lime: false },
    { text: "Get paid in stablecoins.", lime: true },
  ],
  body: "DigiRobotics turns first-person task video into verified datasets for robotics teams and AI agents — the first stablecoin-native marketplace for agentic commerce in real-world data collection.",
  partners: [
    { src: "/digirobotics/partners/arbitrum.png", alt: "Arbitrum", height: 30 },
    { src: "/digirobotics/partners/robinhood-chain.png", alt: "Robinhood Chain", height: 22 },
    { src: "/digirobotics/partners/zerodev.png", alt: "ZeroDev", height: 23 },
  ],
  footnote: "Built at Arbitrum Open House Singapore",
  image: { src: "/pitch-deck/slide-01-hero-usdg.jpg", alt: "Autonomous commerce — capturing robotics training data" } satisfies ImageMedia,
  motif: { x: "right", y: "top", size: 55, opacity: 0.05, rings: 3 } satisfies Motif,
};

export const slide02 = {
  kicker: ["Problem"],
  headline: [
    { text: "5.4 Billion Smartphones.", lime: false },
    { text: "Trapped in Doom-Scrolling.", lime: false },
  ],
  body: "Traditional content creation is saturated. Meanwhile, the global labor force holds the exact first-person data that humanoid robots desperately need to learn. They lack embedded wallets, and traditional data marketplaces are too complex, non-agentic, and riddled with fiat friction.",
  stat: { value: "1.5 Billion", caption: "People in the global gig economy seeking instant, accessible side income." },
  image: { src: "/pitch-deck/slide-02-problem.png", alt: "Problem — doom-scrolling versus robotics training" } satisfies ImageMedia,
  imageSide: "left" as const,
  motif: { x: "left", y: "bottom", size: 50, opacity: 0.05, rings: 2 } satisfies Motif,
};

export const slide03 = {
  kicker: ["Solution"],
  headline: [
    { text: "Tokenizing Audio-Visual Data", lime: false },
    { text: "Through Automated Payments", lime: true },
  ],
  steps: [
    { label: "01", strong: "Automated checkout for humans and agents.", body: "Embedded wallet via ZeroDev. Social login, no seed phrases, instant onboarding anywhere." },
    { label: "02", strong: "Agentic commerce.", body: "We funnel requested, custom data into an agent-ready marketplace. AI agents discover, evaluate, purchase, and unlock approved datasets through x402, 24/7." },
    { label: "03", strong: "Tokenized knowledge.", body: "Dataset licensing and IPFS storage are planned. The current demo uses local JSON records." },
  ] satisfies StepItem[],
  image: { src: "/pitch-deck/slide-03-solution.jpg", alt: "Solution — capture approved, USDG sent" } satisfies ImageMedia,
  motif: { x: "right", y: "bottom", size: 48, opacity: 0.04, rings: 3 } satisfies Motif,
};

export const slide04 = {
  kicker: ["Why Now?"],
  headline: [
    { text: "Robots Are Shipping.", lime: false },
    { text: "Their Data Isn't.", lime: true },
  ],
  eyebrow: "The Physical AI Inflection Point",
  quotes: [
    { quote: "Physical AI represents a $40 to $50 trillion market opportunity. This is bigger than the internet itself.", attribution: "— Jensen Huang, Nvidia CEO (2026)" },
    { quote: "Optimus humanoid robots could make Tesla worth $25 trillion. Humanoid robots will be the biggest product of all time.", attribution: "— Elon Musk, Tesla CEO (2026)" },
  ],
  closingParts: [
    { text: "Humanoid funding is at an all-time high. Vision-action models are converging. The missing input is " },
    { text: "egocentric human data at planetary scale", lime: false, strong: true },
    { text: " — that is the bottleneck we unlock." },
  ],
  image: { src: "/pitch-deck/slide-04-why-now.jpg", alt: "Exponential growth of Physical AI" } satisfies ImageMedia,
  imageSide: "left" as const,
  motif: { x: "left", y: "top", size: 52, opacity: 0.05, rings: 2 } satisfies Motif,
};

export const slide05 = {
  kicker: ["Market Size"],
  headline: [{ text: "A Massive, Underserved Market", lime: false }],
  stats: [
    { tag: "TAM", value: "1.5 Billion", caption: "Global gig economy workers", countTo: 1.5, suffix: " Billion", decimals: 1 },
    { tag: "SAM", value: "$27+ Billion", caption: "Spent every year on robotics R&D to train robots, and growing exponentially", countTo: 27, prefix: "$", suffix: "+ Billion", decimals: 0 },
    { tag: "SOM", value: "220 Million", caption: "Active AI users in initial emerging markets", countTo: 220, suffix: " Million", decimals: 0 },
  ],
  closingParts: [
    { text: "We are not just building a platform. We are unlocking the " },
    { text: "largest untapped data source", lime: true },
    { text: " on the planet." },
  ],
  motif: { x: "right", y: "top", size: 50, opacity: 0.05, rings: 2 } satisfies Motif,
};

export const slide06 = {
  kicker: ["Our Unfair", "Advantage"],
  headline: [{ text: "The Wedge & The Moat", lime: false }],
  rows: [
    { lead: "The Wedge:", body: "First-mover stablecoin marketplace for robotics training data. Campaign capture, embedded-wallet onboarding, x402 agent-ready buying." },
    { lead: "The Moat: Autonomous Distribution (DigiAgent).", body: "Our autonomous CRM is built to source robotics builders and manufacturers and match them with human creators in a self-sustaining flywheel." },
    { lead: "The Moat: Data Network Effects.", body: "Validated footage, contributor quality history, and repeat buyers compound with every campaign." },
    { lead: "The Moat: Multi-Continent Fiat <> Stablecoin Ramps.", body: "Seamless cash-outs; partner coverage confirmed market by market." },
  ] satisfies AdvantageRow[],
  closingLead: "DigiRobotics:",
  closing: "the world's first AI-native marketplace for audio-visual robotics training data, paying creators in stablecoins.",
  image: { src: "/pitch-deck/slide-06-flywheel.jpg", alt: "The DigiAgent flywheel" } satisfies ImageMedia,
  motif: { x: "right", y: "top", size: 50, opacity: 0.04, rings: 2 } satisfies Motif,
};

export const slide07 = {
  kicker: ["Why We Win"],
  headline: [
    { text: "Beyond Fiat.", lime: false },
    { text: "Beyond Legacy", lime: true },
    { text: "Marketplaces.", lime: true },
  ],
  rows: [
    { tone: "neg" as const, mark: "×", text: "Traditional Data Marketplaces: small scale, manual approval, high fiat friction, no AI agents." },
    { tone: "pos" as const, mark: "✓", lead: "DigiRobotics:", text: "global scale, instant stablecoin payouts, zero-friction onboarding, native x402 agentic purchasing. For humans and AI agents. Available for everyone." },
  ],
  tagline: "Your camera is now a money printer. Literally.",
  image: { src: "/pitch-deck/slide-07-why-we-win.jpg", alt: "Capture approved — paid in USDG" } satisfies ImageMedia,
  motif: { x: "right", y: "top", size: 46, opacity: 0.05, rings: 2 } satisfies Motif,
};

export const slide08 = {
  kicker: ["Agents + Product"],
  headline: [
    { text: "DigiAgent: The ", lime: false },
    { text: "24/7", lime: true },
    { text: " Autonomous Matchmaker & Deal Builder", lime: false },
  ],
  body: "Our AI agent doesn't wait for orders. It scouts robotics R&D teams, invites tailored data bounties, onboards them to fund a wallet and budget, and streams requests to our creator community, executing x402 micropayments around the clock. A CRM that never sleeps.",
  ledger: [
    { label: "People", items: "Social login · Embedded wallet · No seed phrases · Gear checkout (USDG)" },
    { label: "Agents", items: "x402 challenge · Signed authorization · On-chain settlement and unlock" },
    { label: "Next", items: "Telegram capture · Quality scoring · IPFS storage · Mainnet payouts" },
  ] satisfies LedgerRow[],
  ctaLabel: "Request Specific Knowledge →",
  ctaNote: "From shoe-sized robots to industrial-grade humanoids. All welcome.",
  image: { src: "/pitch-deck/slide-07-agents.jpg", alt: "DigiAgent — robotics manufacturer, creator matched, validated capture, USDG sent" } satisfies ImageMedia,
  imageSide: "left" as const,
  motif: { x: "left", y: "top", size: 46, opacity: 0.05, rings: 2 } satisfies Motif,
};

export const slide09 = {
  kicker: ["How It", "Works"],
  headline: [
    { text: "Zero Friction. ", lime: false },
    { text: "Three Steps.", lime: true },
  ],
  steps: [
    // Corrected: the product offers Google/email social login only, no MetaMask option.
    { label: "01", strong: "Login", body: "continue with Google or email, instant embedded wallet." },
    { label: "02", strong: "Record", body: "strap phone to chest or head, record a tutorial." },
    { label: "03", strong: "Post & Earn", body: "upload, wait for a buyer, get paid instantly." },
  ] satisfies StepItem[],
  image: { src: "/pitch-deck/slide-08-how-it-works.jpg", alt: "How it works — login, record, earn" } satisfies ImageMedia,
  motif: { x: "right", y: "bottom", size: 50, opacity: 0.05, rings: 3 } satisfies Motif,
};

export const slide10 = {
  kicker: ["Team"],
  headline: [
    { text: "The ", lime: false },
    { text: "Builders", lime: true },
  ],
  rows: [
    { name: "Oscar — Product Design & Development", handle: "@ozkite", lime: false },
    { name: "Otto — Product Deployments & Integrations", handle: "@ottodevs", lime: false },
    { name: "DigiAgent — Research & Technical Assistance", note: "(autonomous AI team member)", handle: "@digiagent", lime: true },
  ],
  hostedAt: "Hosted at",
  hostedLink: "digirobotics.xyz →",
  taglineParts: [
    { text: "We're not building a platform. We're building the " },
    { text: "agentic economy", lime: true },
    { text: ", while tokenizing the data robots need to function." },
  ],
  image: { src: "/pitch-deck/slide-10-team.jpg", alt: "Oscar and Otto — the builders" } satisfies ImageMedia,
  motif: { x: "right", y: "top", size: 52, opacity: 0.05, rings: 2 } satisfies Motif,
};

export const slide11 = {
  kicker: ["Demo Status"],
  headline: [
    { text: "What's ", lime: false },
    { text: "Built.", lime: true },
  ],
  built: [
    "Marketplace and gear shop — live at digirobotics.xyz",
    "Embedded-wallet login (ZeroDev + Thirdweb)",
    "Stablecoin checkout on testnet (mUSDG)",
    "x402 challenge, signature, on-chain settlement, and resource unlock — live on two testnets",
  ],
  next: ["Telegram capture ingestion", "First paid campaign"],
  footnote: "Arbitrum Sepolia · Robinhood Chain Testnet · Pre-Revenue",
  motif: { x: "right", y: "top", size: 50, opacity: 0.04, rings: 2 } satisfies Motif,
};

export const slide12 = {
  kicker: ["The Time Is Now"],
  subheadline: "Robotic Training & Education Economy at Scale",
  ledger: [
    { label: "L2 & Payments", items: [{ text: "Arbitrum · Robinhood Chain · " }, { text: "x402 Protocol", lime: true }, { text: " · USDG-ready (mUSDG on testnet)" }] },
    { label: "Autonomy & Identity", items: [{ text: "ZeroDev (ERC-4337) · ERC-8004 · EIP-712 / EIP-1271" }] },
    { label: "Infrastructure", items: [{ text: "Next.js · Solidity · IPFS/Pinata · QuickNode RPC" }] },
  ],
  image: { src: "/pitch-deck/slide-09-tech.jpg", alt: "DigiRobotics — robotic training and education economy at scale" } satisfies ImageMedia,
  ctas: [
    { label: "DigiRobotics.xyz →", href: CTA_LINKS.site.href, external: true },
    { label: "GitHub →", href: CTA_LINKS.github.href, external: true },
    { label: "Live agent demo →", href: CTA_LINKS.demo.href, external: true },
  ],
  motif: { x: "left", y: "top", size: 46, opacity: 0.05, rings: 2 } satisfies Motif,
};

export const SLIDES = [
  slide01,
  slide02,
  slide03,
  slide04,
  slide05,
  slide06,
  slide07,
  slide08,
  slide09,
  slide10,
  slide11,
  slide12,
] as const;
