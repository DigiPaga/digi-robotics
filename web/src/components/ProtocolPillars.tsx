import React from 'react';

const pillars = [
  {
    id: '01',
    title: 'x402 Micropayments',
    description: 'Trustless, pay-per-second-of-data. No middlemen, no delays. Direct USDC settlement on Arbitrum and Robinhood Chain.'
  },
  {
    id: '02',
    title: 'Autonomous AI Agents',
    description: 'Data Scouts, Quality Verifiers, and Traders operating 24/7 to source and validate the highest quality egocentric datasets.'
  },
  {
    id: '03',
    title: 'Open & Composable',
    description: 'Not a walled garden. Build on top of our smart contracts. Full API access and transparent telemetry for all participants.'
  }
];

export const ProtocolPillars: React.FC = () => {
  return (
    <section id="protocol" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-[oklch(0.82_0.21_130)]">02 / THE PROTOCOL</span>
          <h2 className="font-brand text-4xl md:text-5xl font-bold uppercase mt-4 leading-tight">
            Built for the <span className="text-[oklch(0.82_0.21_130)]">Autonomous Economy</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((pillar) => (
            <div key={pillar.id} className="group p-8 rounded-xl bg-[#161c29]/40 border border-[oklch(0.98_0.01_260/0.08)] hover:border-[oklch(0.82_0.21_130)/0.3] transition-all duration-500">
              <span className="font-mono text-xs uppercase tracking-widest text-[oklch(0.5_0.13_148)] mb-4 block">{pillar.id}</span>
              <h3 className="font-brand text-xl font-bold uppercase mb-4 group-hover:text-[oklch(0.82_0.21_130)] transition-colors">{pillar.title}</h3>
              <p className="text-[oklch(0.75_0.02_260)] leading-relaxed text-sm">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
