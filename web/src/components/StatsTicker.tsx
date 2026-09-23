import React from 'react';

export const StatsTicker: React.FC = () => {
  return (
    <div className="w-full border-y border-[oklch(0.98_0.01_260/0.08)] bg-[#161c29]/40 backdrop-blur-md py-4">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-6">
        <div className="flex flex-col">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-[oklch(0.75_0.02_260)]">Active Contributors</span>
          <span className="font-brand text-2xl font-bold text-[oklch(0.82_0.21_130)]">1,247</span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-[oklch(0.75_0.02_260)]">Datasets Available</span>
          <span className="font-brand text-2xl font-bold text-[oklch(0.82_0.21_130)]">892</span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-[oklch(0.75_0.02_260)]">Total Paid in USDC</span>
          <span className="font-brand text-2xl font-bold text-[oklch(0.82_0.21_130)]">$234,567</span>
        </div>
     6</div>
  );
};
