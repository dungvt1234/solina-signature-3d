import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  ApartmentLayoutConfig,
  CameraMode,
  EYE_HEIGHT,
  LightingPreset,
  ROOM_ZONES,
  RoomZone,
  UnitType,
  detectRoomAt,
  getApartmentLayout,
} from '../scene/apartmentData';
import {
  FlycamWaypoint,
  MASTERPLAN_CAMERA_PRESETS,
  MasterplanCameraPreset,
  ProjectUnit,
  WorldMode,
  compassBearingToWorldDir,
  getUnitBalconyView,
  worldDirToCompassBearing,
} from '../scene/masterplanData';
import { createProceduralTextures } from '../scene/textures';
import { createMaterialLibrary } from '../scene/furniture';
import { BuiltApartment, buildSolinaApartment } from '../scene/buildApartment';
import { BuiltMasterplan, buildSolinaMasterplan } from '../scene/buildMasterplan';
import {
  CollisionContext,
  buildCollisionContext,
  resolveLandscapeCollision,
  resolvePlayerCollision,
} from '../scene/collision';

export interface PlayerTelemetry {
  x: number;
  z: number;
  yaw: number;
  currentRoom: RoomZone;
}

export interface MoveInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up?: boolean;
  down?: boolean;
}

interface ApartmentCanvasProps {
  worldMode: WorldMode;
  cameraMode: CameraMode;
  lightingPreset: LightingPreset;
  showCeilingInDollhouse: boolean;
  selectedUnit: ProjectUnit;
  selectedFloor: number;
  masterplanPreset: MasterplanCameraPreset;
  unitPanoramaMode?: boolean;
  satelliteOverlay?: boolean;
  showSurroundingsHighlights?: boolean;
  flycamAutoOrbit?: boolean;
  flycamOrbitMode?: 'close' | 'high_lap';
  flycamLapNonce?: number;
  flycamWaypointTarget?: { waypoint: FlycamWaypoint; nonce: number } | null;
  lookBearingTarget?: { bearingDeg: number; nonce: number } | null;
  teleportTarget: { room: RoomZone; nonce: number } | null;
  moveInputRef: React.MutableRefObject<MoveInputState>;
  onRoomChange: (room: RoomZone) => void;
  onTelemetry: (t: PlayerTelemetry) => void;
  onRequestPovFromDollhouse: (room: RoomZone) => void;
  onSelectTowerFromMasterplan?: (tower: 'A' | 'B', clickedFloor?: number) => void;
  onHoverTowerFloor?: (info: { tower: 'A' | 'B'; floor: number } | null) => void;
  onCancelFlycamAutoOrbit?: () => void;
  onFlycamLapProgress?: (pct: number | null) => void;
  onCompleteFlycamLap?: () => void;
  onAltitudeChange?: (altMeters: number) => void;
  onMasterplanBearingChange?: (bearingDeg: number) => void;
}

// Pre-allocated math helpers (Zero GC in tick loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _orbitTargetGoal = new THREE.Vector3(0, 12, -2);
const _orbitCamGoal = new THREE.Vector3(-46, 38, 52);

export default function ApartmentCanvas({
  worldMode,
  cameraMode,
  lightingPreset,
  showCeilingInDollhouse,
  selectedUnit,
  selectedFloor,
  masterplanPreset,
  unitPanoramaMode = false,
  satelliteOverlay = false,
  showSurroundingsHighlights = false,
  flycamAutoOrbit = false,
  flycamOrbitMode = 'close',
  flycamLapNonce = 0,
  flycamWaypointTarget = null,
  lookBearingTarget = null,
  teleportTarget,
  moveInputRef,
  onRoomChange,
  onTelemetry,
  onRequestPovFromDollhouse,
  onSelectTowerFromMasterplan,
  onHoverTowerFloor,
  onCancelFlycamAutoOrbit,
  onFlycamLapProgress,
  onCompleteFlycamLap,
  onAltitudeChange,
  onMasterplanBearingChange,
}: ApartmentCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const worldModeRef = useRef<WorldMode>(worldMode);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  const lightingRef = useRef<LightingPreset>(lightingPreset);
  const ceilingDollhouseRef = useRef<boolean>(showCeilingInDollhouse);
  const unitRef = useRef<ProjectUnit>(selectedUnit);
  const floorRef = useRef<number>(selectedFloor);
  const masterPresetRef = useRef<MasterplanCameraPreset>(masterplanPreset);
  const unitPanoramaRef = useRef<boolean>(unitPanoramaMode);
  const satelliteOverlayRef = useRef<boolean>(satelliteOverlay);
  const highlightsVisibleRef = useRef<boolean>(showSurroundingsHighlights);
  const flycamAutoRef = useRef<boolean>(flycamAutoOrbit);
  const flycamOrbitModeRef = useRef<'close' | 'high_lap'>(flycamOrbitMode);
  const highLapStateRef = useRef<{
    t: number;
    startAngle: number;
    completed: boolean;
  }>({
    t: 0,
    startAngle: Math.PI * 0.82,
    completed: false,
  });

  const callbacksRef = useRef({
    onRoomChange,
    onTelemetry,
    onRequestPovFromDollhouse,
    onSelectTowerFromMasterplan,
    onHoverTowerFloor,
    onCancelFlycamAutoOrbit,
    onFlycamLapProgress,
    onCompleteFlycamLap,
    onAltitudeChange,
    onMasterplanBearingChange,
  });

  worldModeRef.current = worldMode;
  cameraModeRef.current = cameraMode;
  lightingRef.current = lightingPreset;
  ceilingDollhouseRef.current = showCeilingInDollhouse;
  unitRef.current = selectedUnit;
  floorRef.current = selectedFloor;
  masterPresetRef.current = masterplanPreset;
  unitPanoramaRef.current = unitPanoramaMode;
  satelliteOverlayRef.current = satelliteOverlay;
  highlightsVisibleRef.current = showSurroundingsHighlights;
  flycamAutoRef.current = flycamAutoOrbit;
  flycamOrbitModeRef.current = flycamOrbitMode;
  callbacksRef.current = {
    onRoomChange,
    onTelemetry,
    onRequestPovFromDollhouse,
    onSelectTowerFromMasterplan,
    onHoverTowerFloor,
    onCancelFlycamAutoOrbit,
    onFlycamLapProgress,
    onCompleteFlycamLap,
    onAltitudeChange,
    onMasterplanBearingChange,
  };

  const povStateRef = useRef({
    x: ROOM_ZONES[0].povSpawn.x,
    y: EYE_HEIGHT,
    z: ROOM_ZONES[0].povSpawn.z,
    yaw: ROOM_ZONES[0].povSpawn.yaw,
    pitch: ROOM_ZONES[0].povSpawn.pitch,
    targetYaw: ROOM_ZONES[0].povSpawn.yaw,
    targetPitch: ROOM_ZONES[0].povSpawn.pitch,
    glideActive: false,
    glideToX: ROOM_ZONES[0].povSpawn.x,
    glideToY: EYE_HEIGHT,
    glideToZ: ROOM_ZONES[0].povSpawn.z,
    walkBobPhase: 0,
    lastRoomId: ROOM_ZONES[0].id,
  });

  const applyLightingFnRef = useRef<((p: LightingPreset) => void) | null>(null);
  const syncAptModeFnRef = useRef<((m: CameraMode, showCeil: boolean) => void) | null>(
    null
  );
  const syncMasterPresetFnRef = useRef<((p: MasterplanCameraPreset) => void) | null>(
    null
  );
  const syncUnitPanoramaFnRef = useRef<
    ((active: boolean, unit: ProjectUnit, floor: number) => void) | null
  >(null);
  const rebuildWorldFnRef = useRef<
    ((mode: WorldMode, unitType: UnitType, floor: number) => void) | null
  >(null);
  const panoramaFovRef = useRef<number>(62);
  const lastPanoramaUnitRef = useRef<string | null>(null);

  // Track current world resources cleanly across swaps
  const worldStateRef = useRef<{
    masterplan: BuiltMasterplan | null;
    apartment: BuiltApartment | null;
    layout: ApartmentLayoutConfig;
    collisionCtx: CollisionContext;
  }>({
    masterplan: null,
    apartment: null,
    layout: getApartmentLayout(selectedUnit.type),
    collisionCtx: buildCollisionContext(getApartmentLayout(selectedUnit.type)),
  });

  // Trigger smooth camera glide when user picks a room from dock or minimap
  useEffect(() => {
    if (!teleportTarget || worldModeRef.current !== 'apartment') return;
    const { room } = teleportTarget;
    const s = povStateRef.current;

    if (cameraModeRef.current === 'pov') {
      s.glideActive = true;
      s.glideToX = room.povSpawn.x;
      s.glideToY = room.povSpawn.y;
      s.glideToZ = room.povSpawn.z;
      s.targetYaw = room.povSpawn.yaw;
      s.targetPitch = room.povSpawn.pitch;
    } else {
      _orbitTargetGoal.set(
        room.dollhouseFocus.x,
        room.dollhouseFocus.y,
        room.dollhouseFocus.z
      );
      _orbitCamGoal.set(
        room.dollhouseFocus.x + 2.8,
        6.8,
        room.dollhouseFocus.z + 6.8
      );
      s.glideActive = true;
    }
  }, [teleportTarget]);

  // Trigger smooth Flycam glide to a quick aerial waypoint
  useEffect(() => {
    if (!flycamWaypointTarget || worldModeRef.current !== 'masterplan') return;
    const { waypoint } = flycamWaypointTarget;
    const s = povStateRef.current;
    s.glideActive = true;
    s.glideToX = waypoint.position[0];
    s.glideToY = waypoint.position[1];
    s.glideToZ = waypoint.position[2];
    s.targetYaw = waypoint.yaw;
    s.targetPitch = waypoint.pitch;
  }, [flycamWaypointTarget]);

  // Reset 1-lap high-altitude panoramic tour from current camera azimuth
  useEffect(() => {
    if (flycamLapNonce <= 0) return;
    const s = povStateRef.current;
    const dist = Math.hypot(s.x - 35, s.z - 25);
    highLapStateRef.current = {
      t: 0,
      startAngle: dist > 60 ? Math.atan2(s.x - 35, s.z - 25) : Math.PI * 0.85,
      completed: false,
    };
    s.glideActive = false;
  }, [flycamLapNonce]);

  // Orient 3D camera toward a selected Vũng Tàu map bearing
  useEffect(() => {
    if (!lookBearingTarget || worldModeRef.current !== 'masterplan') return;
    const [dx, dz] = compassBearingToWorldDir(lookBearingTarget.bearingDeg);
    const s = povStateRef.current;
    const isManualPov =
      unitPanoramaRef.current ||
      Boolean(masterPresetRef.current.isPov) ||
      Boolean(masterPresetRef.current.isFlycam);

    if (isManualPov) {
      s.targetYaw = Math.atan2(-dx, -dz);
      if (masterPresetRef.current.isFlycam) {
        s.glideToX = s.x;
        s.glideToY = s.y;
        s.glideToZ = s.z;
        s.glideActive = true;
      }
    } else {
      _orbitTargetGoal.set(0, 11, -2);
      _orbitCamGoal.set(-dx * 62, 36, -dz * 62);
      s.glideActive = true;
    }
  }, [lookBearingTarget]);

  // Swap 3D world when switching between Masterplan & Apartment or changing Unit/Floor
  useEffect(() => {
    rebuildWorldFnRef.current?.(worldMode, selectedUnit.type, selectedFloor);
  }, [worldMode, selectedUnit.code, selectedUnit.type, selectedFloor]);

  // Toggle Vũng Tàu satellite ground map overlay dynamically
  useEffect(() => {
    if (worldMode === 'masterplan') {
      worldStateRef.current.masterplan?.setSatelliteOverlay(satelliteOverlay);
    }
  }, [worldMode, satelliteOverlay]);

  // Toggle surrounding amenities & infrastructure highlights dynamically
  useEffect(() => {
    if (worldMode === 'masterplan') {
      worldStateRef.current.masterplan?.setHighlightsVisible(
        showSurroundingsHighlights
      );
    }
  }, [worldMode, showSurroundingsHighlights]);

  // Apply lighting preset dynamically
  useEffect(() => {
    applyLightingFnRef.current?.(lightingPreset);
  }, [lightingPreset]);

  // Apply Masterplan camera preset or Unit Balcony Panorama
  useEffect(() => {
    if (worldMode !== 'masterplan') {
      lastPanoramaUnitRef.current = null;
      return;
    }
    if (unitPanoramaMode) {
      syncUnitPanoramaFnRef.current?.(true, selectedUnit, selectedFloor);
    } else {
      lastPanoramaUnitRef.current = null;
      syncMasterPresetFnRef.current?.(masterplanPreset);
    }
  }, [worldMode, masterplanPreset, unitPanoramaMode, selectedUnit, selectedFloor]);

  // Toggle ceiling cutaway & OrbitControls dynamically in Apartment mode
  useEffect(() => {
    if (worldMode === 'apartment') {
      syncAptModeFnRef.current?.(cameraMode, showCeilingInDollhouse);
    }
  }, [worldMode, cameraMode, showCeilingInDollhouse]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL Guard
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.78;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // 2. Scene, Camera & Studio Environment Reflection
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.2, 650);
    camera.rotation.order = 'YXZ';

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.45;
    pmremGenerator.dispose();

    const textures = createProceduralTextures(renderer);
    const mats = createMaterialLibrary(textures, isSoftwareGl);

    // 3. GPU-only GTAO, Subtle Bloom, SMAA & Tone-Mapped Output
    let composer: EffectComposer | null = null;
    let gtaoPass: GTAOPass | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let smaaPass: SMAAPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      gtaoPass = new GTAOPass(scene, camera, width, height);
      gtaoPass.output = GTAOPass.OUTPUT.Default;
      gtaoPass.blendIntensity = 0.65;
      gtaoPass.updateGtaoMaterial({
        radius: 0.38,
        distanceExponent: 1.8,
        thickness: 1.0,
        distanceFallOff: 1.0,
        scale: 1.0,
        samples: 16,
      });
      gtaoPass.updatePdMaterial({
        lumaPhi: 10,
        depthPhi: 2,
        normalPhi: 3,
        radius: 4,
        radiusExponent: 2,
        rings: 2,
        samples: 12,
      });
      composer.addPass(gtaoPass);

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.11,
        0.45,
        1.18
      );
      composer.addPass(bloomPass);

      smaaPass = new SMAAPass();
      composer.addPass(smaaPass);

      composer.addPass(new OutputPass());
    }

    // 4. OrbitControls shared across Masterplan Aerial & Apartment Dollhouse
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = !isSoftwareGl;
    orbit.dampingFactor = 0.06;
    orbit.maxPolarAngle = Math.PI * 0.47;

    orbit.addEventListener('start', () => {
      const activeIsOrbit =
        (worldModeRef.current === 'masterplan' &&
          !masterPresetRef.current.isPov &&
          !masterPresetRef.current.isFlycam) ||
        (worldModeRef.current === 'apartment' && cameraModeRef.current === 'dollhouse');
      if (activeIsOrbit) {
        povStateRef.current.glideActive = false;
      }
    });

    const syncMasterPreset = (preset: MasterplanCameraPreset) => {
      const s = povStateRef.current;
      if (preset.isFlycam) {
        orbit.enabled = false;
        camera.fov = 58;
        camera.near = 0.25;
        camera.far = 5000;
        camera.updateProjectionMatrix();
        // Smoothly take off from current camera position when switching from aerial orbit
        s.x = camera.position.x;
        s.y = Math.max(4.5, camera.position.y);
        s.z = camera.position.z;
        const dx = 0 - s.x;
        const dy = 12 - s.y;
        const dz = -2 - s.z;
        s.yaw = Math.atan2(-dx, -dz);
        s.pitch = THREE.MathUtils.clamp(
          Math.atan2(dy, Math.hypot(dx, dz)),
          -Math.PI * 0.44,
          Math.PI * 0.44
        );
        s.targetYaw = s.yaw;
        s.targetPitch = s.pitch;
        s.glideActive = false;
        camera.position.set(s.x, s.y, s.z);
        camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
      } else if (preset.isPov) {
        orbit.enabled = false;
        camera.fov = 62;
        camera.near = 0.14;
        camera.far = 4500;
        camera.updateProjectionMatrix();
        s.x = preset.position[0];
        s.y = preset.position[1];
        s.z = preset.position[2];
        s.yaw = preset.yaw ?? 0.35;
        s.pitch = preset.pitch ?? 0.04;
        s.targetYaw = s.yaw;
        s.targetPitch = s.pitch;
        s.glideActive = false;
        camera.position.set(s.x, s.y, s.z);
        camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
      } else {
        orbit.enabled = true;
        orbit.minDistance = 12;
        orbit.maxDistance = 1600;
        orbit.maxPolarAngle = Math.PI * 0.48;
        camera.fov = 46;
        camera.near = 0.4;
        camera.far = 5000;
        camera.updateProjectionMatrix();
        _orbitCamGoal.set(...preset.position);
        _orbitTargetGoal.set(...preset.target);
        s.glideActive = true;
      }
    };

    const syncUnitPanorama = (
      active: boolean,
      unit: ProjectUnit,
      floor: number
    ) => {
      if (!active) return;
      const view = getUnitBalconyView(unit, floor);
      const s = povStateRef.current;
      orbit.enabled = false;
      camera.near = 0.18;
      camera.far = 5000;

      const unitChanged = lastPanoramaUnitRef.current !== unit.code;
      if (unitChanged) {
        s.x = camera.position.x;
        s.y = camera.position.y;
        s.z = camera.position.z;
        s.yaw = camera.rotation.y;
        s.pitch = camera.rotation.x;
        s.targetYaw = view.yaw;
        s.targetPitch = view.pitch;
        panoramaFovRef.current = 62;
        lastPanoramaUnitRef.current = unit.code;
      }
      s.glideToX = view.position[0];
      s.glideToY = view.position[1];
      s.glideToZ = view.position[2];
      s.glideActive = true;
    };

    const syncAptMode = (mode: CameraMode, showCeil: boolean) => {
      const apt = worldStateRef.current.apartment;
      if (!apt) return;
      const s = povStateRef.current;
      orbit.minDistance = 4.0;
      orbit.maxDistance = 24;
      orbit.maxPolarAngle = Math.PI * 0.47;
      camera.near = 0.08;
      camera.far = 280;

      if (mode === 'pov') {
        orbit.enabled = false;
        apt.ceilingGroup.visible = true;
        camera.fov = 66;
        camera.updateProjectionMatrix();
        s.glideActive = true;
        s.glideToX = s.x;
        s.glideToY = EYE_HEIGHT;
        s.glideToZ = s.z;
      } else {
        orbit.enabled = true;
        apt.ceilingGroup.visible = showCeil;
        camera.fov = 44;
        camera.updateProjectionMatrix();
        _orbitTargetGoal.set(0, 0.25, -0.6);
        _orbitCamGoal.set(0, 10.6, 11.4);
        s.glideActive = true;
      }
    };

    const applyLighting = (preset: LightingPreset) => {
      if (worldModeRef.current === 'masterplan') {
        worldStateRef.current.masterplan?.applyLighting(preset, scene);
      } else {
        worldStateRef.current.apartment?.applyLighting(preset, scene);
      }
    };

    const rebuildWorld = (mode: WorldMode, unitType: UnitType, floor: number) => {
      // Dispose previous active world cleanly
      if (worldStateRef.current.masterplan) {
        worldStateRef.current.masterplan.dispose();
        worldStateRef.current.masterplan = null;
      }
      if (worldStateRef.current.apartment) {
        worldStateRef.current.apartment.dispose();
        worldStateRef.current.apartment = null;
      }

      if (mode === 'masterplan') {
        const mp = buildSolinaMasterplan(scene, renderer, isSoftwareGl);
        worldStateRef.current.masterplan = mp;
        mp.applyLighting(lightingRef.current, scene);
        mp.setSatelliteOverlay(satelliteOverlayRef.current);
        mp.setHighlightsVisible(highlightsVisibleRef.current);
        if (gtaoPass) gtaoPass.enabled = false;

        if (unitPanoramaRef.current) {
          syncUnitPanorama(true, unitRef.current, floorRef.current);
        } else {
          const preset = masterPresetRef.current || MASTERPLAN_CAMERA_PRESETS[0];
          if (!preset.isPov) {
            camera.position.set(...preset.position);
            orbit.target.set(...preset.target);
          }
          syncMasterPreset(preset);
        }
      } else {
        const layout = getApartmentLayout(unitType);
        worldStateRef.current.layout = layout;
        worldStateRef.current.collisionCtx = buildCollisionContext(layout);

        const apt = buildSolinaApartment(scene, mats, isSoftwareGl, unitType, floor);
        worldStateRef.current.apartment = apt;
        apt.applyLighting(lightingRef.current, scene);
        if (gtaoPass) gtaoPass.enabled = true;

        const spawnRoom = layout.rooms[0];
        const s = povStateRef.current;
        s.x = spawnRoom.povSpawn.x;
        s.y = EYE_HEIGHT;
        s.z = spawnRoom.povSpawn.z;
        s.yaw = spawnRoom.povSpawn.yaw;
        s.pitch = spawnRoom.povSpawn.pitch;
        s.targetYaw = spawnRoom.povSpawn.yaw;
        s.targetPitch = spawnRoom.povSpawn.pitch;
        s.lastRoomId = spawnRoom.id;
        s.glideActive = false;

        callbacksRef.current.onRoomChange(spawnRoom);
        syncAptMode(cameraModeRef.current, ceilingDollhouseRef.current);

        if (cameraModeRef.current === 'pov') {
          camera.position.set(s.x, s.y, s.z);
          camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
          s.glideActive = false;
        } else {
          camera.position.set(0, 10.6, 11.4);
          orbit.target.set(0, 0.25, -0.6);
          s.glideActive = false;
        }
      }

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
    };

    applyLightingFnRef.current = applyLighting;
    syncAptModeFnRef.current = syncAptMode;
    syncMasterPresetFnRef.current = syncMasterPreset;
    syncUnitPanoramaFnRef.current = syncUnitPanorama;
    rebuildWorldFnRef.current = rebuildWorld;

    // Build initial world
    rebuildWorld(worldModeRef.current, unitRef.current.type, floorRef.current);

    // 5. Pointer Drag-Look & Raycast Click (Towers in Masterplan / Rooms in Dollhouse)
    let isDragging = false;
    let dragDistance = 0;
    let lastPtrX = 0;
    let lastPtrY = 0;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();

    const isUnitPanoramaActive = () =>
      worldModeRef.current === 'masterplan' && unitPanoramaRef.current;

    const isFlycamActive = () =>
      worldModeRef.current === 'masterplan' &&
      !unitPanoramaRef.current &&
      Boolean(masterPresetRef.current.isFlycam);

    const isPovActive = () =>
      (worldModeRef.current === 'masterplan' &&
        !unitPanoramaRef.current &&
        masterPresetRef.current.isPov) ||
      (worldModeRef.current === 'apartment' && cameraModeRef.current === 'pov');

    let flycamScrollVel = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
    };

    const hitToTowerFloor = (hit: THREE.Intersection): { tower: 'A' | 'B'; floor: number } | null => {
      const tower = hit.object.userData.tower as 'A' | 'B' | undefined;
      if (!tower) return null;
      const rawFloor = Math.round((hit.point.y - 2.9) / 1.12) + 2;
      const maxF = tower === 'A' ? 21 : 34;
      return { tower, floor: THREE.MathUtils.clamp(rawFloor, 2, maxF) };
    };

    let lastHoverTime = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (
        !isDragging &&
        worldModeRef.current === 'masterplan' &&
        !masterPresetRef.current.isPov &&
        !unitPanoramaRef.current &&
        worldStateRef.current.masterplan
      ) {
        const now = performance.now();
        if (now - lastHoverTime > 65) {
          lastHoverTime = now;
          const rect = renderer.domElement.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointerNdc, camera);
            const hits = raycaster.intersectObjects(
              worldStateRef.current.masterplan.towerMeshes,
              false
            );
            const hovered = hits.length > 0 ? hitToTowerFloor(hits[0]) : null;
            callbacksRef.current.onHoverTowerFloor?.(hovered);
            renderer.domElement.style.cursor = hovered ? 'pointer' : '';
          }
        }
      }

      if (!isPovActive() && !isFlycamActive() && !isUnitPanoramaActive()) return;
      if (document.pointerLockElement === renderer.domElement) {
        if (isFlycamActive() && flycamAutoRef.current) {
          callbacksRef.current.onCancelFlycamAutoOrbit?.();
        }
        const s = povStateRef.current;
        s.targetYaw -= e.movementX * 0.0024;
        s.targetPitch = THREE.MathUtils.clamp(
          s.targetPitch - e.movementY * 0.0022,
          -Math.PI * 0.46,
          Math.PI * 0.46
        );
        return;
      }
      if (!isDragging) return;
      const dx = e.clientX - lastPtrX;
      const dy = e.clientY - lastPtrY;
      dragDistance += Math.hypot(dx, dy);
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;

      if (isFlycamActive() && flycamAutoRef.current && dragDistance > 4) {
        callbacksRef.current.onCancelFlycamAutoOrbit?.();
      }

      const s = povStateRef.current;
      if (!isUnitPanoramaActive()) {
        s.glideActive = false;
      }
      s.targetYaw += dx * 0.0042;
      s.targetPitch = THREE.MathUtils.clamp(
        s.targetPitch + dy * 0.0036,
        -Math.PI * 0.44,
        Math.PI * 0.44
      );
    };

    const onWheel = (e: WheelEvent) => {
      if (isUnitPanoramaActive()) {
        e.preventDefault();
        panoramaFovRef.current = THREE.MathUtils.clamp(
          panoramaFovRef.current + Math.sign(e.deltaY) * 4.5,
          34,
          76
        );
        return;
      }
      if (!isFlycamActive()) return;
      e.preventDefault();
      if (flycamAutoRef.current) {
        callbacksRef.current.onCancelFlycamAutoOrbit?.();
      }
      povStateRef.current.glideActive = false;
      flycamScrollVel += -Math.sign(e.deltaY) * 18;
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasClick = dragDistance < 6;
      isDragging = false;
      if (!wasClick) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      if (
        worldModeRef.current === 'masterplan' &&
        !masterPresetRef.current.isPov &&
        !unitPanoramaRef.current &&
        worldStateRef.current.masterplan
      ) {
        const hits = raycaster.intersectObjects(
          worldStateRef.current.masterplan.towerMeshes,
          false
        );
        if (hits.length > 0) {
          const picked = hitToTowerFloor(hits[0]);
          if (picked) {
            callbacksRef.current.onSelectTowerFromMasterplan?.(
              picked.tower,
              picked.floor
            );
          }
        }
      } else if (
        worldModeRef.current === 'apartment' &&
        cameraModeRef.current === 'dollhouse'
      ) {
        const b = worldStateRef.current.layout.bounds;
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          if (
            hitPoint.x >= b.minX &&
            hitPoint.x <= b.maxX &&
            hitPoint.z >= b.minZ &&
            hitPoint.z <= b.maxZ
          ) {
            const room = detectRoomAt(
              hitPoint.x,
              hitPoint.z,
              worldStateRef.current.layout.rooms
            );
            callbacksRef.current.onRequestPovFromDollhouse(room);
          }
        }
      }
    };

    // Keyboard WASD / Arrow Keys + Flycam E/Space (up) & Q/C (down)
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'KeyE',
          'KeyQ',
          'KeyC',
          'Space',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.code)
      ) {
        keys[e.code] = true;
        if (isFlycamActive() && flycamAutoRef.current) {
          callbacksRef.current.onCancelFlycamAutoOrbit?.();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      gtaoPass?.setSize(w, h);
      if (bloomPass) bloomPass.resolution.set(w, h);
      smaaPass?.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 6. Animation Loop
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    let telemetryTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      if (worldStateRef.current.masterplan) {
        worldStateRef.current.masterplan.updateAnimations(
          elapsed,
          !prefersReducedMotion,
          camera.position
        );
      }
      if (worldStateRef.current.apartment) {
        worldStateRef.current.apartment.oceanUniforms.uTime.value =
          prefersReducedMotion ? 0 : elapsed;
      }

      const s = povStateRef.current;

      if (isUnitPanoramaActive()) {
        const posFactor = prefersReducedMotion ? 1 : 6.0;
        const lookDamp = prefersReducedMotion ? 40 : 14;
        if (s.glideActive) {
          s.x = THREE.MathUtils.damp(s.x, s.glideToX, posFactor, delta);
          s.y = THREE.MathUtils.damp(s.y, s.glideToY, posFactor, delta);
          s.z = THREE.MathUtils.damp(s.z, s.glideToZ, posFactor, delta);
          if (
            Math.hypot(s.x - s.glideToX, s.y - s.glideToY, s.z - s.glideToZ) <
            0.04
          ) {
            s.x = s.glideToX;
            s.y = s.glideToY;
            s.z = s.glideToZ;
            s.glideActive = false;
          }
        }
        let diff = s.targetYaw - s.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.yaw += diff * (1 - Math.exp(-lookDamp * delta));
        s.pitch = THREE.MathUtils.damp(s.pitch, s.targetPitch, lookDamp, delta);

        const nextFov = THREE.MathUtils.damp(
          camera.fov,
          panoramaFovRef.current,
          10,
          delta
        );
        if (Math.abs(nextFov - camera.fov) > 0.03) {
          camera.fov = nextFov;
          camera.updateProjectionMatrix();
        }
        camera.position.set(s.x, s.y, s.z);
        camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
      } else if (isFlycamActive()) {
        if (flycamAutoRef.current && !s.glideActive) {
          if (flycamOrbitModeRef.current === 'high_lap') {
            // High-altitude 1-lap 360° panoramic flycam around Solina & Vũng Tàu peninsula
            const lap = highLapStateRef.current;
            const lapDurationSec = 26.0;
            lap.t = Math.min(1, lap.t + delta / lapDurationSec);
            // Smooth ease-in & ease-out across the full 360° circle
            const eased = lap.t * lap.t * (3 - 2 * lap.t);
            const angle = lap.startAngle + eased * Math.PI * 2;
            const goalX = 35 + Math.sin(angle) * 360;
            const goalZ = 25 + Math.cos(angle) * 310;
            const goalY = 245 + Math.sin(eased * Math.PI * 2) * 28;
            const dampF = prefersReducedMotion ? 1 : 2.6;
            s.x = THREE.MathUtils.damp(s.x, goalX, dampF, delta);
            s.y = THREE.MathUtils.damp(s.y, goalY, dampF, delta);
            s.z = THREE.MathUtils.damp(s.z, goalZ, dampF, delta);

            const dx = 30 - s.x;
            const dy = 10 - s.y;
            const dz = 18 - s.z;
            const lookYaw = Math.atan2(-dx, -dz);
            const lookPitch = Math.atan2(dy, Math.hypot(dx, dz));
            let diff = lookYaw - s.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            s.yaw += diff * (1 - Math.exp(-3.4 * delta));
            s.pitch = THREE.MathUtils.damp(s.pitch, lookPitch, 3.4, delta);
            s.targetYaw = s.yaw;
            s.targetPitch = s.pitch;

            camera.position.set(s.x, s.y, s.z);
            camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');

            if (lap.t >= 1 && !lap.completed) {
              lap.completed = true;
              callbacksRef.current.onFlycamLapProgress?.(100);
              callbacksRef.current.onCompleteFlycamLap?.();
            }
          } else {
            // Cinematic Flycam Orbit Tour around Towers A & B, Lagoon Pool & Coastline
            const tourAngle = elapsed * 0.14;
            const goalX = Math.sin(tourAngle) * 56;
            const goalZ = -4 + Math.cos(tourAngle) * 50;
            const goalY = 27 + Math.sin(tourAngle * 2.0) * 9;
            const dampF = prefersReducedMotion ? 1 : 2.6;
            s.x = THREE.MathUtils.damp(s.x, goalX, dampF, delta);
            s.y = THREE.MathUtils.damp(s.y, goalY, dampF, delta);
            s.z = THREE.MathUtils.damp(s.z, goalZ, dampF, delta);

            const dx = 0 - s.x;
            const dy = 11 - s.y;
            const dz = -2 - s.z;
            const lookYaw = Math.atan2(-dx, -dz);
            const lookPitch = Math.atan2(dy, Math.hypot(dx, dz));
            // Shortest angle wrap for yaw
            let diff = lookYaw - s.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            s.yaw += diff * (1 - Math.exp(-3.5 * delta));
            s.pitch = THREE.MathUtils.damp(s.pitch, lookPitch, 3.5, delta);
            s.targetYaw = s.yaw;
            s.targetPitch = s.pitch;

            camera.position.set(s.x, s.y, s.z);
            camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
          }
        } else if (s.glideActive) {
          const factor = prefersReducedMotion ? 1 : 5.5;
          s.x = THREE.MathUtils.damp(s.x, s.glideToX, factor, delta);
          s.y = THREE.MathUtils.damp(s.y, s.glideToY, factor, delta);
          s.z = THREE.MathUtils.damp(s.z, s.glideToZ, factor, delta);
          let diff = s.targetYaw - s.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.yaw += diff * (1 - Math.exp(-factor * delta));
          s.pitch = THREE.MathUtils.damp(s.pitch, s.targetPitch, factor, delta);

          camera.position.set(s.x, s.y, s.z);
          camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');

          if (
            Math.hypot(s.x - s.glideToX, s.y - s.glideToY, s.z - s.glideToZ) < 0.25 &&
            Math.abs(diff) < 0.02
          ) {
            s.x = s.glideToX;
            s.y = s.glideToY;
            s.z = s.glideToZ;
            s.yaw = s.targetYaw;
            s.glideActive = false;
          }
        } else {
          // Manual Free-Fly Drone Flight
          const lookDamp = prefersReducedMotion ? 40 : 14;
          s.yaw = THREE.MathUtils.damp(s.yaw, s.targetYaw, lookDamp, delta);
          s.pitch = THREE.MathUtils.damp(s.pitch, s.targetPitch, lookDamp, delta);

          const pad = moveInputRef.current;
          const moveZ =
            Number(keys['KeyW'] || keys['ArrowUp'] || pad.forward) -
            Number(keys['KeyS'] || keys['ArrowDown'] || pad.backward);
          const moveX =
            Number(keys['KeyD'] || keys['ArrowRight'] || pad.right) -
            Number(keys['KeyA'] || keys['ArrowLeft'] || pad.left);
          const moveY =
            Number(keys['KeyE'] || keys['Space'] || pad.up) -
            Number(keys['KeyQ'] || keys['KeyC'] || pad.down);

          _forward
            .set(
              -Math.sin(s.yaw) * Math.cos(s.pitch),
              Math.sin(s.pitch),
              -Math.cos(s.yaw) * Math.cos(s.pitch)
            )
            .normalize();
          _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw)).normalize();

          const flySpeed = 24.0;
          if (moveZ !== 0 || moveX !== 0) {
            const len = Math.hypot(moveX, moveZ);
            const nx = moveX / len;
            const nz = moveZ / len;
            s.x += (_forward.x * nz + _right.x * nx) * flySpeed * delta;
            s.y += _forward.y * nz * flySpeed * delta;
            s.z += (_forward.z * nz + _right.z * nx) * flySpeed * delta;
          }

          if (moveY !== 0) {
            s.y += moveY * 16.0 * delta;
          }

          if (Math.abs(flycamScrollVel) > 0.05) {
            s.x += _forward.x * flycamScrollVel * delta;
            s.y += _forward.y * flycamScrollVel * delta;
            s.z += _forward.z * flycamScrollVel * delta;
            flycamScrollVel *= Math.exp(-8.5 * delta);
          }

          // Clamp drone safely within coastal Vũng Tàu airspace
          s.x = THREE.MathUtils.clamp(s.x, -850, 1050);
          s.y = THREE.MathUtils.clamp(s.y, 2.4, 1200);
          s.z = THREE.MathUtils.clamp(s.z, -750, 980);

          camera.position.set(s.x, s.y, s.z);
          camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
        }
      } else if (isPovActive()) {
        if (s.glideActive && worldModeRef.current === 'apartment') {
          const factor = prefersReducedMotion ? 1 : 9;
          s.x = THREE.MathUtils.damp(s.x, s.glideToX, factor, delta);
          s.y = THREE.MathUtils.damp(s.y, s.glideToY, factor, delta);
          s.z = THREE.MathUtils.damp(s.z, s.glideToZ, factor, delta);
          s.yaw = THREE.MathUtils.damp(s.yaw, s.targetYaw, factor, delta);
          s.pitch = THREE.MathUtils.damp(s.pitch, s.targetPitch, factor, delta);

          camera.position.set(s.x, s.y, s.z);
          camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');

          if (
            Math.hypot(s.x - s.glideToX, s.z - s.glideToZ) < 0.02 &&
            Math.abs(s.yaw - s.targetYaw) < 0.015
          ) {
            s.x = s.glideToX;
            s.y = s.glideToY;
            s.z = s.glideToZ;
            s.glideActive = false;
          }
        } else {
          const lookDamp = prefersReducedMotion ? 40 : 18;
          s.yaw = THREE.MathUtils.damp(s.yaw, s.targetYaw, lookDamp, delta);
          s.pitch = THREE.MathUtils.damp(s.pitch, s.targetPitch, lookDamp, delta);

          const pad = moveInputRef.current;
          const moveZ =
            Number(keys['KeyW'] || keys['ArrowUp'] || pad.forward) -
            Number(keys['KeyS'] || keys['ArrowDown'] || pad.backward);
          const moveX =
            Number(keys['KeyD'] || keys['ArrowRight'] || pad.right) -
            Number(keys['KeyA'] || keys['ArrowLeft'] || pad.left);

          const isMoving = moveZ !== 0 || moveX !== 0;

          if (isMoving) {
            _forward.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw)).normalize();
            _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw)).normalize();

            const speed = worldModeRef.current === 'masterplan' ? 5.8 : 2.55;
            const len = Math.hypot(moveX, moveZ);
            const nx = moveX / len;
            const nz = moveZ / len;

            s.x += (_forward.x * nz + _right.x * nx) * speed * delta;
            s.z += (_forward.z * nz + _right.z * nx) * speed * delta;

            if (worldModeRef.current === 'masterplan') {
              resolveLandscapeCollision(s);
            } else {
              resolvePlayerCollision(s, worldStateRef.current.collisionCtx);
            }

            if (!prefersReducedMotion) {
              s.walkBobPhase += delta * 9.5;
            }
          }

          const targetEyeH =
            worldModeRef.current === 'masterplan' ? 1.68 : EYE_HEIGHT;
          const bobOffset =
            isMoving && !prefersReducedMotion ? Math.sin(s.walkBobPhase) * 0.022 : 0;
          s.y = THREE.MathUtils.damp(s.y, targetEyeH + bobOffset, 14, delta);

          camera.position.set(s.x, s.y, s.z);
          camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
        }
      } else {
        // Orbit mode (Masterplan aerial OR Apartment Dollhouse)
        if (s.glideActive) {
          const factor = prefersReducedMotion ? 1 : 6.0;
          camera.position.lerp(_orbitCamGoal, 1 - Math.exp(-factor * delta));
          orbit.target.lerp(_orbitTargetGoal, 1 - Math.exp(-factor * delta));
          if (
            camera.position.distanceTo(_orbitCamGoal) < 0.1 &&
            orbit.target.distanceTo(_orbitTargetGoal) < 0.08
          ) {
            s.glideActive = false;
          }
        }
        orbit.update();
      }

      // Telemetry (~12 Hz)
      telemetryTimer += delta;
      if (telemetryTimer >= 0.08) {
        telemetryTimer = 0;
        if (worldModeRef.current === 'apartment') {
          const room = detectRoomAt(
            s.x,
            s.z,
            worldStateRef.current.layout.rooms
          );
          if (room.id !== s.lastRoomId) {
            s.lastRoomId = room.id;
            callbacksRef.current.onRoomChange(room);
          }
          callbacksRef.current.onTelemetry({
            x: s.x,
            z: s.z,
            yaw: s.yaw,
            currentRoom: room,
          });
        } else {
          camera.getWorldDirection(_camDir);
          const bearing = Math.round(
            worldDirToCompassBearing(_camDir.x, _camDir.z)
          );
          callbacksRef.current.onMasterplanBearingChange?.(bearing);
          if (isFlycamActive()) {
            callbacksRef.current.onAltitudeChange?.(Math.round(s.y * 10) / 10);
            if (flycamAutoRef.current && flycamOrbitModeRef.current === 'high_lap') {
              callbacksRef.current.onFlycamLapProgress?.(
                Math.round(highLapStateRef.current.t * 100)
              );
            } else {
              callbacksRef.current.onFlycamLapProgress?.(null);
            }
          } else {
            callbacksRef.current.onFlycamLapProgress?.(null);
          }
        }
      }

      if (isSoftwareGl || !composer) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      gtaoPass?.dispose();
      smaaPass?.dispose();
      bloomPass?.dispose();
      composer?.dispose();
      orbit.dispose();
      worldStateRef.current.masterplan?.dispose();
      worldStateRef.current.apartment?.dispose();
      mats.dispose();
      textures.dispose();
      envTex.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [moveInputRef]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Không gian 3D Solina Signature by Wyndham"
      />
      {webglError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1726] p-6 text-center z-20">
          <img
            src="./assets/aistudio/image_20b1d225.png"
            alt="Phối cảnh tổng thể dự án Solina Signature by Wyndham"
            className="max-w-2xl w-full rounded-xl border border-white/15 mb-5"
          />
          <p className="text-base font-medium text-slate-100">
            Trình duyệt hiện chưa bật tăng tốc WebGL 3D.
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Vui lòng bật tăng tốc phần cứng để khám phá mô hình 3D.
          </p>
        </div>
      )}
    </div>
  );
}
