import React, { useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function AsciiTrail() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;

    const CHARS = '@#$%&*+=~?/\\|';
    const MAX = 35;
    const pool: HTMLSpanElement[] = [];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9991;overflow:hidden;';
    document.body.appendChild(container);

    let lastX = 0, lastY = 0, frame = 0;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastX = e.clientX;
      lastY = e.clientY;

      if (speed < 8 || frame % 2 !== 0) { frame++; return; }
      frame++;

      const span = document.createElement('span');
      span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
      span.style.cssText = `
        position:absolute;left:${e.clientX}px;top:${e.clientY}px;
        font-family:monospace;font-size:${10 + Math.random() * 8}px;font-weight:700;
        color:rgba(0,0,0,${0.15 + Math.random() * 0.15});
        pointer-events:none;
        transform:translate(-50%,-50%) rotate(${(Math.random() - 0.5) * 40}deg);
        transition:opacity 0.8s,transform 0.8s cubic-bezier(.52,0,0,1);
        will-change:opacity,transform;
      `;
      container.appendChild(span);
      pool.push(span);

      requestAnimationFrame(() => {
        span.style.opacity = '0';
        span.style.transform = `translate(-50%,-50%) rotate(${(Math.random() - 0.5) * 60}deg) translateY(${-15 - Math.random() * 20}px) scale(0.5)`;
      });

      setTimeout(() => { span.remove(); pool.splice(pool.indexOf(span), 1); }, 900);
      while (pool.length > MAX) pool.shift()?.remove();
    };

    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('mousemove', onMove);
      container.remove();
    };
  }, [isMobile]);

  return null;
}
