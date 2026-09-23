import React from 'react';
import { Button } from './ui/Button';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[80vh] flex flex-col justify-center items-center text-center px-6 py-32 overflow-hidden">
      {/* Subtle grain overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')]"></div>
      
      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-[oklch(0.82_0.21_130)]">
          01 / AUTONOMOUS COMMERCE
        </span>
        
        <h1 className="font-brand text-5xl md:text-7xl font-bold uppercase leading-[0.88] tracking-tight">
          Teaching Robots <br />
          <span className="text-[oklch(0.82_0.21_130)]">Through Human Eyes</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-[oklch(0.75_0.02_260)] text-lg leading-relaxed">
          Capture first-person spatial data. Get paid instantly in USDC by autonomous AI agents. 
          No banks, no borders, no delays.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button variant="primary">Start Earning with Your Robot</Button>
          <Button variant="secondary">Buy Training Data</Button>
        </div>
      </div>
    </section>
  );
};
