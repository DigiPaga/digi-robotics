import React from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { StatsTicker } from '@/components/StatsTicker';
import { ProtocolPillars } from '@/components/ProtocolPillars';
import { DatasetCard } from '@/components/DatasetCard';
import { LiveActivityFeed } from '@/components/LiveActivityFeed';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#171b25]">
      <Navbar />
      
      <div className="pt-20">
        <HeroSection />
        <StatsTicker />
        <ProtocolPillars />
        
        {/* Marketplace Preview Section */}
        <section id="marketplace" className="py-32 px-6 border-t border-[oklch(0.98_0.01_260/0.08)]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-[oklch(0.82_0.21_130)]">03 / MARKETPLACE</span>
                <h2 className="font-brand text-4xl md:text-5xl font-bold uppercase mt-4 leading-tight">
                  Curated <span className="text-[oklch(0.82_0.21_130)]">Egocentric Data</span>
                </h2>
              </div>
              <LiveActivityFeed />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <DatasetCard name="Rescue Ops Manual" type="PDF" quality={98} price="0.50" />
              <DatasetCard name="Hazmat Handling POV" type="VIDEO" quality={95} price="2.00" />
              <DatasetCard name="Assembly Line Telemetry" type="DATASET" quality={99} price="1.50" />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-[oklch(0.98_0.01_260/0.08)] text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[oklch(0.5_0.13_148)]">
            Built for the Arbitrum Open House Singapore Buildathon 2026
          </p>
        </footer>
      </div>
    </main>
  );
}
