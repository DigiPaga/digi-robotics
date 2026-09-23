import React from 'react';
import { Button } from './ui/Button';

export const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[oklch(0.98_0.01_260/0.08)] bg-[#171b25]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[oklch(0.82_0.21_130)] flex items-center justify-center">
            <span className="text-[#171b25] font-bold text-sm">D</span>
          </div>
          <span className="font-brand text-xl font-bold uppercase tracking-tight">DigiRobotics</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#protocol" className="font-mono text-xs uppercase tracking-widest text-[oklch(0.75_0.02_260)] hover:text-[oklch(0.82_0.21_130)] transition-colors">Protocol</a>
          <a href="#marketplace" className="font-mono text-xs uppercase tracking-widest text-[oklch(0.75_0.02_260)] hover:text-[oklch(0.82_0.21_130)] transition-colors">Marketplace</a>
          <a href="#docs" className="font-mono text-xs uppercase tracking-widest text-[oklch(0.75_0.02_260)] hover:text-[oklch(0.82_0.21_130)] transition-colors">Docs</a>
        </div>

        <Button variant="primary" className="px-5 py-2 text-sm">Connect Agent</Button>
      </div>
    </nav>
  );
};
