import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function SvgDivider({ offset = 0 }: { offset?: number }) {
  const pathRef = useRef<SVGPathElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;
    const path = pathRef.current;
    if (!path) return;

    let raf: number;
    function animate() {
      const t = Date.now() * 0.001;
      let d = 'M0,3';
      for (let x = 0; x <= 1400; x += 10) {
        const y = 3 + Math.sin(x * 0.008 + t + offset) * 2 * Math.sin(x * 0.003 + t * 0.7);
        d += ` L${x},${y.toFixed(2)}`;
      }
      path!.setAttribute('d', d);
      raf = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(raf);
  }, [offset, isMobile]);

  if (isMobile) return null;

  return (
    <div style={{ height: 6, margin: '0 clamp(20px, 4vw, 80px)', overflow: 'visible' }}>
      <svg viewBox="0 0 1400 6" preserveAspectRatio="none" style={{ width: '100%', height: 6, display: 'block' }}>
        <path
          ref={pathRef}
          fill="none"
          stroke="var(--border-solid, rgba(0,0,0,0.1))"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
