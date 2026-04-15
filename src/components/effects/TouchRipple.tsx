import React, { useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function TouchRipple() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;

    const CHARS = '@#$%&*+=~';
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9991;overflow:hidden;';
    document.body.appendChild(container);

    const onTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      const x = touch.clientX, y = touch.clientY;
      const count = 8;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const span = document.createElement('span');
        span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
        span.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          font-family:monospace;font-size:${12 + Math.random() * 6}px;font-weight:700;
          color:rgba(250,93,41,${0.4 + Math.random() * 0.3});
          pointer-events:none;
          transform:translate(-50%,-50%);
          transition:all 0.7s cubic-bezier(.52,0,0,1);
          will-change:transform,opacity;
        `;
        container.appendChild(span);

        requestAnimationFrame(() => {
          const dist = 40 + Math.random() * 30;
          span.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.3)`;
          span.style.opacity = '0';
        });

        setTimeout(() => span.remove(), 800);
      }
    };

    document.addEventListener('touchstart', onTouch, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouch);
      container.remove();
    };
  }, [isMobile]);

  return null;
}
