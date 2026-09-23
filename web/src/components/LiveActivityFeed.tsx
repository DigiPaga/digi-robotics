import React from 'react';

const activities = [
  { time: '14:02:11', agent: '0x4a...9f2b', action: 'purchased', asset: 'Cooking POV Dataset', price: '0.50 USDC' },
  { time: '14:01:45', agent: '0x8c...1a3d', action: 'verified', asset: 'Hazmat Handling Clip #402', price: '0.15 USDC' },
  { time: '13:58:22', agent: '0x2f...7e8a', action: 'uploaded', asset: 'Assembly Line Telemetry', price: '2.00 USDC' },
];

export const LiveActivityFeed: React.FC = () => {
  return (
    <div className="p-6 rounded-xl bg-[#161c29]/40 border border-[oklch(0.98_0.01_260/0.08)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-[oklch(0.82_0.21_130)] animate-pulse"></div>
        <span className="font-mono text-xs uppercase tracking-widest text-[oklch(0.75_0.02_260)]">Live Network Activity</span>
      </div>
      
      <div className="space-y-3">
        {activities.map((act, i) => (
          <div key={i} className="flex items-center gap-3 text-sm font-mono border-b border-[oklch(0.98_0.01_260/0.05)] pb-2 last:border-0">
            <span className="text-[oklch(0.5_0.13_148)] text-xs">{act.time}</span>
            <span className="text-[oklch(0.75_0.02_260)]">Agent {act.agent}</span>
            <span className="text-[oklch(0.75_0.02_260)]">{act.action}</span>
            <span className="text-[oklch(0.98_0.005_140)] font-semibold">{act.asset}</span>
            <span className="text-[oklch(0.82_0.21_130)] ml-auto">{act.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
