import React from 'react';

interface MarqueeProps {
  items: string[];
  speed?: number;
  separator?: string;
}

function MarqueeItem({ item, separator }: { item: string; separator: string }) {
  return (
    <span
      className="whitespace-nowrap px-6 text-[13px] font-semibold tracking-[0.14em] uppercase"
      style={{ color: 'rgba(255,255,255,0.5)' }}
    >
      {item} <span style={{ color: 'var(--accent)', marginLeft: 24 }}>{separator}</span>
    </span>
  );
}

export default function Marquee({ items, speed = 30, separator = '/' }: MarqueeProps) {
  // Render items 4x so at any translateX(-50%) point, 2 copies still fill the viewport
  // (prevents the blank gap when one copy of items is narrower than the screen).
  const copies = [0, 1, 2, 3];
  return (
    <div
      className="overflow-hidden border-y border-[var(--border-solid)]"
      style={{ padding: '14px 0', background: '#000' }}
    >
      <div
        className="flex w-max hover:[animation-play-state:paused]"
        style={{ animation: `marquee-scroll ${speed}s linear infinite` }}
      >
        {copies.map((c) =>
          items.map((item, i) => (
            <MarqueeItem key={`${c}-${i}`} item={item} separator={separator} />
          ))
        )}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
