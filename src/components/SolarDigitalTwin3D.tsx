import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ChevronDown, ChevronUp, Layers, Maximize2, RotateCcw, Sun } from 'lucide-react';
import { TOKENS } from '../theme/tokens';
import type {
  AssetComponent,
  ComponentHealthStatus,
  DigitalTwinComponentId,
  SimulatedFaultScenario,
} from '../types/sunfix';
import { computeSimulatedTwinTelemetry, formatHourLabel } from '../utils/diagnosticsLogic';
import { SolarTwinSvg2D } from './SolarTwinSvg2D';

const isSoftwareGl: boolean = (() => {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    const uaHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver === true || /HeadlessChrome/i.test(navigator.userAgent));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return uaHeadless || /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

const hasWebGLSupport: boolean = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    }
    return false;
  } catch {
    return false;
  }
})();

const ROOF_Y = 3.2;

const CAMERA_PRESETS: Record<
  'overview' | DigitalTwinComponentId,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  overview: { pos: [24, 19, 25], target: [0, 3.6, -0.5], label: 'Overview' },
  solar_panel: { pos: [-3.5, 13.5, 11.5], target: [-3.5, 3.8, -2.8], label: 'PV Array' },
  inverter: { pos: [15.4, 6.2, 3.2], target: [11.6, 4.4, -1.2], label: 'Inverter' },
  battery: { pos: [16.5, 6.4, -1.6], target: [12.0, 4.3, -5.2], label: 'Battery' },
  connection: { pos: [11.5, 9.5, 7.5], target: [7.6, 3.7, -1.5], label: 'DC Bus' },
  grid_meter: { pos: [19.5, 7.4, 9.8], target: [14.0, 3.8, 4.2], label: 'Grid Tie' },
  site_load: { pos: [-11.5, 8.2, 13.5], target: [-7.5, 4.1, 7.2], label: 'Site Load' },
};

export interface TwinLayerVisibility {
  strings: boolean;
  dcWiring: boolean;
  acPath: boolean;
  siteLoad: boolean;
  labels: boolean;
  energyFlow: boolean;
}

function statusHex(status: ComponentHealthStatus, recoveryPulse: boolean): string {
  if (recoveryPulse) return TOKENS.mint;
  switch (status) {
    case 'fault':
      return TOKENS.terracotta;
    case 'warning':
    case 'investigating':
      return TOKENS.amberWarn;
    case 'resolved':
    case 'nominal':
      return TOKENS.mint;
    default:
      return TOKENS.sky;
  }
}

function createRoofMembraneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = TOKENS.scene.roofMembrane;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(243, 238, 227, 0.045)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(243, 238, 227, 0.025)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  return tex;
}

function createSolarCellTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(12, 26, 28, 0.16)';
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 10; j++) {
        ctx.fillRect(i * 42 + 2, j * 25 + 2, 38, 21);
      }
    }
    ctx.strokeStyle = 'rgba(210, 236, 240, 0.48)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 256) / 6, 0);
      ctx.lineTo((i * 256) / 6, 256);
      ctx.stroke();
    }
    for (let j = 0; j <= 10; j++) {
      ctx.beginPath();
      ctx.moveTo(0, (j * 256) / 10);
      ctx.lineTo(256, (j * 256) / 10);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = isSoftwareGl ? 1 : 4;
  return tex;
}

function createLcdTexture(params: {
  status: ComponentHealthStatus;
  recoveryPulse: boolean;
  faultCode: string;
  observedKw: number;
  irradianceWm2: number;
}): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const accent = statusHex(params.status, params.recoveryPulse);
    ctx.fillStyle = TOKENS.mossDeep;
    ctx.fillRect(0, 0, 320, 160);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 304, 144);

    ctx.fillStyle = TOKENS.sage;
    ctx.font = '600 16px monospace';
    ctx.fillText('HELIOCORE X50 [SIM]', 22, 36);

    ctx.fillStyle = accent;
    ctx.font = '700 32px monospace';
    const headline = params.recoveryPulse
      ? 'NOMINAL OK'
      : params.status === 'fault' && params.faultCode
        ? `FAULT ${params.faultCode}`
        : params.status === 'warning' && params.faultCode
          ? `WARN ${params.faultCode}`
          : `${params.observedKw.toFixed(1)} kW AC`;
    ctx.fillText(headline, 22, 86);

    ctx.fillStyle = TOKENS.bone;
    ctx.font = '500 17px monospace';
    ctx.fillText(`IRR ${params.irradianceWm2} W/m2 | OUT ${params.observedKw.toFixed(1)} kW`, 22, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface PvModulePlacement {
  pos: [number, number, number];
  stringIndex: number; // 0..5
}

const PV_PLACEMENTS: PvModulePlacement[] = (() => {
  const list: PvModulePlacement[] = [];
  const rowZs = [-7.2, -3.2, 0.8];
  const tilt = -0.19; // ~11 deg south-facing
  const stringStartXs = [-13.4, -2.0];
  rowZs.forEach((rowZ, rIdx) => {
    stringStartXs.forEach((startX, sCol) => {
      const stringIndex = rIdx * 2 + sCol;
      for (let subRow = 0; subRow < 2; subRow++) {
        for (let col = 0; col < 10; col++) {
          const x = startX + col * 0.92;
          const z = rowZ + (subRow === 0 ? -0.78 : 0.78);
          const y = ROOF_Y + 0.56 + (subRow === 0 ? 0.14 : -0.14);
          list.push({ pos: [x, y, z], stringIndex });
        }
      }
    });
  });
  void tilt;
  return list;
})();

const SceneEnvironmentAndControls: React.FC<{
  focusTarget: 'overview' | DigitalTwinComponentId;
  resetCounter: number;
  reducedMotion: boolean;
}> = ({ focusTarget, resetCounter, reducedMotion }) => {
  const { gl, scene, camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const desiredPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.overview.pos));
  const desiredTarget = useRef(new THREE.Vector3(...CAMERA_PRESETS.overview.target));
  const animatingCamera = useRef(false);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    return () => {
      scene.environment = null;
      envRT.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    const preset = CAMERA_PRESETS[focusTarget] || CAMERA_PRESETS.overview;
    desiredPos.current.set(...preset.pos);
    desiredTarget.current.set(...preset.target);
    if (reducedMotion && controlsRef.current) {
      camera.position.copy(desiredPos.current);
      controlsRef.current.target.copy(desiredTarget.current);
      controlsRef.current.update();
      animatingCamera.current = false;
      invalidate();
    } else {
      animatingCamera.current = true;
      invalidate();
    }
  }, [focusTarget, resetCounter, camera, reducedMotion, invalidate]);

  useFrame((_, rawDelta) => {
    if (!animatingCamera.current || !controlsRef.current) return;
    const dt = Math.min(rawDelta, 0.05);
    camera.position.lerp(desiredPos.current, 1 - Math.exp(-5.5 * dt));
    controlsRef.current.target.lerp(desiredTarget.current, 1 - Math.exp(-6 * dt));
    controlsRef.current.update();
    if (camera.position.distanceTo(desiredPos.current) < 0.04) {
      camera.position.copy(desiredPos.current);
      controlsRef.current.target.copy(desiredTarget.current);
      controlsRef.current.update();
      animatingCamera.current = false;
    } else {
      invalidate();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!isSoftwareGl}
      dampingFactor={0.07}
      minDistance={5}
      maxDistance={46}
      maxPolarAngle={Math.PI / 2 - 0.05}
      onStart={() => {
        animatingCamera.current = false;
      }}
      onChange={() => invalidate()}
    />
  );
};

const EnergyPulses: React.FC<{
  dcActive: boolean;
  acActive: boolean;
  batActive: boolean;
  loadActive: boolean;
  dcFault: boolean;
  acFault: boolean;
  irradianceFactor: number;
  visible: boolean;
  reducedMotion: boolean;
}> = ({
  dcActive,
  acActive,
  batActive,
  loadActive,
  dcFault,
  acFault,
  irradianceFactor,
  visible,
  reducedMotion,
}) => {
  const dcMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const acMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const batMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const loadMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phaseRef = useRef(0);
  const { invalidate } = useThree();

  const dcCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4, ROOF_Y + 0.35, -3.2),
        new THREE.Vector3(7.4, ROOF_Y + 0.35, -3.2),
        new THREE.Vector3(7.4, ROOF_Y + 0.35, -1.2),
        new THREE.Vector3(11.1, ROOF_Y + 0.75, -1.2),
      ]),
    [],
  );

  const batCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(11.6, ROOF_Y + 0.75, -1.6),
        new THREE.Vector3(11.8, ROOF_Y + 0.5, -3.3),
        new THREE.Vector3(12.0, ROOF_Y + 0.75, -4.8),
      ]),
    [],
  );

  const acCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(11.6, ROOF_Y + 0.75, -0.7),
        new THREE.Vector3(11.8, ROOF_Y + 0.35, 1.8),
        new THREE.Vector3(12.0, ROOF_Y + 0.75, 4.1),
        new THREE.Vector3(16.8, ROOF_Y + 1.4, 4.2),
        new THREE.Vector3(20.4, 5.2, 4.2),
      ]),
    [],
  );

  const loadCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(11.5, ROOF_Y + 0.35, 4.2),
        new THREE.Vector3(5.0, ROOF_Y + 0.3, 6.2),
        new THREE.Vector3(-2.0, ROOF_Y + 0.3, 7.2),
        new THREE.Vector3(-6.2, ROOF_Y + 0.65, 7.2),
      ]),
    [],
  );

  const updatePositions = (phase: number) => {
    const placeOnCurve = (
      mesh: THREE.InstancedMesh | null,
      curve: THREE.CatmullRomCurve3,
      active: boolean,
      count: number,
    ) => {
      if (!mesh) return;
      for (let i = 0; i < count; i++) {
        if (!active || !visible) {
          dummy.scale.set(0, 0, 0);
          dummy.position.set(0, -10, 0);
        } else {
          const t = (phase + i / count) % 1;
          curve.getPointAt(t, dummy.position);
          const s = 0.08 + irradianceFactor * 0.05;
          dummy.scale.set(s, s, s);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };

    placeOnCurve(dcMeshRef.current, dcCurve, dcActive, 6);
    placeOnCurve(batMeshRef.current, batCurve, batActive, 3);
    placeOnCurve(acMeshRef.current, acCurve, acActive, 6);
    placeOnCurve(loadMeshRef.current, loadCurve, loadActive, 5);
  };

  useEffect(() => {
    updatePositions(phaseRef.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dcActive, acActive, batActive, loadActive, visible, irradianceFactor]);

  useFrame((_, rawDelta) => {
    if (!visible || reducedMotion) return;
    const dt = Math.min(rawDelta, 0.05);
    const speed = 0.16 + irradianceFactor * 0.24;
    phaseRef.current = (phaseRef.current + dt * speed) % 1;
    updatePositions(phaseRef.current);
  });

  if (!visible) return null;

  return (
    <group>
      <instancedMesh ref={dcMeshRef} args={[undefined, undefined, 6]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color={dcFault ? TOKENS.amberWarn : TOKENS.brass}
          emissive={dcFault ? TOKENS.amberWarn : TOKENS.brass}
          emissiveIntensity={0.65}
          roughness={0.25}
        />
      </instancedMesh>
      <instancedMesh ref={batMeshRef} args={[undefined, undefined, 3]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color={TOKENS.mint}
          emissive={TOKENS.mint}
          emissiveIntensity={0.55}
          roughness={0.25}
        />
      </instancedMesh>
      <instancedMesh ref={acMeshRef} args={[undefined, undefined, 6]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color={acFault ? TOKENS.terracotta : TOKENS.sky}
          emissive={acFault ? TOKENS.terracotta : TOKENS.sky}
          emissiveIntensity={0.65}
          roughness={0.25}
        />
      </instancedMesh>
      <instancedMesh ref={loadMeshRef} args={[undefined, undefined, 5]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color={TOKENS.sky}
          emissive={TOKENS.sky}
          emissiveIntensity={0.5}
          roughness={0.25}
        />
      </instancedMesh>
    </group>
  );
};

interface ProjectedCalloutDef {
  key: string;
  anchor: [number, number, number];
}

const SUBSYSTEM_ANCHORS: ProjectedCalloutDef[] = [
  { key: 'solar_panel', anchor: [-5.5, ROOF_Y + 2.1, -3.4] },
  { key: 'connection', anchor: [5.6, ROOF_Y + 2.3, -6.2] },
  { key: 'battery', anchor: [12.0, ROOF_Y + 3.0, -5.2] },
  { key: 'inverter', anchor: [11.6, ROOF_Y + 2.35, -1.0] },
  { key: 'grid_meter', anchor: [13.2, ROOF_Y + 2.1, 4.4] },
  { key: 'site_load', anchor: [-7.5, ROOF_Y + 2.3, 7.2] },
];

interface SolarInstallationSceneProps {
  components: AssetComponent[];
  selectedId: DigitalTwinComponentId;
  onSelect: (id: DigitalTwinComponentId) => void;
  focusTarget: 'overview' | DigitalTwinComponentId;
  resetCounter: number;
  recoveryPulse: boolean;
  reducedMotion: boolean;
  hourDecimal: number;
  capacityKw: number;
  activeFaultCode: string;
  explodedInverter: boolean;
  layers: TwinLayerVisibility;
  calloutRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}

const SolarInstallationScene: React.FC<SolarInstallationSceneProps> = ({
  components,
  selectedId,
  onSelect,
  focusTarget,
  resetCounter,
  recoveryPulse,
  reducedMotion,
  hourDecimal,
  capacityKw,
  activeFaultCode,
  explodedInverter,
  layers,
  calloutRefs,
}) => {
  const { invalidate, camera, size } = useThree();
  const frameInstancedRef = useRef<THREE.InstancedMesh | null>(null);
  const cellInstancedRef = useRef<THREE.InstancedMesh | null>(null);
  const projVec = useMemo(() => new THREE.Vector3(), []);

  const backplateRef = useRef<THREE.Group | null>(null);
  const heatsinkRef = useRef<THREE.Group | null>(null);
  const powerCoreRef = useRef<THREE.Group | null>(null);
  const bezelRef = useRef<THREE.Group | null>(null);

  const statusOf = (id: DigitalTwinComponentId): ComponentHealthStatus => {
    if (recoveryPulse) return 'resolved';
    return components.find((c) => c.twinId === id)?.status || 'nominal';
  };

  const pvStatus = statusOf('solar_panel');
  const invStatus = statusOf('inverter');
  const batStatus = statusOf('battery');
  const connStatus = statusOf('connection');
  const gridStatus = statusOf('grid_meter');
  const loadStatus = statusOf('site_load');

  const simTelemetry = useMemo(
    () =>
      computeSimulatedTwinTelemetry({
        capacityKw,
        hourDecimal,
        inverterFault: !recoveryPulse && (invStatus === 'fault' || invStatus === 'warning'),
        gridFault: !recoveryPulse && (gridStatus === 'fault' || gridStatus === 'warning'),
        stringFault: !recoveryPulse && (pvStatus === 'fault' || pvStatus === 'warning'),
        batteryFault: !recoveryPulse && (batStatus === 'fault' || batStatus === 'warning'),
      }),
    [capacityKw, hourDecimal, recoveryPulse, invStatus, gridStatus, pvStatus, batStatus],
  );

  const roofTexture = useMemo(() => createRoofMembraneTexture(), []);
  const cellTexture = useMemo(() => createSolarCellTexture(), []);
  const lcdTexture = useMemo(
    () =>
      createLcdTexture({
        status: invStatus,
        recoveryPulse,
        faultCode: activeFaultCode,
        observedKw: simTelemetry.observedKw,
        irradianceWm2: simTelemetry.irradianceWm2,
      }),
    [invStatus, recoveryPulse, activeFaultCode, simTelemetry.observedKw, simTelemetry.irradianceWm2],
  );

  useEffect(() => () => roofTexture.dispose(), [roofTexture]);
  useEffect(() => () => cellTexture.dispose(), [cellTexture]);
  useEffect(() => () => lcdTexture.dispose(), [lcdTexture]);

  // Populate 120 instanced PV frames + cell faces
  useEffect(() => {
    const frames = frameInstancedRef.current;
    const cells = cellInstancedRef.current;
    if (!frames || !cells) return;

    const dummy = new THREE.Object3D();
    const healthyColor = new THREE.Color(TOKENS.scene.cellBaseDark).lerp(
      new THREE.Color(TOKENS.sky),
      0.16 + simTelemetry.irradianceFactor * 0.28,
    );
    const selectedTint = new THREE.Color(TOKENS.brass).lerp(healthyColor, 0.55);
    const faultTint = new THREE.Color(TOKENS.terracotta);
    const warnTint = new THREE.Color(TOKENS.amberWarn);
    const resolvedTint = new THREE.Color(TOKENS.mint).lerp(healthyColor, 0.65);

    const pvFaulted = !recoveryPulse && (pvStatus === 'fault' || pvStatus === 'warning');

    PV_PLACEMENTS.forEach((mod, idx) => {
      dummy.position.set(mod.pos[0], mod.pos[1], mod.pos[2]);
      dummy.rotation.set(-0.19, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      frames.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(mod.pos[0], mod.pos[1] + 0.012, mod.pos[2]);
      dummy.updateMatrix();
      cells.setMatrixAt(idx, dummy.matrix);

      // String 4 (index 3) shows localized impairment when STR-LOW is active
      if (recoveryPulse) {
        cells.setColorAt(idx, resolvedTint);
      } else if (pvFaulted && mod.stringIndex === 3) {
        cells.setColorAt(idx, pvStatus === 'fault' ? faultTint : warnTint);
      } else if (selectedId === 'solar_panel') {
        cells.setColorAt(idx, selectedTint);
      } else {
        cells.setColorAt(idx, healthyColor);
      }
    });

    frames.instanceMatrix.needsUpdate = true;
    cells.instanceMatrix.needsUpdate = true;
    if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
    frames.computeBoundingSphere();
    cells.computeBoundingSphere();
    invalidate();
  }, [
    pvStatus,
    selectedId,
    recoveryPulse,
    simTelemetry.irradianceFactor,
    layers.strings,
    invalidate,
  ]);

  useEffect(() => {
    invalidate();
  }, [explodedInverter, layers, hourDecimal, activeFaultCode, recoveryPulse, selectedId, invalidate]);

  // Animate Inverter Exploded View + project DOM callouts cleanly without React 19 root unmount races
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const target = explodedInverter ? 1 : 0;
    const dampOrSnap = (curr: number, goal: number) =>
      reducedMotion ? goal : THREE.MathUtils.damp(curr, goal, 7, dt);

    let animatingExplode = false;
    const applyZ = (grp: THREE.Group | null, goal: number) => {
      if (!grp) return;
      const next = dampOrSnap(grp.position.z, goal);
      grp.position.z = next;
      if (Math.abs(next - goal) > 0.002) {
        animatingExplode = true;
      } else {
        grp.position.z = goal;
      }
    };

    applyZ(backplateRef.current, target * -0.52);
    applyZ(heatsinkRef.current, target * -0.16);
    applyZ(powerCoreRef.current, target * 0.28);
    applyZ(bezelRef.current, target * 0.86);

    if (animatingExplode) {
      invalidate();
    }

    if (layers.labels) {
      for (const item of SUBSYSTEM_ANCHORS) {
        const el = calloutRefs.current[item.key];
        if (!el) continue;
        projVec.set(item.anchor[0], item.anchor[1], item.anchor[2]).project(camera);
        const visible = projVec.z < 1 && projVec.z > -1;
        const x = (projVec.x * 0.5 + 0.5) * size.width;
        const y = (-projVec.y * 0.5 + 0.5) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = visible ? '1' : '0';
        el.style.pointerEvents = visible ? 'auto' : 'none';
      }

      if (explodedInverter) {
        const expAnchors: ProjectedCalloutDef[] = [
          { key: 'exp_backplate', anchor: [10.1, ROOF_Y + 2.15, -1.85] },
          { key: 'exp_heatsink', anchor: [13.2, ROOF_Y + 2.0, -1.36] },
          { key: 'exp_core', anchor: [9.8, ROOF_Y + 0.95, -0.82] },
          { key: 'exp_bezel', anchor: [13.3, ROOF_Y + 0.72, -0.15] },
        ];
        for (const item of expAnchors) {
          const el = calloutRefs.current[item.key];
          if (!el) continue;
          projVec.set(item.anchor[0], item.anchor[1], item.anchor[2]).project(camera);
          const visible = projVec.z < 1 && projVec.z > -1;
          const x = (projVec.x * 0.5 + 0.5) * size.width;
          const y = (-projVec.y * 0.5 + 0.5) * size.height;
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
          el.style.opacity = visible ? '1' : '0';
        }
      }
    }
  });

  // Sun angle tracks simulated hourDecimal (06:00 East -> 12:00 Overhead -> 18:00 West)
  const sunAngle = ((hourDecimal - 6) / 12) * Math.PI;
  const sunX = -Math.cos(sunAngle) * 26;
  const sunY = 6 + Math.sin(sunAngle) * 22;

  const dcTubeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4, ROOF_Y + 0.14, -3.2),
      new THREE.Vector3(7.4, ROOF_Y + 0.14, -3.2),
      new THREE.Vector3(7.4, ROOF_Y + 0.14, -1.2),
      new THREE.Vector3(11.1, ROOF_Y + 0.45, -1.2),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.075, 8, false);
  }, []);

  const acTubeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(11.6, ROOF_Y + 0.45, -0.7),
      new THREE.Vector3(11.8, ROOF_Y + 0.14, 1.8),
      new THREE.Vector3(12.0, ROOF_Y + 0.45, 4.1),
      new THREE.Vector3(16.8, ROOF_Y + 0.85, 4.2),
      new THREE.Vector3(20.4, 5.2, 4.2),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.07, 8, false);
  }, []);

  const loadTubeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(11.6, ROOF_Y + 0.14, 4.2),
      new THREE.Vector3(5.0, ROOF_Y + 0.14, 6.2),
      new THREE.Vector3(-2.0, ROOF_Y + 0.14, 7.2),
      new THREE.Vector3(-6.2, ROOF_Y + 0.45, 7.2),
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.065, 8, false);
  }, []);

  useEffect(() => {
    return () => {
      dcTubeGeo.dispose();
      acTubeGeo.dispose();
      loadTubeGeo.dispose();
    };
  }, [dcTubeGeo, acTubeGeo, loadTubeGeo]);

  const downstreamHalted = !recoveryPulse && (invStatus === 'fault' || gridStatus === 'fault');
  const dcFaulted = !recoveryPulse && (connStatus === 'fault' || connStatus === 'warning' || pvStatus !== 'nominal');
  const batHalted = !recoveryPulse && (batStatus === 'fault' || batStatus === 'warning' || invStatus === 'fault');

  return (
    <>
      <color attach="background" args={[TOKENS.scene.skyBackdrop]} />
      <fog attach="fog" args={[TOKENS.scene.skyBackdrop, 38, 84]} />

      <SceneEnvironmentAndControls
        focusTarget={focusTarget}
        resetCounter={resetCounter}
        reducedMotion={reducedMotion}
      />

      {/* Balanced Hemisphere + Sun Directional Light */}
      <hemisphereLight args={[TOKENS.bone, TOKENS.mossDeep, 0.55]} />
      <directionalLight
        position={[sunX, sunY, 14]}
        intensity={1.1 + simTelemetry.irradianceFactor * 1.15}
        color={TOKENS.bone}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={2}
        shadow-camera-far={65}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Ground Site Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color={TOKENS.ink} roughness={0.95} metalness={0} />
      </mesh>

      {/* Commercial Building Mass (34 x 22 x 3.2 m) */}
      <mesh position={[0, ROOF_Y / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[34.2, ROOF_Y, 22.2]} />
        <meshStandardMaterial color={TOKENS.moss} roughness={0.88} metalness={0.05} />
      </mesh>

      {/* Subtle Architectural Facade Trim Band */}
      <mesh position={[0, ROOF_Y * 0.55, 0]}>
        <boxGeometry args={[34.35, 0.25, 22.35]} />
        <meshStandardMaterial color={TOKENS.scene.rackingSteel} roughness={0.6} metalness={0.35} />
      </mesh>

      {/* Rooftop Membrane Deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ROOF_Y + 0.01, 0]} receiveShadow>
        <planeGeometry args={[34, 22]} />
        <meshStandardMaterial map={roofTexture} roughness={0.92} metalness={0.04} />
      </mesh>

      {/* Perimeter Parapet Walls (0.65m tall) */}
      {[
        { pos: [0, ROOF_Y + 0.32, -10.85] as [number, number, number], size: [34, 0.65, 0.32] as [number, number, number] },
        { pos: [0, ROOF_Y + 0.32, 10.85] as [number, number, number], size: [34, 0.65, 0.32] as [number, number, number] },
        { pos: [-16.85, ROOF_Y + 0.32, 0] as [number, number, number], size: [0.32, 0.65, 22] as [number, number, number] },
        { pos: [16.85, ROOF_Y + 0.32, 0] as [number, number, number], size: [0.32, 0.65, 22] as [number, number, number] },
      ].map((p, idx) => (
        <mesh key={idx} position={p.pos} castShadow receiveShadow>
          <boxGeometry args={p.size} />
          <meshStandardMaterial color={TOKENS.scene.parapetConcrete} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}

      {/* 4 Corner Roof Drains */}
      {[
        [-15.6, ROOF_Y + 0.03, -9.6],
        [15.6, ROOF_Y + 0.03, -9.6],
        [-15.6, ROOF_Y + 0.03, 9.6],
        [15.6, ROOF_Y + 0.03, 9.6],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
          <meshStandardMaterial color={TOKENS.scene.rackingSteel} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}

      {/* Equipment Pad (East Deck) */}
      <mesh position={[11.8, ROOF_Y + 0.07, -0.8]} receiveShadow>
        <boxGeometry args={[6.4, 0.14, 15.0]} />
        <meshStandardMaterial color={TOKENS.scene.equipmentPad} roughness={0.85} metalness={0.08} />
      </mesh>

      {/* PV Array (120 Instanced Modules across 6 strings × 20 modules) */}
      {layers.strings && (
        <group
          onClick={(e) => {
            e.stopPropagation();
            onSelect('solar_panel');
          }}
        >
          {/* Steel Ballast Racking Rails beneath the 3 rows */}
          {[-7.2, -3.2, 0.8].map((rz, rIdx) => (
            <group key={rIdx}>
              <mesh position={[-9.2, ROOF_Y + 0.25, rz]} castShadow>
                <boxGeometry args={[9.2, 0.18, 2.5]} />
                <meshStandardMaterial color={TOKENS.scene.rackingSteel} roughness={0.5} metalness={0.65} />
              </mesh>
              <mesh position={[2.2, ROOF_Y + 0.25, rz]} castShadow>
                <boxGeometry args={[9.2, 0.18, 2.5]} />
                <meshStandardMaterial color={TOKENS.scene.rackingSteel} roughness={0.5} metalness={0.65} />
              </mesh>
            </group>
          ))}

          <instancedMesh ref={frameInstancedRef} args={[undefined, undefined, 120]} castShadow>
            <boxGeometry args={[0.87, 0.045, 1.45]} />
            <meshStandardMaterial color={TOKENS.scene.aluminumFrame} roughness={0.34} metalness={0.72} />
          </instancedMesh>

          <instancedMesh ref={cellInstancedRef} args={[undefined, undefined, 120]} receiveShadow>
            <boxGeometry args={[0.81, 0.05, 1.38]} />
            <meshStandardMaterial
              map={cellTexture}
              color="#FFFFFF"
              roughness={0.22}
              metalness={0.25}
            />
          </instancedMesh>
        </group>
      )}

      {/* 2 String Combiner Boxes & DC Conduit Raceway */}
      {layers.dcWiring && (
        <group
          onClick={(e) => {
            e.stopPropagation();
            onSelect('connection');
          }}
        >
          {[-5.2, 0.8].map((cz, idx) => (
            <mesh key={idx} position={[7.4, ROOF_Y + 0.55, cz]} castShadow>
              <boxGeometry args={[0.62, 0.9, 0.52]} />
              <meshStandardMaterial
                color={selectedId === 'connection' ? TOKENS.brass : TOKENS.scene.inverterChassis}
                roughness={0.48}
                metalness={0.45}
              />
            </mesh>
          ))}

          <mesh geometry={dcTubeGeo}>
            <meshStandardMaterial
              color={dcFaulted ? TOKENS.scene.conduitFault : TOKENS.scene.conduitNominal}
              roughness={0.5}
              metalness={0.45}
            />
          </mesh>
        </group>
      )}

      {/* Hybrid String Inverter (40 kW AC Class) with Smooth Exploded Mechanical View */}
      <group
        position={[11.6, ROOF_Y + 1.05, -1.2]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect('inverter');
        }}
      >
        {/* Status Frame Halo */}
        <mesh position={[0, -0.92, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1.06, 32]} />
          <meshStandardMaterial
            color={statusHex(invStatus, recoveryPulse)}
            emissive={statusHex(invStatus, recoveryPulse)}
            emissiveIntensity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 1. Mounting Backplate */}
        <group ref={backplateRef}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.45, 1.75, 0.14]} />
            <meshStandardMaterial color={TOKENS.scene.rackingSteel} roughness={0.55} metalness={0.6} />
          </mesh>
        </group>

        {/* 2. Heatsink Cooling Fins */}
        <group ref={heatsinkRef}>
          {[-0.5, -0.33, -0.16, 0, 0.16, 0.33, 0.5].map((fx, idx) => (
            <mesh key={idx} position={[fx, 0, 0]} castShadow>
              <boxGeometry args={[0.06, 1.5, 0.22]} />
              <meshStandardMaterial color={TOKENS.scene.inverterHeatsink} roughness={0.38} metalness={0.78} />
            </mesh>
          ))}
        </group>

        {/* 3. Power Electronics Core (MPPT Chokes + Busbars) */}
        <group ref={powerCoreRef}>
          <mesh castShadow>
            <boxGeometry args={[1.25, 1.48, 0.28]} />
            <meshStandardMaterial color={TOKENS.scene.inverterChassis} roughness={0.48} metalness={0.45} />
          </mesh>
          <mesh position={[-0.3, 0.25, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.055, 10, 20]} />
            <meshStandardMaterial color={TOKENS.brass} roughness={0.35} metalness={0.75} />
          </mesh>
          <mesh position={[0.3, 0.25, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.055, 10, 20]} />
            <meshStandardMaterial color={TOKENS.brass} roughness={0.35} metalness={0.75} />
          </mesh>
        </group>

        {/* 4. Front Bezel & Reactive LCD Display */}
        <group ref={bezelRef}>
          <mesh castShadow>
            <boxGeometry args={[1.38, 1.66, 0.12]} />
            <meshStandardMaterial
              color={selectedId === 'inverter' ? TOKENS.scene.batteryEnclosure : TOKENS.scene.inverterChassis}
              roughness={0.4}
              metalness={0.35}
            />
          </mesh>
          <mesh position={[0, 0.22, 0.068]}>
            <planeGeometry args={[0.96, 0.48]} />
            <meshBasicMaterial map={lcdTexture} />
          </mesh>
        </group>
      </group>

      {/* LFP Battery Rack Enclosure (VoltVault LFP-60 [DEMO]) */}
      <group
        position={[12.0, ROOF_Y + 0.98, -5.0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect('battery');
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.8, 1.72, 1.4]} />
          <meshStandardMaterial color={TOKENS.scene.batteryEnclosure} roughness={0.48} metalness={0.38} />
        </mesh>
        {/* Modular LFP Tier Slots */}
        {[-0.45, -0.15, 0.15, 0.45].map((by, idx) => (
          <mesh key={idx} position={[0, by, 0.72]}>
            <boxGeometry args={[1.38, 0.16, 0.04]} />
            <meshStandardMaterial color={TOKENS.scene.inverterHeatsink} roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
        {/* Status Indicator Strip */}
        <mesh position={[0, 0.7, 0.72]}>
          <boxGeometry args={[1.1, 0.06, 0.04]} />
          <meshStandardMaterial
            color={statusHex(batStatus, recoveryPulse)}
            emissive={statusHex(batStatus, recoveryPulse)}
            emissiveIntensity={0.65}
          />
        </mesh>
      </group>

      {/* AC Disconnect & Grid Tie Meter + Off-Roof Utility Pole & Transformer */}
      {layers.acPath && (
        <group>
          <mesh geometry={acTubeGeo}>
            <meshStandardMaterial
              color={downstreamHalted ? TOKENS.scene.conduitFault : TOKENS.scene.conduitNominal}
              roughness={0.5}
              metalness={0.45}
            />
          </mesh>

          {/* AC Disconnect & Meter Cabinet */}
          <group
            position={[12.0, ROOF_Y + 0.85, 4.2]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect('grid_meter');
            }}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.05, 1.45, 0.75]} />
              <meshStandardMaterial color={TOKENS.scene.inverterChassis} roughness={0.5} metalness={0.42} />
            </mesh>
            <mesh position={[0, 0.2, 0.39]}>
              <cylinderGeometry args={[0.2, 0.2, 0.06, 20]} />
              <meshStandardMaterial
                color={statusHex(gridStatus, recoveryPulse)}
                emissive={statusHex(gridStatus, recoveryPulse)}
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>

          {/* Background Utility Pole & Pole-Mounted Transformer */}
          <group position={[20.6, 0, 4.2]}>
            <mesh position={[0, 4.4, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.24, 8.8, 12]} />
              <meshStandardMaterial color={TOKENS.scene.utilityPole} roughness={0.9} metalness={0.05} />
            </mesh>
            <mesh position={[0, 8.1, 0]}>
              <boxGeometry args={[0.2, 0.2, 2.4]} />
              <meshStandardMaterial color={TOKENS.scene.utilityPole} roughness={0.85} metalness={0.1} />
            </mesh>
            <mesh position={[-0.45, 6.2, 0]} castShadow>
              <cylinderGeometry args={[0.42, 0.42, 1.15, 16]} />
              <meshStandardMaterial color={TOKENS.scene.transformerBody} roughness={0.55} metalness={0.5} />
            </mesh>
          </group>
        </group>
      )}

      {/* Commercial HVAC Rooftop Unit (Site Load) */}
      {layers.siteLoad && (
        <group>
          <mesh geometry={loadTubeGeo}>
            <meshStandardMaterial
              color={downstreamHalted ? TOKENS.scene.conduitFault : TOKENS.scene.conduitNominal}
              roughness={0.5}
              metalness={0.45}
            />
          </mesh>

          <group
            position={[-7.5, ROOF_Y + 0.72, 7.2]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect('site_load');
            }}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[3.4, 1.25, 2.1]} />
              <meshStandardMaterial color={TOKENS.scene.hvacUnit} roughness={0.55} metalness={0.35} />
            </mesh>
            {/* Condenser Fan Shrouds */}
            {[-0.85, 0.85].map((fx, idx) => (
              <mesh key={idx} position={[fx, 0.65, 0]}>
                <cylinderGeometry args={[0.58, 0.62, 0.14, 20]} />
                <meshStandardMaterial color={TOKENS.scene.rackingSteel} roughness={0.4} metalness={0.65} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* Planter Framing Around Building Base */}
      {[
        [-18.6, 0.4, -7],
        [-18.6, 0.4, 7],
      ].map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          <mesh receiveShadow>
            <boxGeometry args={[1.4, 0.7, 5.5]} />
            <meshStandardMaterial color={TOKENS.scene.parapetConcrete} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[1.0, 0.5, 4.9]} />
            <meshStandardMaterial color={TOKENS.scene.planterFoliage} roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* Energy Flow Particles */}
      <EnergyPulses
        dcActive={layers.dcWiring && simTelemetry.irradianceFactor > 0.05}
        acActive={layers.acPath && !downstreamHalted && simTelemetry.observedKw > 0}
        batActive={!batHalted && simTelemetry.irradianceFactor > 0.1}
        loadActive={layers.siteLoad && !downstreamHalted && simTelemetry.observedKw > 0}
        dcFault={dcFaulted}
        acFault={downstreamHalted}
        irradianceFactor={simTelemetry.irradianceFactor}
        visible={layers.energyFlow}
        reducedMotion={reducedMotion}
      />
    </>
  );
};

export interface SolarDigitalTwin3DProps {
  components: AssetComponent[];
  selectedComponentId: DigitalTwinComponentId;
  onSelectComponent?: (id: DigitalTwinComponentId) => void;
  recoveryPulse?: boolean;
  scenarioOptions?: SimulatedFaultScenario[];
  activeScenarioId?: string;
  onChangeScenario?: (scenarioId: string) => void;
  compact?: boolean;
  capacityKw?: number;
  hourDecimal?: number;
  onChangeHourDecimal?: (hour: number) => void;
}

export const SolarDigitalTwin3D: React.FC<SolarDigitalTwin3DProps> = ({
  components,
  selectedComponentId,
  onSelectComponent,
  recoveryPulse = false,
  scenarioOptions,
  activeScenarioId,
  onChangeScenario,
  compact = false,
  capacityKw = 48,
  hourDecimal: externalHourDecimal,
  onChangeHourDecimal,
}) => {
  const [internalHourDecimal, setInternalHourDecimal] = useState(12.5);
  const hourDecimal = externalHourDecimal ?? internalHourDecimal;
  const setHourDecimal = (val: number) => {
    setInternalHourDecimal(val);
    onChangeHourDecimal?.(val);
  };

  const [focusTarget, setFocusTarget] = useState<'overview' | DigitalTwinComponentId>('overview');
  const [resetCounter, setResetCounter] = useState(0);
  const [forceSchematic, setForceSchematic] = useState(!hasWebGLSupport);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [explodedInverter, setExplodedInverter] = useState(false);
  const [layers, setLayers] = useState<TwinLayerVisibility>({
    strings: true,
    dcWiring: true,
    acPath: true,
    siteLoad: true,
    labels: true,
    energyFlow: true,
  });

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const activeScenario = scenarioOptions?.find((s) => s.id === activeScenarioId);

  const handleSelect = (id: DigitalTwinComponentId) => {
    onSelectComponent?.(id);
    setFocusTarget(id);
    if (id === 'inverter') {
      setExplodedInverter(true);
    }
  };

  const handleReset = () => {
    setFocusTarget('overview');
    setExplodedInverter(false);
    setResetCounter((c) => c + 1);
  };

  const statusOf = (id: DigitalTwinComponentId) =>
    recoveryPulse ? 'resolved' : components.find((c) => c.twinId === id)?.status || 'nominal';

  const simTelemetry = computeSimulatedTwinTelemetry({
    capacityKw,
    hourDecimal,
    inverterFault: !recoveryPulse && (statusOf('inverter') === 'fault' || statusOf('inverter') === 'warning'),
    gridFault: !recoveryPulse && (statusOf('grid_meter') === 'fault' || statusOf('grid_meter') === 'warning'),
    stringFault: !recoveryPulse && (statusOf('solar_panel') === 'fault' || statusOf('solar_panel') === 'warning'),
    batteryFault: !recoveryPulse && (statusOf('battery') === 'fault' || statusOf('battery') === 'warning'),
  });

  const calloutRefs = useRef<Record<string, HTMLElement | null>>({});
  const setCalloutRef = (key: string) => (el: HTMLElement | null) => {
    calloutRefs.current[key] = el;
  };

  if (forceSchematic) {
    return (
      <SolarTwinSvg2D
        components={components}
        selectedComponentId={selectedComponentId}
        onSelectComponent={handleSelect}
        recoveryPulse={recoveryPulse}
        capacityKw={capacityKw}
        hourDecimal={hourDecimal}
        onChangeHourDecimal={setHourDecimal}
        activeScenario={activeScenario}
        scenarioOptions={scenarioOptions}
        activeScenarioId={activeScenarioId}
        onChangeScenario={onChangeScenario}
        canSwitchTo3D={hasWebGLSupport}
        onSwitchTo3D={() => setForceSchematic(false)}
        compact={compact}
        showLabels={layers.labels}
      />
    );
  }

  return (
    <div
      data-testid="digital-twin-canvas-container"
      data-selected-component={selectedComponentId}
      className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden border"
      style={{
        backgroundColor: TOKENS.mossDeep,
        borderColor: TOKENS.hairlineStrong,
      }}
    >
      <Canvas
        dpr={isSoftwareGl ? 1 : [1, 1.75]}
        shadows={!isSoftwareGl}
        frameloop={isSoftwareGl || prefersReducedMotion ? 'demand' : 'always'}
        camera={{ position: CAMERA_PRESETS.overview.pos, fov: 40, near: 0.2, far: 140 }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.06,
        }}
      >
        <SolarInstallationScene
          components={components}
          selectedId={selectedComponentId}
          onSelect={handleSelect}
          focusTarget={focusTarget}
          resetCounter={resetCounter}
          recoveryPulse={recoveryPulse}
          reducedMotion={prefersReducedMotion}
          hourDecimal={hourDecimal}
          capacityKw={capacityKw}
          activeFaultCode={activeScenario?.faultCode || ''}
          explodedInverter={explodedInverter}
          layers={layers}
          calloutRefs={calloutRefs}
        />
      </Canvas>

      {/* Projected 3D Subsystem Callout Overlay (zero nested createRoot, React 19 safe) */}
      {layers.labels && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {layers.strings && (
            <button
              ref={setCalloutRef('solar_panel')}
              type="button"
              onClick={() => handleSelect('solar_panel')}
              className="pointer-events-auto absolute top-0 left-0 px-2 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap transition-colors"
              style={{
                backgroundColor: selectedComponentId === 'solar_panel' ? TOKENS.brass : TOKENS.mossDeep,
                borderColor: statusHex(statusOf('solar_panel'), recoveryPulse),
                color: selectedComponentId === 'solar_panel' ? TOKENS.ink : TOKENS.bone,
              }}
            >
              PV · 48 kWp (120 Mod)
            </button>
          )}
          {layers.dcWiring && (
            <button
              ref={setCalloutRef('connection')}
              type="button"
              onClick={() => handleSelect('connection')}
              className="pointer-events-auto absolute top-0 left-0 px-2 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap transition-colors"
              style={{
                backgroundColor: selectedComponentId === 'connection' ? TOKENS.brass : TOKENS.mossDeep,
                borderColor: statusHex(statusOf('connection'), recoveryPulse),
                color: selectedComponentId === 'connection' ? TOKENS.ink : TOKENS.bone,
              }}
            >
              2× Combiners & DC Bus
            </button>
          )}
          <button
            ref={setCalloutRef('battery')}
            type="button"
            onClick={() => handleSelect('battery')}
            className="pointer-events-auto absolute top-0 left-0 px-2 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap transition-colors"
            style={{
              backgroundColor: selectedComponentId === 'battery' ? TOKENS.brass : TOKENS.mossDeep,
              borderColor: statusHex(statusOf('battery'), recoveryPulse),
              color: selectedComponentId === 'battery' ? TOKENS.ink : TOKENS.bone,
            }}
          >
            LFP 60 kWh [DEMO]
          </button>
          {!explodedInverter && (
            <button
              ref={setCalloutRef('inverter')}
              type="button"
              onClick={() => handleSelect('inverter')}
              className="pointer-events-auto absolute top-0 left-0 px-2 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap transition-colors"
              style={{
                backgroundColor: selectedComponentId === 'inverter' ? TOKENS.brass : TOKENS.mossDeep,
                borderColor: statusHex(statusOf('inverter'), recoveryPulse),
                color: selectedComponentId === 'inverter' ? TOKENS.ink : TOKENS.bone,
              }}
            >
              Inverter 40 kW · {statusOf('inverter').toUpperCase()}
            </button>
          )}
          {layers.acPath && (
            <button
              ref={setCalloutRef('grid_meter')}
              type="button"
              onClick={() => handleSelect('grid_meter')}
              className="pointer-events-auto absolute top-0 left-0 px-2 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap transition-colors"
              style={{
                backgroundColor: selectedComponentId === 'grid_meter' ? TOKENS.brass : TOKENS.mossDeep,
                borderColor: statusHex(statusOf('grid_meter'), recoveryPulse),
                color: selectedComponentId === 'grid_meter' ? TOKENS.ink : TOKENS.bone,
              }}
            >
              AC Grid Tie
            </button>
          )}
          {layers.siteLoad && (
            <button
              ref={setCalloutRef('site_load')}
              type="button"
              onClick={() => handleSelect('site_load')}
              className="pointer-events-auto absolute top-0 left-0 px-2 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap transition-colors"
              style={{
                backgroundColor: selectedComponentId === 'site_load' ? TOKENS.brass : TOKENS.mossDeep,
                borderColor: statusHex(statusOf('site_load'), recoveryPulse),
                color: selectedComponentId === 'site_load' ? TOKENS.ink : TOKENS.bone,
              }}
            >
              HVAC Load
            </button>
          )}

          {explodedInverter && (
            <>
              <span
                ref={setCalloutRef('exp_backplate')}
                className="absolute top-0 left-0 px-1.5 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}
              >
                Mounting Backplate
              </span>
              <span
                ref={setCalloutRef('exp_heatsink')}
                className="absolute top-0 left-0 px-1.5 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}
              >
                Heatsink Fins
              </span>
              <span
                ref={setCalloutRef('exp_core')}
                className="absolute top-0 left-0 px-1.5 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.brass, color: TOKENS.brass }}
              >
                Power Electronics Core
              </span>
              <span
                ref={setCalloutRef('exp_bezel')}
                className="absolute top-0 left-0 px-1.5 py-0.5 rounded border text-[10px] font-mono-tech whitespace-nowrap"
                style={{
                  backgroundColor: TOKENS.mossDeep,
                  borderColor: statusHex(statusOf('inverter'), recoveryPulse),
                  color: TOKENS.bone,
                }}
              >
                Front Bezel & LCD
              </span>
            </>
          )}
        </div>
      )}

      {/* Top HUD Bar: Spec Readout + Compact Controls (flex-wrap prevents 390px mobile overlap) */}
      <div className="pointer-events-none absolute top-2.5 inset-x-2.5 flex flex-wrap items-start justify-between gap-2">
        <div
          className="flex flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2"
          style={{
            backgroundColor: TOKENS.mossDeep,
            borderColor: TOKENS.hairlineStrong,
          }}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium whitespace-nowrap" style={{ color: TOKENS.bone }}>
              Mesa Ridge 48 kWp
            </span>
            <span style={{ color: TOKENS.sage }} aria-hidden="true">
              ·
            </span>
            <span className="font-mono-tech truncate" style={{ color: TOKENS.brass }}>
              {CAMERA_PRESETS[selectedComponentId]?.label || 'Overview'}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono-tech tabular-nums" style={{ color: TOKENS.sage }}>
            SIMULATED ({formatHourLabel(hourDecimal)}): {simTelemetry.irradianceWm2} W/m² · OBS{' '}
            <span style={{ color: simTelemetry.observedKw < simTelemetry.expectedKw ? TOKENS.terracotta : TOKENS.mint }}>
              {simTelemetry.observedKw}
            </span>
            /{simTelemetry.expectedKw} kW
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            aria-label="Toggle exploded inverter enclosure"
            onClick={() => {
              setExplodedInverter((prev) => {
                const next = !prev;
                if (next) {
                  setFocusTarget('inverter');
                  onSelectComponent?.('inverter');
                }
                return next;
              });
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors whitespace-nowrap"
            style={{
              backgroundColor: explodedInverter ? TOKENS.brass : TOKENS.mossDeep,
              borderColor: explodedInverter ? TOKENS.brass : TOKENS.hairlineStrong,
              color: explodedInverter ? TOKENS.ink : TOKENS.bone,
            }}
            title="Toggle exploded inverter enclosure view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explode Inverter</span>
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="Toggle 3D layer visibility"
              onClick={() => setShowLayersMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors whitespace-nowrap"
              style={{
                backgroundColor: TOKENS.mossDeep,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Layers</span>
            </button>

            {showLayersMenu && (
              <div
                className="absolute right-0 mt-1.5 w-48 rounded-lg border p-2.5 space-y-1.5 z-20"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                }}
              >
                {(
                  [
                    { key: 'strings', label: 'PV Strings (120)' },
                    { key: 'dcWiring', label: 'DC Wiring & Bus' },
                    { key: 'acPath', label: 'AC & Grid Tie' },
                    { key: 'siteLoad', label: 'HVAC Site Load' },
                    { key: 'labels', label: '3D Callouts' },
                    { key: 'energyFlow', label: 'Energy Flow' },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-2 text-xs cursor-pointer py-0.5"
                    style={{ color: TOKENS.bone }}
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={layers[item.key]}
                      onChange={(e) =>
                        setLayers((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      style={{ accentColor: TOKENS.brass }}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setForceSchematic(true)}
            className="px-2.5 py-1.5 rounded-lg border text-xs whitespace-nowrap"
            style={{
              backgroundColor: TOKENS.mossDeep,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.sage,
            }}
          >
            2D View
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset 3D camera"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs whitespace-nowrap"
            style={{
              backgroundColor: TOKENS.mossDeep,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.bone,
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Collapsible Unified Bottom Control Dock */}
      {!compact && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(95%,860px)] flex flex-col items-center pointer-events-none">
          <button
            type="button"
            onClick={() => setDockCollapsed((c) => !c)}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg border border-b-0 text-xs"
            style={{
              backgroundColor: TOKENS.mossRaised,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.sage,
            }}
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {dockCollapsed ? 'Show Controls' : 'Hide Controls'}
          </button>

          {!dockCollapsed && (
            <div
              className="pointer-events-auto w-full border rounded-xl p-3 space-y-2.5"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
              }}
            >
              {/* Camera Presets & Fault Scenario Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      'overview',
                      'solar_panel',
                      'inverter',
                      'battery',
                      'connection',
                      'grid_meter',
                      'site_load',
                    ] as const
                  ).map((presetKey) => {
                    const active = focusTarget === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => {
                          if (presetKey === 'overview') {
                            handleReset();
                          } else {
                            handleSelect(presetKey);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
                        style={{
                          backgroundColor: active ? TOKENS.brass : TOKENS.mossDeep,
                          color: active ? TOKENS.ink : TOKENS.sage,
                        }}
                      >
                        {CAMERA_PRESETS[presetKey].label}
                      </button>
                    );
                  })}
                </div>

                {scenarioOptions && onChangeScenario && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="twin-fault-scenario"
                      className="text-xs whitespace-nowrap"
                      style={{ color: TOKENS.sage }}
                    >
                      Scenario:
                    </label>
                    <select
                      id="twin-fault-scenario"
                      value={activeScenarioId}
                      onChange={(e) => onChangeScenario(e.target.value)}
                      className="rounded-md px-2.5 py-1.5 text-xs border max-w-[230px]"
                      style={{
                        backgroundColor: TOKENS.mossDeep,
                        borderColor: TOKENS.hairlineStrong,
                        color: TOKENS.bone,
                      }}
                    >
                      {scenarioOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Simulated Irradiance Time-of-Day Slider */}
              <div
                className="flex flex-wrap items-center gap-3 pt-2 border-t text-xs"
                style={{ borderColor: TOKENS.hairline }}
              >
                <div className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: TOKENS.brass }}>
                  <Sun className="w-3.5 h-3.5" />
                  <span className="font-mono-tech uppercase">
                    Simulated Solar Hour: {formatHourLabel(hourDecimal)}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Simulated solar hour from 06:00 to 18:00"
                  min={6}
                  max={18}
                  step={0.5}
                  value={hourDecimal}
                  onChange={(e) => setHourDecimal(Number.parseFloat(e.target.value))}
                  className="flex-1 min-w-[140px]"
                  style={{ accentColor: TOKENS.brass }}
                />
                <span className="font-mono-tech tabular-nums whitespace-nowrap" style={{ color: TOKENS.sage }}>
                  {simTelemetry.irradianceWm2} W/m² · Gap {simTelemetry.powerGapKw} kW [SIMULATED]
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
