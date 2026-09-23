import React from 'react';

interface DatasetCardProps {
  name: string;
  type: string;
  quality: number;
  price: string;
}

export const DatasetCard: React.FC<DatasetCardProps> = ({ name, type, quality, price }) => {
  return (
    <div className="group p-6 rounded-xl bg-[#161c29]/40 border border-[oklch(0.98_0.01_260/0.08)] hover:border-l-2 hover:border-l-[oklch(0.82_0.21_130)] hover:bg-[#161c29]/60 transition-all duration-300 cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <span className="font-mono text-[0.625rem] uppercase tracking-wider px-2 py-1 rounded border border-[oklch(0.98_0.01_260/0.15)] text-[oklch(0.75_0.02_260)]">
          {type}
        </span>
        <span className="font-mono text-xs text-[oklch(0.82_0.21_130)] font-bold">
          {quality}/100
        </span>
      </div>
      
      <h3 className="font-brand text-lg font-bold uppercase mb-2 group-hover:text-[oklch(0.82_0.21_130)] transition-colors">
        {name}
      </h3>
      
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[oklch(0.98_0.01_260/0.08)]">
        <span className="font-mono text-sm text-[oklch(0.75_0.02_260)]">Price</span>
        <span className="font-brand text-xl font-bold text-[oklch(0.82_0.21_130)]">{price} USDC</span>
      </div>
    </div>
  );
};
