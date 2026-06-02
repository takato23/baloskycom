import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

type PlanetTarget = '#campanas' | '#productos' | '#memberships' | '#muro' | '#ojo' | '#sonido';
type OrbitMode = 'planets' | 'heads';

type PlanetDef = {
  id: string;
  name: string;
  role: string;
  target: PlanetTarget;
  model: string;
  color: string;
  radiusX: number;
  radiusZ: number;
  speed: number;
  phase: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
};

type SceneTuning = {
  stageShift: number;
  avatarSize: number;
  avatarX: number;
  avatarY: number;
  avatarYaw: number;
  orbitX: number;
  orbitY: number;
  orbitScale: number;
  planetScale: number;
  orbitLineOpacity: number;
  trailLength: number;
  orbitMode: OrbitMode;
};

const DEFAULT_SCENE_TUNING: SceneTuning = {
  stageShift: 32,
  avatarSize: 0.98,
  avatarX: 0.56,
  avatarY: -0.56,
  avatarYaw: -0.28,
  orbitX: 0.72,
  orbitY: 0.04,
  orbitScale: 0.72,
  planetScale: 0.55,
  orbitLineOpacity: 0,
  trailLength: 0,
  orbitMode: 'planets',
};

const TUNING_STORAGE_KEY = 'balosky-hero-scene-tuning';

const PLANETS: PlanetDef[] = [
  {
    id: 'campanas',
    name: 'Campañas',
    role: 'proyectos abiertos',
    target: '#campanas',
    model: '/models/planets/planet-01.glb',
    color: '#FA5D29',
    radiusX: 1.28,
    radiusZ: 0.66,
    speed: 0.18,
    phase: 0.15,
    tiltX: 0.42,
    tiltZ: -0.18,
    scale: 0.105,
  },
  {
    id: 'productos',
    name: 'Productos',
    role: 'drops y encargos',
    target: '#productos',
    model: '/models/planets/planet-03.glb',
    color: '#29C5FA',
    radiusX: 1.44,
    radiusZ: 0.56,
    speed: -0.15,
    phase: 1.95,
    tiltX: -0.34,
    tiltZ: 0.38,
    scale: 0.1,
  },
  {
    id: 'memberships',
    name: 'Membresías',
    role: 'círculo mensual',
    target: '#memberships',
    model: '/models/planets/planet-04.glb',
    color: '#7C4DFF',
    radiusX: 1.18,
    radiusZ: 0.76,
    speed: 0.13,
    phase: 3.1,
    tiltX: 0.72,
    tiltZ: 0.14,
    scale: 0.1,
  },
  {
    id: 'mensajes',
    name: 'Mensajes',
    role: 'muro vivo',
    target: '#muro',
    model: '/models/planets/planet-06.glb',
    color: '#FF4D8F',
    radiusX: 1.32,
    radiusZ: 0.62,
    speed: -0.2,
    phase: 4.65,
    tiltX: -0.58,
    tiltZ: -0.32,
    scale: 0.095,
  },
  {
    id: 'ojo',
    name: 'Ojo',
    role: 'archivo visual',
    target: '#ojo',
    model: '/models/planets/planet-02.glb',
    color: '#FFD166',
    radiusX: 1.56,
    radiusZ: 0.74,
    speed: 0.11,
    phase: 2.55,
    tiltX: 0.22,
    tiltZ: -0.46,
    scale: 0.09,
  },
  {
    id: 'sonido',
    name: 'Sonido',
    role: 'canciones y bocetos',
    target: '#sonido',
    model: '/models/planets/planet-05.glb',
    color: '#18D2C4',
    radiusX: 1.5,
    radiusZ: 0.58,
    speed: -0.12,
    phase: 5.35,
    tiltX: -0.24,
    tiltZ: 0.5,
    scale: 0.09,
  },
];

function useWebGlAvailable() {
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      setAvailable(Boolean(gl));
    } catch {
      setAvailable(false);
    }
  }, []);

  return available;
}

function useHeroScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const viewport = Math.max(window.innerHeight, 1);
      setProgress(Math.min(1, Math.max(0, window.scrollY / viewport)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return progress;
}

function loadGltf(url: string) {
  return useLoader(GLTFLoader, url, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }) as GLTF;
}

function normalizeModel(object: THREE.Object3D, targetSize: number, yOffset = 0) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  object.position.sub(center);
  object.position.y += yOffset;
  object.scale.setScalar(targetSize / maxDim);
}

function readStoredTuning(): SceneTuning {
  if (typeof window === 'undefined') return DEFAULT_SCENE_TUNING;
  try {
    const stored = window.localStorage.getItem(TUNING_STORAGE_KEY);
    if (!stored) return DEFAULT_SCENE_TUNING;
    const parsed = JSON.parse(stored) as Partial<SceneTuning>;
    return {
      ...DEFAULT_SCENE_TUNING,
      ...parsed,
      orbitMode: parsed.orbitMode === 'heads' ? 'heads' : 'planets',
    };
  } catch {
    return DEFAULT_SCENE_TUNING;
  }
}

function shouldShowSceneTuner() {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.search.includes('heroTuner=1')
  );
}

function CinematicLights({ darkMode }: { darkMode: boolean }) {
  const rim = darkMode ? '#ffffff' : '#050505';

  return (
    <>
      <ambientLight intensity={darkMode ? 0.025 : 0.08} />
      <directionalLight color="#FA5D29" intensity={0.38} position={[2.5, 2.8, 2.6]} />
      <directionalLight color={rim} intensity={darkMode ? 0.13 : 0.11} position={[-2.8, 2.2, -2.4]} />
      <pointLight color="#FF8A3B" intensity={0.035} position={[0.45, -0.85, 1.9]} distance={4} />
    </>
  );
}

function SceneCameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera, pointer } = useThree();

  useFrame(() => {
    const targetZ = 4.55 - scrollProgress * 0.2;
    const targetX = 0.04 + pointer.x * 0.06;
    const targetY = 0.08 + pointer.y * 0.06 - scrollProgress * 0.07;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.06);
    camera.lookAt(0.56, 0.1, 0);
  });

  return null;
}

function SceneTuner({
  tuning,
  onChange,
  onReset,
}: {
  tuning: SceneTuning;
  onChange: (patch: Partial<SceneTuning>) => void;
  onReset: () => void;
}) {
  const controlValues = [
    ['Escena X', 'stageShift', 12, 46, 0.5],
    ['Avatar tamaño', 'avatarSize', 0.72, 1.22, 0.01],
    ['Avatar X', 'avatarX', -0.08, 1.1, 0.01],
    ['Avatar Y', 'avatarY', -0.82, -0.18, 0.01],
    ['Avatar giro', 'avatarYaw', -0.78, 0.38, 0.01],
    ['Órbitas X', 'orbitX', 0.2, 1.1, 0.01],
    ['Órbitas Y', 'orbitY', -0.36, 0.34, 0.01],
    ['Órbitas tamaño', 'orbitScale', 0.48, 1.1, 0.01],
    ['Planetas tamaño', 'planetScale', 0.35, 1.48, 0.01],
    ['Líneas', 'orbitLineOpacity', 0, 0.08, 0.005],
    ['Estelas', 'trailLength', 0, 2.5, 0.1],
  ] as const;

  return (
    <aside className="rdz-scene-tuner" aria-label="Control de dirección del hero 3D">
      <div className="rdz-scene-tuner__head">
        <strong>Dirección hero</strong>
        <button type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="rdz-scene-tuner__mode" role="group" aria-label="Tipo de planetas">
        <button
          type="button"
          data-active={tuning.orbitMode === 'planets'}
          onClick={() => onChange({ orbitMode: 'planets' })}
        >
          Planetas
        </button>
        <button
          type="button"
          data-active={tuning.orbitMode === 'heads'}
          onClick={() => onChange({ orbitMode: 'heads' })}
        >
          Cabecitas
        </button>
      </div>

      <div className="rdz-scene-tuner__controls">
        {controlValues.map(([label, key, min, max, step]) => (
          <label key={key}>
            <span>
              {label}
              <b>{Number(tuning[key]).toFixed(key === 'stageShift' ? 1 : 2)}</b>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={Number(tuning[key])}
              onChange={(event) => onChange({ [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>
    </aside>
  );
}

function LowPolyAvatar() {
  const head = useMemo(() => new THREE.IcosahedronGeometry(0.46, 2), []);
  const torso = useMemo(() => new THREE.CapsuleGeometry(0.42, 0.52, 6, 14), []);

  useEffect(() => {
    return () => {
      head.dispose();
      torso.dispose();
    };
  }, [head, torso]);

  return (
    <group>
      <mesh geometry={head} position={[0, 0.72, 0]}>
        <meshStandardMaterial color="#f0b18b" roughness={0.52} metalness={0.08} />
      </mesh>
      <mesh geometry={torso} position={[0, -0.12, 0]} scale={[0.92, 1, 0.72]}>
        <meshStandardMaterial color="#141114" roughness={0.72} metalness={0.12} />
      </mesh>
    </group>
  );
}

function CentralAvatar({
  hovered,
  reducedMotion,
  scrollProgress,
  tuning,
}: {
  hovered: boolean;
  reducedMotion: boolean;
  scrollProgress: number;
  tuning: SceneTuning;
}) {
  const gltf = loadGltf('/models/santi-head.glb');
  const groupRef = useRef<THREE.Group>(null);
  const highModel = useMemo(() => gltf.scene.clone(true), [gltf.scene, tuning.avatarSize]);

  useLayoutEffect(() => {
    normalizeModel(highModel, tuning.avatarSize, -0.18);
    highModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = false;
        child.castShadow = false;
        child.receiveShadow = false;
        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.metalness = Math.min(mat.metalness, 0.04);
          mat.roughness = Math.max(mat.roughness, 0.78);
          mat.envMapIntensity = 0.1;
          mat.color.setScalar(0.5);
          mat.needsUpdate = true;
        }
      }
    });
  }, [highModel, tuning.avatarSize]);

  useFrame(({ pointer, clock }) => {
    const group = groupRef.current;
    if (!group || reducedMotion) return;
    const t = clock.elapsedTime;
    const yaw = tuning.avatarYaw + pointer.x * 0.18;
    const pitch = -pointer.y * 0.12 + scrollProgress * 0.1;
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, yaw + Math.sin(t * 0.35) * 0.035, 0.065);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, pitch, 0.055);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, -pointer.x * 0.04 + scrollProgress * 0.035, 0.05);
    const scale = 1 + (hovered ? 0.025 : 0) + scrollProgress * 0.025;
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, scale, 0.06));
  });

  return (
    <group ref={groupRef} position={[tuning.avatarX, tuning.avatarY, 0]}>
      <primitive object={highModel} />
    </group>
  );
}

function OrbitLine({
  planet,
  orbitScale,
  opacity,
}: {
  planet: PlanetDef;
  orbitScale: number;
  opacity: number;
}) {
  const points = useMemo(() => {
    const curve = new THREE.EllipseCurve(
      0,
      0,
      planet.radiusX * orbitScale,
      planet.radiusZ * orbitScale,
      0,
      Math.PI * 2,
    );
    return curve.getPoints(96).map((p) => new THREE.Vector3(p.x, 0, p.y));
  }, [planet.radiusX, planet.radiusZ, orbitScale]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: planet.color,
        transparent: true,
        opacity,
      }),
    [planet.color, opacity],
  );
  const line = useMemo(() => {
    const orbit = new THREE.Line(geometry, material);
    orbit.rotation.set(planet.tiltX, 0, planet.tiltZ);
    orbit.renderOrder = -1;
    return orbit;
  }, [geometry, material, planet.tiltX, planet.tiltZ]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  if (opacity <= 0) return null;
  return <primitive object={line} />;
}

function AbstractPlanetModel({
  planet,
  desaturated,
}: {
  planet: PlanetDef;
  desaturated: boolean;
}) {
  const core = useMemo(() => new THREE.IcosahedronGeometry(0.42, 2), []);
  const band = useMemo(() => new THREE.TorusGeometry(0.54, 0.012, 8, 64), []);
  const color = desaturated ? '#7A726B' : planet.color;

  useEffect(() => {
    return () => {
      core.dispose();
      band.dispose();
    };
  }, [core, band]);

  return (
    <group>
      <mesh geometry={core}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={desaturated ? 0.015 : 0.06}
          roughness={0.48}
          metalness={0.14}
          transparent
          opacity={desaturated ? 0.44 : 0.92}
        />
      </mesh>
      <mesh geometry={band} rotation={[Math.PI * 0.52, 0.16, -0.26]} scale={1.12}>
        <meshBasicMaterial color={color} transparent opacity={desaturated ? 0.1 : 0.32} />
      </mesh>
      <mesh scale={1.46}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={desaturated ? 0.045 : 0.095} />
      </mesh>
    </group>
  );
}

function CharacterPlanetModel({
  planet,
  desaturated,
}: {
  planet: PlanetDef;
  desaturated: boolean;
}) {
  const gltf = loadGltf(planet.model);
  const halo = useMemo(() => new THREE.TorusGeometry(0.58, 0.012, 8, 48), []);
  const color = desaturated ? '#7A726B' : planet.color;

  const model = useMemo(() => {
    const clonedModel = gltf.scene.clone(true);
    normalizeModel(clonedModel, 0.86, -0.02);
    clonedModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = false;
        const mat = child.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          const material = mat.clone();
          material.metalness = Math.min(material.metalness, 0.05);
          material.roughness = Math.max(material.roughness, 0.62);
          material.envMapIntensity = desaturated ? 0.05 : 0.16;
          material.color.lerp(new THREE.Color(planet.color), desaturated ? 0.68 : 0.08);
          material.needsUpdate = true;
          child.material = material;
        }
      }
    });
    return clonedModel;
  }, [gltf.scene, planet.color, desaturated]);

  useEffect(() => {
    return () => {
      halo.dispose();
    };
  }, [halo]);

  return (
    <group>
      <primitive object={model} />
      <mesh geometry={halo} rotation={[Math.PI * 0.5, 0.18, -0.24]} scale={1.08}>
        <meshBasicMaterial color={color} transparent opacity={desaturated ? 0.16 : 0.42} />
      </mesh>
    </group>
  );
}

function PlanetModel({
  mode,
  planet,
  desaturated,
}: {
  mode: OrbitMode;
  planet: PlanetDef;
  desaturated: boolean;
}) {
  if (mode === 'heads') {
    return <CharacterPlanetModel planet={planet} desaturated={desaturated} />;
  }
  return <AbstractPlanetModel planet={planet} desaturated={desaturated} />;
}

function OrbitPlanet({
  planet,
  activeId,
  reducedMotion,
  tuning,
  onActive,
  onNavigate,
}: {
  planet: PlanetDef;
  activeId: string | null;
  reducedMotion: boolean;
  tuning: SceneTuning;
  onActive: (planet: PlanetDef | null) => void;
  onNavigate: (target: PlanetTarget) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isActive = activeId === planet.id;
  const isOtherActive = Boolean(activeId && activeId !== planet.id);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    const angle = planet.phase + time * planet.speed;
    const x = Math.cos(angle) * planet.radiusX * tuning.orbitScale;
    const z = Math.sin(angle) * planet.radiusZ * tuning.orbitScale;
    const y = Math.sin(angle + planet.phase) * 0.13 * tuning.orbitScale + 0.18;
    const targetScale = planet.scale * tuning.planetScale * (isActive ? 1.34 : 1);
    group.position.set(x, y, z);
    group.rotation.x = planet.tiltX + Math.sin(time * 0.8 + planet.phase) * 0.08;
    group.rotation.y += reducedMotion ? 0 : 0.012 + Math.abs(planet.speed) * 0.02;
    group.rotation.z = planet.tiltZ;
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x || planet.scale, targetScale, 0.12));
  });

  const planetNode = (
    <group
      ref={groupRef}
      scale={planet.scale * tuning.planetScale}
      onPointerOver={(event) => {
        event.stopPropagation();
        onActive(planet);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onActive(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate(planet.target);
      }}
    >
      <PlanetModel mode={tuning.orbitMode} planet={planet} desaturated={isOtherActive} />
    </group>
  );

  return (
    <group rotation={[planet.tiltX, 0, planet.tiltZ]}>
      <OrbitLine planet={planet} orbitScale={tuning.orbitScale} opacity={tuning.orbitLineOpacity} />
      {planetNode}
    </group>
  );
}

function OrbitingAvatarPlanets({
  activeId,
  reducedMotion,
  tuning,
  onActive,
  onNavigate,
}: {
  activeId: string | null;
  reducedMotion: boolean;
  tuning: SceneTuning;
  onActive: (planet: PlanetDef | null) => void;
  onNavigate: (target: PlanetTarget) => void;
}) {
  return (
    <group position={[tuning.orbitX, tuning.orbitY, 0]}>
      {PLANETS.map((planet) => (
        <OrbitPlanet
          key={planet.id}
          planet={planet}
          activeId={activeId}
          reducedMotion={reducedMotion}
          tuning={tuning}
          onActive={onActive}
          onNavigate={onNavigate}
        />
      ))}
    </group>
  );
}

function AvatarScene({
  activePlanet,
  darkMode,
  reducedMotion,
  scrollProgress,
  tuning,
  onActive,
  onNavigate,
}: {
  activePlanet: PlanetDef | null;
  darkMode: boolean;
  reducedMotion: boolean;
  scrollProgress: number;
  tuning: SceneTuning;
  onActive: (planet: PlanetDef | null) => void;
  onNavigate: (target: PlanetTarget) => void;
}) {
  return (
    <>
      <SceneCameraRig scrollProgress={reducedMotion ? 0 : scrollProgress} />
      <CinematicLights darkMode={darkMode} />
      <CentralAvatar
        hovered={Boolean(activePlanet)}
        reducedMotion={reducedMotion}
        scrollProgress={scrollProgress}
        tuning={tuning}
      />
      <OrbitingAvatarPlanets
        activeId={activePlanet?.id ?? null}
        reducedMotion={reducedMotion}
        tuning={tuning}
        onActive={onActive}
        onNavigate={onNavigate}
      />
    </>
  );
}

function StageFallback({
  children,
  reason = 'cargando avatar',
}: {
  children?: ReactNode;
  reason?: string;
}) {
  return (
    <div className="rdz-avatar-fallback" aria-live="polite">
      <div className="rdz-avatar-fallback__portrait" aria-hidden="true">
        <img src="/uploads/thumbs/balosky-portrait-frente.png" alt="" loading="eager" />
      </div>
      <pre className="rdz-avatar-fallback__ascii" aria-hidden="true">
        {`  B A L O S K Y
    /\\
   /__\\   ${reason}
  orbitas en pausa`}
      </pre>
      {children}
    </div>
  );
}

function MobileAvatarConstellation({
  onNavigate,
}: {
  onNavigate: (target: PlanetTarget) => void;
}) {
  return (
    <StageFallback reason="modo liviano">
      <div className="rdz-avatar-mobile-planets" role="list" aria-label="Secciones principales">
        {PLANETS.map((planet) => (
          <button
            key={planet.id}
            type="button"
            role="listitem"
            className="rdz-avatar-mobile-planet"
            style={{ '--planet-color': planet.color } as CSSProperties}
            onClick={() => onNavigate(planet.target)}
          >
            <span>{planet.name}</span>
            <small>{planet.role}</small>
          </button>
        ))}
      </div>
    </StageFallback>
  );
}

export default function AvatarHeroStage({ darkMode }: { darkMode: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile(820);
  const webglAvailable = useWebGlAvailable();
  const scrollProgress = useHeroScrollProgress();
  const [activePlanet, setActivePlanet] = useState<PlanetDef | null>(null);
  const [tuning, setTuning] = useState<SceneTuning>(readStoredTuning);
  const showTuner = useMemo(shouldShowSceneTuner, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(tuning));
    document.documentElement.style.setProperty('--rdz-avatar-stage-shift', `${tuning.stageShift}vw`);
  }, [tuning]);

  const updateTuning = useCallback((patch: Partial<SceneTuning>) => {
    setTuning((current) => ({ ...current, ...patch }));
  }, []);

  const resetTuning = useCallback(() => {
    setTuning(DEFAULT_SCENE_TUNING);
  }, []);

  const navigateTo = useCallback(
    (target: PlanetTarget) => {
      const element = document.querySelector(target);
      if (!(element instanceof HTMLElement)) return;
      element.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      window.history.replaceState(null, '', target);
    },
    [reducedMotion],
  );

  if (isMobile || reducedMotion || !webglAvailable) {
    return <MobileAvatarConstellation onNavigate={navigateTo} />;
  }

  return (
    <div className="rdz-avatar-stage" onPointerLeave={() => setActivePlanet(null)}>
      <Suspense fallback={<StageFallback />}>
        <Canvas
          camera={{ position: [0.04, 0.02, 4.55], fov: 32, near: 0.1, far: 40 }}
          dpr={[1, 1.55]}
          frameloop="always"
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
          }}
          performance={{ min: 0.45 }}
        >
          <Suspense fallback={null}>
            <AvatarScene
              activePlanet={activePlanet}
              darkMode={darkMode}
              reducedMotion={reducedMotion}
              scrollProgress={scrollProgress}
              tuning={tuning}
              onActive={setActivePlanet}
              onNavigate={navigateTo}
            />
          </Suspense>
        </Canvas>
      </Suspense>

      <div className="rdz-avatar-tooltip" data-visible={Boolean(activePlanet)}>
        {activePlanet && (
          <>
            <strong>{activePlanet.name}</strong>
            <span>{activePlanet.role}</span>
          </>
        )}
      </div>

      <div className="rdz-avatar-planet-nav" role="list" aria-label="Navegación por avatares planeta">
        {PLANETS.map((planet) => (
          <button
            key={planet.id}
            type="button"
            role="listitem"
            className="rdz-avatar-planet-nav__item"
            style={{ '--planet-color': planet.color } as CSSProperties}
            onFocus={() => setActivePlanet(planet)}
            onBlur={() => setActivePlanet(null)}
            onMouseEnter={() => setActivePlanet(planet)}
            onMouseLeave={() => setActivePlanet(null)}
            onClick={() => navigateTo(planet.target)}
          >
            <span>{planet.name}</span>
          </button>
        ))}
      </div>

      {showTuner &&
        createPortal(
          <SceneTuner tuning={tuning} onChange={updateTuning} onReset={resetTuning} />,
          document.body,
        )}
    </div>
  );
}
