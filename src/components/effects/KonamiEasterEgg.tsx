import { useEffect } from 'react';

const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

export default function KonamiEasterEgg() {
  useEffect(() => {
    let pos = 0;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === CODE[pos]) {
        pos++;
        if (pos === CODE.length) {
          pos = 0;
          activate();
        }
      } else {
        pos = 0;
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return null;
}

function activate() {
  // Flash message
  const msg = document.createElement('div');
  msg.textContent = '// MODO DELIRIO ACTIVADO';
  msg.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    font-family:monospace;font-size:clamp(1.2rem,4vw,2.5rem);font-weight:900;
    color:#FA5D29;z-index:99999;
    text-shadow:0 0 40px rgba(250,93,41,0.5);
    pointer-events:none;letter-spacing:0.05em;
    animation:delirio-text 3s forwards;
  `;
  document.body.appendChild(msg);

  // Invert images
  document.querySelectorAll('img').forEach((img) => {
    img.style.transition = 'filter 0.3s';
    img.style.filter = 'invert(1) hue-rotate(180deg)';
    setTimeout(() => { img.style.filter = ''; }, 3000);
  });

  // Rainbow accent cycle
  const root = document.documentElement;
  const colors = ['#FA5D29', '#ff00ff', '#00ff00', '#3b82f6', '#facc15', '#ec4899', '#FA5D29'];
  let ci = 0;
  const interval = setInterval(() => {
    root.style.setProperty('--accent', colors[ci % colors.length]);
    ci++;
  }, 200);
  setTimeout(() => {
    clearInterval(interval);
    root.style.setProperty('--accent', '#FA5D29');
  }, 3000);

  // Cursor flash
  const cursor = document.getElementById('cursor');
  if (cursor) {
    cursor.style.width = '80px';
    cursor.style.height = '80px';
    cursor.style.borderColor = '#ff00ff';
    cursor.style.background = 'rgba(250,93,41,0.2)';
    setTimeout(() => {
      cursor.style.width = '20px';
      cursor.style.height = '20px';
      cursor.style.borderColor = 'var(--black)';
      cursor.style.background = 'rgba(0,0,0,0.06)';
    }, 3000);
  }

  setTimeout(() => msg.remove(), 3000);
}
