/**
 * useWakefulness — "sistema nervioso" de /preview-v2.
 *
 * Idea: la página arranca calma (solo video + orbes). A medida que el
 * visitante se engancha (scrollea, toca orbes, mueve el mouse, se queda
 * un rato), el "nivel de despertar" sube y progresivamente se encienden
 * las capas de efectos del balosky.com original.
 *
 * Esto evita el síndrome "entra a la página y se estampa de información",
 * pero conserva el WOW factor: si el usuario invierte atención, la página
 * le devuelve más cosas.
 *
 * Reseteable: `reset()` lleva el score a 0 de un saque. Lo cableamos al
 * tap del logo `m` del hero (junto con el easter egg ModoHomer), así el
 * visitante siempre puede "volver al silencio" si se siente sobrepasado.
 *
 * Score 0-100 → niveles discretos 0-4 que las capas de efectos consumen:
 *   Nivel 0 (  0-14): calma total. Solo video + orbes + audio bed sutil.
 *   Nivel 1 ( 15-39): scroll reveals + stroke-fill en títulos.
 *   Nivel 2 ( 40-64): cursor líquido + magnetic pointers.
 *   Nivel 3 ( 65-84): partículas + film grain intensificado.
 *   Nivel 4 (85-100): ASCII trail + MascotCompanion.
 *
 * Contribuciones al score (suman 100 en total):
 *   - Scroll depth:   35 pts  (0 → full scroll)
 *   - Orbs tocados:   25 pts  (cada uno = 6.25 pts, cap en 4)
 *   - Tiempo en pág:  20 pts  (ramp hasta 60s)
 *   - Actividad mouse: 20 pts (px movidos, con decay si idle)
 *
 * El mouse activity es el único input que decae: si el usuario se queda
 * quieto, esa porción del score baja para que la página "se duerma"
 * gradualmente cuando no hay interacción.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface Wakefulness {
  /** 0-100 engagement score. */
  score: number;
  /** 0-4 level threshold. Cada número prende una capa de efectos. */
  level: 0 | 1 | 2 | 3 | 4;
  /** Vuelve el score a 0 (para tap al logo / easter egg). */
  reset: () => void;
  /** Incrementa "orbs tocados" — cableado desde FloatingOrbs/OrbDock. */
  bumpOrb: () => void;
}

interface Options {
  /** Si true, el hook queda dormido (score = 0 siempre). Para prefers-reduced-motion. */
  disabled?: boolean;
  /** Máximo de orbes que cuentan (default 4). Más allá no suma. */
  orbCap?: number;
  /** Segundos hasta maxear el componente "tiempo" (default 60). */
  timeCeilingSec?: number;
}

const LEVEL_THRESHOLDS = [15, 40, 65, 85] as const;

function levelFromScore(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score >= LEVEL_THRESHOLDS[3]) return 4;
  if (score >= LEVEL_THRESHOLDS[2]) return 3;
  if (score >= LEVEL_THRESHOLDS[1]) return 2;
  if (score >= LEVEL_THRESHOLDS[0]) return 1;
  return 0;
}

export function useWakefulness(opts: Options = {}): Wakefulness {
  const { disabled = false, orbCap = 4, timeCeilingSec = 60 } = opts;

  const [score, setScore] = useState(0);

  // Inputs acumulados (refs para no re-renderizar en cada pixel de scroll/mouse).
  const scrollPctRef = useRef(0);        // 0-1
  const orbsTouchedRef = useRef(0);      // count (capped)
  const mouseActivityRef = useRef(0);    // 0-1, con decay
  const startTimeRef = useRef<number>(Date.now());
  const lastMouseMoveRef = useRef<number>(Date.now());

  // Acumulador de pixels movidos en la ventana actual, se resetea con cada tick.
  const pxThisTickRef = useRef(0);

  const resetSignalRef = useRef(0);

  const bumpOrb = useCallback(() => {
    if (orbsTouchedRef.current < orbCap) {
      orbsTouchedRef.current += 1;
    }
  }, [orbCap]);

  const reset = useCallback(() => {
    scrollPctRef.current = 0;
    orbsTouchedRef.current = 0;
    mouseActivityRef.current = 0;
    startTimeRef.current = Date.now();
    pxThisTickRef.current = 0;
    resetSignalRef.current += 1;
    setScore(0);
  }, []);

  useEffect(() => {
    if (disabled) {
      setScore(0);
      return;
    }

    // --- Scroll listener ---
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(1, Math.max(0, window.scrollY / max));
      scrollPctRef.current = pct;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // --- Mouse move listener ---
    let lastX = 0;
    let lastY = 0;
    let hasPrev = false;
    const onMouseMove = (e: MouseEvent) => {
      if (hasPrev) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        pxThisTickRef.current += Math.sqrt(dx * dx + dy * dy);
      }
      lastX = e.clientX;
      lastY = e.clientY;
      hasPrev = true;
      lastMouseMoveRef.current = Date.now();
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // --- Tick cada 500ms: recalcula score ---
    // 500ms es un buen balance: suficientemente ágil para que se sienta
    // reactivo, suficientemente lento para no spamear re-renders.
    const TICK_MS = 500;
    const interval = setInterval(() => {
      // Mouse activity: px de este tick normalizados.
      // 800px/tick ≈ full activity (mover el mouse con intención atravesando
      // media pantalla). Se acumula con decay:
      const pxContribution = Math.min(1, pxThisTickRef.current / 800);
      pxThisTickRef.current = 0;

      // Decay si hace >2s que no se mueve el mouse.
      const idleMs = Date.now() - lastMouseMoveRef.current;
      if (idleMs > 2000) {
        mouseActivityRef.current = Math.max(0, mouseActivityRef.current - 0.05);
      } else {
        // Peso: ~70% valor viejo + 30% nuevo (smooth EMA).
        mouseActivityRef.current = Math.min(
          1,
          mouseActivityRef.current * 0.7 + pxContribution * 0.3,
        );
      }

      // Time factor: segundos desde mount / ceiling.
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
      const timeFactor = Math.min(1, elapsedSec / timeCeilingSec);

      // Score compuesto (suma 100).
      const scrollPart = scrollPctRef.current * 35;
      const orbsPart = (orbsTouchedRef.current / orbCap) * 25;
      const timePart = timeFactor * 20;
      const mousePart = mouseActivityRef.current * 20;

      const next = Math.round(scrollPart + orbsPart + timePart + mousePart);
      setScore((prev) => (prev === next ? prev : next));
    }, TICK_MS);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      clearInterval(interval);
    };
  }, [disabled, orbCap, timeCeilingSec]);

  return {
    score,
    level: disabled ? 0 : levelFromScore(score),
    reset,
    bumpOrb,
  };
}
