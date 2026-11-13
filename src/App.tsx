import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Building2,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Footprints,
  Home,
  Layers,
  Map as MapIcon,
  Moon,
  Mountain,
  Pause,
  Play,
  Sun,
  Sunrise,
  Video,
} from 'lucide-react';
import ApartmentCanvas, {
  MoveInputState,
  PlayerTelemetry,
} from './components/ApartmentCanvas';
import FloorMinimapModal from './components/FloorMinimapModal';
import {
  CameraMode,
  LightingPreset,
  RoomZone,
  getApartmentLayout,
} from './scene/apartmentData';
import {
  FLYCAM_WAYPOINTS,
  FlycamWaypoint,
  MASTERPLAN_CAMERA_PRESETS,
  MasterplanCameraPreset,
  PROJECT_UNITS,
  ProjectUnit,
  WorldMode,
  formatUnitCodeForFloor,
  getUnitBalconyView,
} from './scene/masterplanData';

export default function App() {
  const [worldMode, setWorldMode] = useState<WorldMode>('masterplan');
  const [masterplanPreset, setMasterplanPreset] =
    useState<MasterplanCameraPreset>(MASTERPLAN_CAMERA_PRESETS[0]);
  const [selectedUnit, setSelectedUnit] = useState<ProjectUnit>(PROJECT_UNITS[0]);
  const [selectedFloor, setSelectedFloor] = useState<number>(
    PROJECT_UNITS[0].defaultFloor
  );
  const [cameraMode, setCameraMode] = useState<CameraMode>('pov');
  const [lightingPreset, setLightingPreset] =
    useState<LightingPreset>('sunrise');
  const [showCeilingInDollhouse, setShowCeilingInDollhouse] = useState(false);

  const activeLayout = useMemo(
    () => getApartmentLayout(selectedUnit.type),
    [selectedUnit.type]
  );

  const [currentRoom, setCurrentRoom] = useState<RoomZone>(
    activeLayout.rooms[0]
  );
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [towerFilter, setTowerFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [showWalkPad, setShowWalkPad] = useState(false);
  const [unitPanoramaMode, setUnitPanoramaMode] = useState(false);
  const [hoveredTowerFloor, setHoveredTowerFloor] = useState<{
    tower: 'A' | 'B';
    floor: number;
  } | null>(null);
  const [flycamAutoOrbit, setFlycamAutoOrbit] = useState(true);
  const [flycamAltitude, setFlycamAltitude] = useState(28);
  const [flycamWaypointTarget, setFlycamWaypointTarget] = useState<{
    waypoint: FlycamWaypoint;
    nonce: number;
  } | null>(null);
  const [teleportTarget, setTeleportTarget] = useState<{
    room: RoomZone;
    nonce: number;
  } | null>(null);

  const [telemetry, setTelemetry] = useState<PlayerTelemetry>({
    x: activeLayout.rooms[0].povSpawn.x,
    z: activeLayout.rooms[0].povSpawn.z,
    yaw: activeLayout.rooms[0].povSpawn.yaw,
    currentRoom: activeLayout.rooms[0],
  });

  const moveInputRef = useRef<MoveInputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const aerialPresets = useMemo(
    () => MASTERPLAN_CAMERA_PRESETS.filter((p) => !p.isPov && !p.isFlycam),
    []
  );
  const landscapePovPreset = useMemo(
    () =>
      MASTERPLAN_CAMERA_PRESETS.find((p) => p.id === 'landscape_pov') ??
      MASTERPLAN_CAMERA_PRESETS[4],
    []
  );
  const flycamPreset = useMemo(
    () =>
      MASTERPLAN_CAMERA_PRESETS.find((p) => p.id === 'flycam') ??
      MASTERPLAN_CAMERA_PRESETS[5],
    []
  );

  const handleSelectRoom = useCallback((room: RoomZone) => {
    setWorldMode('apartment');
    setCurrentRoom(room);
    setTeleportTarget((prev) => ({
      room,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, []);

  const handleRequestPovFromDollhouse = useCallback((room: RoomZone) => {
    setWorldMode('apartment');
    setCameraMode('pov');
    setCurrentRoom(room);
    setTeleportTarget((prev) => ({
      room,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, []);

  const handleSelectUnitAndFloor = useCallback(
    (unit: ProjectUnit, floor: number) => {
      const clampedFloor = Math.max(2, Math.min(unit.maxFloor, floor));
      const layout = getApartmentLayout(unit.type);
      setSelectedUnit(unit);
      setSelectedFloor(clampedFloor);
      setCurrentRoom(layout.rooms[0]);
      setHoveredTowerFloor(null);
      setUnitPanoramaMode(false);
      setCameraMode('pov');
      setWorldMode('apartment');
    },
    []
  );

  const handleSelectUnitPanorama = useCallback(
    (unit: ProjectUnit, floor: number) => {
      const clampedFloor = Math.max(2, Math.min(unit.maxFloor, floor));
      const layout = getApartmentLayout(unit.type);
      setSelectedUnit(unit);
      setSelectedFloor(clampedFloor);
      setCurrentRoom(layout.rooms[0]);
      setHoveredTowerFloor(null);
      setWorldMode('masterplan');
      setUnitPanoramaMode(true);
    },
    []
  );

  const handleSelectTowerFromMasterplan = useCallback(
    (tower: 'A' | 'B', clickedFloor?: number) => {
      const nextUnit =
        selectedUnit.tower === tower
          ? selectedUnit
          : (PROJECT_UNITS.find((u) => u.tower === tower) ?? selectedUnit);
      const targetFloor = Math.max(
        2,
        Math.min(nextUnit.maxFloor, clickedFloor ?? selectedFloor)
      );
      if (nextUnit.code !== selectedUnit.code) {
        const layout = getApartmentLayout(nextUnit.type);
        setSelectedUnit(nextUnit);
        setCurrentRoom(layout.rooms[0]);
      }
      setSelectedFloor(targetFloor);
      setTowerFilter(tower);
      setMapOpen(true);
    },
    [selectedUnit, selectedFloor]
  );

  const handleEnterFlycam = useCallback(() => {
    setUnitPanoramaMode(false);
    setWorldMode('masterplan');
    setMasterplanPreset(flycamPreset);
    setFlycamAutoOrbit(true);
  }, [flycamPreset]);

  const handleSelectFlycamWaypoint = useCallback((waypoint: FlycamWaypoint) => {
    setFlycamAutoOrbit(false);
    setFlycamWaypointTarget((prev) => ({
      waypoint,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, []);

  // Global keyboard shortcuts (H: hide dock, M: map, V: toggle POV/3D, F: Flycam)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'KeyH') {
        setDockCollapsed((v) => !v);
      } else if (e.code === 'KeyM') {
        setMapOpen((v) => !v);
      } else if (e.code === 'KeyF') {
        handleEnterFlycam();
      } else if (e.code === 'KeyV') {
        if (worldMode === 'apartment') {
          setCameraMode((m) => (m === 'pov' ? 'dollhouse' : 'pov'));
        } else {
          setUnitPanoramaMode(false);
          setMasterplanPreset((prev) =>
            prev.isPov ? aerialPresets[0] : landscapePovPreset
          );
        }
      } else if (e.code === 'Escape') {
        setMapOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [worldMode, aerialPresets, landscapePovPreset, handleEnterFlycam]);

  const setMoveFlag = (dir: keyof MoveInputState, active: boolean) => {
    moveInputRef.current[dir] = active;
    if (active && worldMode === 'masterplan' && masterplanPreset.isFlycam) {
      setFlycamAutoOrbit(false);
    }
  };

  const isUnitPanoramaActive = worldMode === 'masterplan' && unitPanoramaMode;

  const isFlycamActive =
    worldMode === 'masterplan' &&
    !unitPanoramaMode &&
    Boolean(masterplanPreset.isFlycam);

  const isAnyPovActive =
    (worldMode === 'masterplan' &&
      !unitPanoramaMode &&
      masterplanPreset.isPov) ||
    (worldMode === 'apartment' && cameraMode === 'pov');

  const activeUnitCode = formatUnitCodeForFloor(selectedUnit, selectedFloor);
  const activeBalconyView = useMemo(
    () => getUnitBalconyView(selectedUnit, selectedFloor),
    [selectedUnit, selectedFloor]
  );
  const floorOptions = useMemo(
    () =>
      Array.from(
        { length: selectedUnit.maxFloor - 1 },
        (_, idx) => idx + 2
      ),
    [selectedUnit.maxFloor]
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b131e]">
      {/* Full-viewport 3D Scene */}
      <ApartmentCanvas
        worldMode={worldMode}
        cameraMode={cameraMode}
        lightingPreset={lightingPreset}
        showCeilingInDollhouse={showCeilingInDollhouse}
        selectedUnit={selectedUnit}
        selectedFloor={selectedFloor}
        masterplanPreset={masterplanPreset}
        unitPanoramaMode={unitPanoramaMode}
        flycamAutoOrbit={flycamAutoOrbit}
        flycamWaypointTarget={flycamWaypointTarget}
        teleportTarget={teleportTarget}
        moveInputRef={moveInputRef}
        onRoomChange={setCurrentRoom}
        onTelemetry={setTelemetry}
        onRequestPovFromDollhouse={handleRequestPovFromDollhouse}
        onSelectTowerFromMasterplan={handleSelectTowerFromMasterplan}
        onHoverTowerFloor={setHoveredTowerFloor}
        onCancelFlycamAutoOrbit={() => setFlycamAutoOrbit(false)}
        onAltitudeChange={setFlycamAltitude}
      />

      {/* Minimal Top-Left Project & Location Readout */}
      <header className="pointer-events-none fixed top-5 left-5 z-10 max-w-md">
        <div
          className="pointer-events-auto inline-flex flex-col rounded-xl border border-white/15 px-4 py-3 shadow-lg"
          style={{ backgroundColor: 'rgba(11, 18, 30, 0.86)' }}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-200/90">
            <span className="font-medium tracking-wide">
              Solina Signature by Wyndham
            </span>
            <span aria-hidden="true">·</span>
            {worldMode === 'masterplan' && !isUnitPanoramaActive ? (
              <span>Toàn khu Tháp A (21F) &amp; Tháp B (34F)</span>
            ) : (
              <>
                <span className="font-mono-tabular">{activeUnitCode}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">Tầng {selectedFloor}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{selectedUnit.nfa}</span>
              </>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-white leading-tight">
              {isUnitPanoramaActive
                ? `View căn ${activeUnitCode}`
                : worldMode === 'masterplan'
                  ? masterplanPreset.label
                  : currentRoom.name}
            </h1>
            {isUnitPanoramaActive ? (
              <span className="font-mono-tabular text-xs text-amber-300">
                Cao độ ~{activeBalconyView.altMeters} m · {selectedUnit.type}
              </span>
            ) : isFlycamActive ? (
              <span className="font-mono-tabular text-xs text-amber-300">
                Cao độ {flycamAltitude.toFixed(1)} m ·{' '}
                {flycamAutoOrbit ? 'Bay vòng tự động' : 'Bay tự do'}
              </span>
            ) : (
              worldMode === 'apartment' && (
                <span className="font-mono-tabular text-xs text-slate-400">
                  {currentRoom.areaLabel}
                </span>
              )
            )}
          </div>
          <p className="text-xs text-slate-300 mt-0.5 truncate max-w-[380px]">
            {isUnitPanoramaActive
              ? activeBalconyView.viewSummary
              : worldMode === 'masterplan' &&
                  !masterplanPreset.isPov &&
                  hoveredTowerFloor
                ? `Đang chỉ Tháp ${hoveredTowerFloor.tower} · Tầng ${hoveredTowerFloor.floor} — Nhấn để chọn căn tầng này`
                : worldMode === 'masterplan'
                  ? masterplanPreset.subtitle
                  : currentRoom.subtitle}
          </p>
        </div>
      </header>

      {/* Optional On-Screen Walk / Drone Pad */}
      {(isAnyPovActive || isFlycamActive) && showWalkPad && !dockCollapsed && (
        <div
          className="fixed bottom-48 right-5 z-10 rounded-xl border border-white/15 p-2.5 shadow-lg"
          style={{ backgroundColor: 'rgba(11, 18, 30, 0.88)' }}
        >
          {isFlycamActive && (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <button
                type="button"
                onPointerDown={() => setMoveFlag('up', true)}
                onPointerUp={() => setMoveFlag('up', false)}
                onPointerLeave={() => setMoveFlag('up', false)}
                className="h-8 rounded-lg border border-amber-400/35 bg-amber-500/15 text-[11px] font-medium text-amber-200 flex items-center justify-center active:bg-amber-500/35 cursor-pointer"
              >
                Bay lên
              </button>
              <button
                type="button"
                onPointerDown={() => setMoveFlag('down', true)}
                onPointerUp={() => setMoveFlag('down', false)}
                onPointerLeave={() => setMoveFlag('down', false)}
                className="h-8 rounded-lg border border-white/15 bg-white/10 text-[11px] font-medium text-slate-200 flex items-center justify-center active:bg-amber-500/35 cursor-pointer"
              >
                Hạ xuống
              </button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5 w-32">
            <div />
            <button
              type="button"
              aria-label="Đi tới"
              onPointerDown={() => setMoveFlag('forward', true)}
              onPointerUp={() => setMoveFlag('forward', false)}
              onPointerLeave={() => setMoveFlag('forward', false)}
              className="h-10 rounded-lg border border-white/15 bg-white/10 text-white flex items-center justify-center active:bg-amber-500/30 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div />
            <button
              type="button"
              aria-label="Sang trái"
              onPointerDown={() => setMoveFlag('left', true)}
              onPointerUp={() => setMoveFlag('left', false)}
              onPointerLeave={() => setMoveFlag('left', false)}
              className="h-10 rounded-lg border border-white/15 bg-white/10 text-white flex items-center justify-center active:bg-amber-500/30 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Lùi lại"
              onPointerDown={() => setMoveFlag('backward', true)}
              onPointerUp={() => setMoveFlag('backward', false)}
              onPointerLeave={() => setMoveFlag('backward', false)}
              className="h-10 rounded-lg border border-white/15 bg-white/10 text-white flex items-center justify-center active:bg-amber-500/30 cursor-pointer"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Sang phải"
              onPointerDown={() => setMoveFlag('right', true)}
              onPointerUp={() => setMoveFlag('right', false)}
              onPointerLeave={() => setMoveFlag('right', false)}
              className="h-10 rounded-lg border border-white/15 bg-white/10 text-white flex items-center justify-center active:bg-amber-500/30 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <div
        className="fixed bottom-5 left-1/2 z-20 transition-transform duration-200"
        style={{
          width: 'min(980px, 95vw)',
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 20px))'
            : 'translate(-50%, 0)',
        }}
      >
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/15 px-3.5 py-1 text-xs font-medium text-slate-200 hover:text-white cursor-pointer transition-colors"
            style={{ backgroundColor: 'rgba(11, 18, 30, 0.9)' }}
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hiện điều khiển (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Ẩn điều khiển (H)</span>
              </>
            )}
          </button>
        </div>

        <div
          className="rounded-2xl border border-white/15 p-3 shadow-2xl"
          style={{ backgroundColor: 'rgba(11, 18, 30, 0.92)' }}
        >
          {/* Row 1: Primary Mode Switcher (Masterplan 3D / Landscape POV / Apartment POV / Dollhouse) + Floor/Unit */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setUnitPanoramaMode(false);
                  setWorldMode('masterplan');
                  if (masterplanPreset.isPov || masterplanPreset.isFlycam) {
                    setMasterplanPreset(aerialPresets[0]);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  worldMode === 'masterplan' &&
                  !unitPanoramaMode &&
                  !masterplanPreset.isPov &&
                  !masterplanPreset.isFlycam
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Toàn khu 3D</span>
              </button>

              <button
                type="button"
                onClick={handleEnterFlycam}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isFlycamActive
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Flycam 360°</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHoveredTowerFloor(null);
                  setWorldMode('masterplan');
                  setUnitPanoramaMode(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isUnitPanoramaActive
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Mountain className="w-3.5 h-3.5" />
                <span>View từ căn {activeUnitCode}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUnitPanoramaMode(false);
                  setWorldMode('masterplan');
                  setMasterplanPreset(landscapePovPreset);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  worldMode === 'masterplan' &&
                  !unitPanoramaMode &&
                  masterplanPreset.isPov
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Dạo cảnh quan POV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHoveredTowerFloor(null);
                  setUnitPanoramaMode(false);
                  setWorldMode('apartment');
                  setCameraMode('pov');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  worldMode === 'apartment' && cameraMode === 'pov'
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Vào căn hộ POV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHoveredTowerFloor(null);
                  setUnitPanoramaMode(false);
                  setWorldMode('apartment');
                  setCameraMode('dollhouse');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  worldMode === 'apartment' && cameraMode === 'dollhouse'
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tổng quan căn hộ</span>
              </button>
            </div>

            {/* Active Unit & Floor Quick Stepper (Always available in overview & apartment) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-xs">
                <button
                  type="button"
                  aria-label="Giảm tầng"
                  onClick={() => setSelectedFloor((f) => Math.max(2, f - 1))}
                  className="w-5 h-5 rounded bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                >
                  -
                </button>
                <select
                  aria-label="Chọn tầng căn hộ"
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(Number(e.target.value))}
                  className="bg-transparent font-mono-tabular font-semibold text-amber-300 px-1 py-0.5 text-xs focus:outline-none cursor-pointer"
                >
                  {floorOptions.map((fl) => (
                    <option
                      key={fl}
                      value={fl}
                      className="bg-[#0f1726] text-white"
                    >
                      Tầng {fl}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Tăng tầng"
                  onClick={() =>
                    setSelectedFloor((f) =>
                      Math.min(selectedUnit.maxFloor, f + 1)
                    )
                  }
                  className="w-5 h-5 rounded bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTowerFilter('ALL');
                  setMapOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-400/35 bg-amber-500/15 text-xs font-medium text-amber-200 hover:bg-amber-500/25 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>
                  Căn {activeUnitCode} ({selectedUnit.type})
                </span>
              </button>
            </div>
          </div>

          {/* Row 2: Contextual Presets (Unit Consultation Switcher OR Flycam Waypoints OR Masterplan Angles OR Apartment Rooms) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 border-b border-white/10">
            {isUnitPanoramaActive ? (
              PROJECT_UNITS.map((unit) => {
                const active = selectedUnit.code === unit.code;
                const clamped = Math.max(2, Math.min(unit.maxFloor, selectedFloor));
                const codeLabel = formatUnitCodeForFloor(unit, clamped);
                return (
                  <button
                    key={unit.code}
                    type="button"
                    onClick={() => handleSelectUnitPanorama(unit, clamped)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 font-semibold'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {codeLabel} ({unit.type})
                  </button>
                );
              })
            ) : isFlycamActive ? (
              <>
                <button
                  type="button"
                  onClick={() => setFlycamAutoOrbit((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    flycamAutoOrbit
                      ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {flycamAutoOrbit ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Dừng bay vòng tự động</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Bay vòng tự động</span>
                    </>
                  )}
                </button>
                {FLYCAM_WAYPOINTS.map((wp) => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleSelectFlycamWaypoint(wp)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    {wp.label}
                  </button>
                ))}
              </>
            ) : worldMode === 'masterplan' ? (
              aerialPresets.map((preset) => {
                const active = masterplanPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setMasterplanPreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white/20 text-amber-200 border border-amber-400/40'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })
            ) : (
              activeLayout.rooms.map((room) => {
                const active = currentRoom.id === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white/20 text-amber-200 border border-amber-400/40'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {room.name}
                  </button>
                );
              })
            )}
          </div>

          {/* Row 3: Lighting Moods, Utility Controls & Floorplan Modal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5">
            <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setLightingPreset('sunrise')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  lightingPreset === 'sunrise'
                    ? 'bg-white/15 text-amber-200'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sunrise className="w-3.5 h-3.5" />
                <span>Hoàng hôn</span>
              </button>
              <button
                type="button"
                onClick={() => setLightingPreset('daylight')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  lightingPreset === 'daylight'
                    ? 'bg-white/15 text-sky-200'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Ban ngày</span>
              </button>
              <button
                type="button"
                onClick={() => setLightingPreset('evening')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  lightingPreset === 'evening'
                    ? 'bg-white/15 text-amber-200'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Buổi tối</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {worldMode === 'apartment' && cameraMode === 'dollhouse' ? (
                <button
                  type="button"
                  onClick={() => setShowCeilingInDollhouse((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    showCeilingInDollhouse
                      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  {showCeilingInDollhouse ? 'Ẩn trần nhà' : 'Hiện trần nhà'}
                </button>
              ) : isAnyPovActive || isFlycamActive ? (
                <button
                  type="button"
                  onClick={() => setShowWalkPad((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    showWalkPad
                      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isFlycamActive ? 'Phím bay' : 'Phím bước'}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 text-xs font-medium text-white hover:bg-white/15 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Mặt bằng T4–19 (M)</span>
              </button>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isUnitPanoramaActive
                ? 'Kéo chuột xoay 360° nhìn từ ban công · Cuộn để phóng to/thu rộng · Đổi tầng hoặc chọn mã căn bên trên để so sánh tầm nhìn'
                : isFlycamActive
                  ? 'Kéo xoay hướng bay · Cuộn tiến/lùi · WASD bay tới/lui · E/Space bay lên · Q/C hạ xuống'
                  : worldMode === 'masterplan' && !masterplanPreset.isPov
                    ? 'Kéo xoay toàn khu · Cuộn thu phóng · Trỏ & nhấn vào tầng bất kỳ trên Tháp A/B hoặc chọn tầng trên thanh điều khiển'
                    : isAnyPovActive
                      ? 'Kéo chuột để xoay góc nhìn · Nhấn WASD hoặc phím mũi tên để đi bộ khám phá'
                      : 'Kéo xoay mô hình căn hộ · Nhấn trực tiếp vào phòng để vào góc nhìn POV'}
            </span>
            <span className="hidden sm:inline font-mono-tabular">
              F: Flycam · V: Đổi POV · M: Mặt bằng · H: Ẩn dock
            </span>
          </div>
        </div>
      </div>

      {/* Dual-Tab Masterplan T4-19 & Active Unit 2D Blueprint Modal */}
      <FloorMinimapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        worldMode={worldMode}
        telemetry={telemetry}
        selectedUnit={selectedUnit}
        selectedFloor={selectedFloor}
        towerFilter={towerFilter}
        onChangeTowerFilter={setTowerFilter}
        onSelectRoom={handleSelectRoom}
        onSelectUnitAndFloor={handleSelectUnitAndFloor}
        onSelectUnitPanorama={handleSelectUnitPanorama}
      />
    </main>
  );
}
