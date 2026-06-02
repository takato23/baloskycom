import { useEffect, useMemo, useState } from 'react';

type LiquidReactModule = typeof import('@liquid-dom/react');

type ViewportSize = {
  width: number;
  height: number;
};

type LiquidChromeProps = {
  enabled: boolean;
};

type NavigatorWithGpu = Navigator & {
  gpu?: unknown;
};

function supportsWebGpu() {
  if (typeof navigator === 'undefined') return false;
  return Boolean((navigator as NavigatorWithGpu).gpu);
}

function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function useViewportSize(enabled: boolean) {
  const [size, setSize] = useState<ViewportSize>(() => getViewportSize());

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize(getViewportSize()));
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [enabled]);

  return size;
}

function LiquidStage({
  liquid,
  size,
  onRenderError,
}: {
  liquid: LiquidReactModule;
  size: ViewportSize;
  onRenderError: (error: unknown) => void;
}) {
  const {
    LiquidCanvas,
    Frame,
    Glass,
    GlassContainer,
    Transform,
    ZStack,
  } = liquid;

  const geometry = useMemo(() => {
    const navWidth = Math.min(Math.max(size.width - 32, 320), 1160);
    const navHeight = size.width >= 960 ? 72 : 64;
    const navX = Math.max((size.width - navWidth) / 2, 16);
    const navY = size.width >= 960 ? 10 : 8;

    return {
      navHeight,
      navWidth,
      navX,
      navY,
    };
  }, [size.width]);

  if (size.width <= 0 || size.height <= 0) return null;

  return (
    <LiquidCanvas
      className="liquid-chrome__canvas-host"
      canvasClassName="liquid-chrome__canvas"
      frameloop="demand"
      maxDpr={1.2}
      onError={onRenderError}
      proposal={{ width: size.width, height: size.height }}
    >
      <Frame width={size.width} height={size.height} alignment="topLeading">
        <GlassContainer
          blur={18}
          spacing={22}
          bezelWidth={9}
          thickness={18}
          displacementFactor={0.16}
          displacementBlur={8}
          ior={1.36}
          dispersion={0.045}
          surfaceProfile="convex"
          specularStrength={0.72}
          specularWidth="hairline"
          specularOpacity={0.72}
          shadowColor={{ r: 0, g: 0, b: 0, a: 0.28 }}
          shadowBlur={42}
          shadowOffsetY={18}
          tint={{ r: 1, g: 0.9, b: 0.78, a: 0.14 }}
        >
          <ZStack alignment="topLeading">
            <Transform x={geometry.navX} y={geometry.navY}>
              <Frame width={geometry.navWidth} height={geometry.navHeight}>
                <Glass cornerRadius={geometry.navHeight / 2} cornerSmoothing={0.76} />
              </Frame>
            </Transform>
          </ZStack>
        </GlassContainer>
      </Frame>
    </LiquidCanvas>
  );
}

export default function LiquidChrome({ enabled }: LiquidChromeProps) {
  const [liquid, setLiquid] = useState<LiquidReactModule | null>(null);
  const [failed, setFailed] = useState(false);
  const canAttemptWebGpu = enabled && !failed && supportsWebGpu();
  const size = useViewportSize(enabled);

  useEffect(() => {
    if (!canAttemptWebGpu) {
      setLiquid(null);
      return;
    }

    let cancelled = false;
    import('@liquid-dom/react')
      .then((mod) => {
        if (!cancelled) setLiquid(mod);
      })
      .catch((error) => {
        console.warn('[LiquidChrome] liquid-dom unavailable, using CSS fallback', error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [canAttemptWebGpu]);

  if (!enabled) return null;

  return (
    <div
      className={liquid && !failed ? 'liquid-chrome is-webgpu' : 'liquid-chrome is-fallback'}
      aria-hidden="true"
    >
      <span className="liquid-chrome__fallback liquid-chrome__fallback--nav" />

      {liquid && !failed && (
        <LiquidStage
          liquid={liquid}
          size={size}
          onRenderError={(error) => {
            console.warn('[LiquidChrome] render failed, using CSS fallback', error);
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}
