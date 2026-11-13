import { useEffect, useState } from 'react';
import { Building2, Compass, Eye, Layers, Mountain, X } from 'lucide-react';
import {
  RoomZone,
  getApartmentLayout,
} from '../scene/apartmentData';
import {
  PROJECT_UNITS,
  ProjectUnit,
  WorldMode,
  formatUnitCodeForFloor,
  getUnitBalconyView,
} from '../scene/masterplanData';
import { PlayerTelemetry } from './ApartmentCanvas';

interface FloorMinimapModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldMode: WorldMode;
  telemetry: PlayerTelemetry;
  selectedUnit: ProjectUnit;
  selectedFloor: number;
  towerFilter: 'ALL' | 'A' | 'B';
  onChangeTowerFilter: (f: 'ALL' | 'A' | 'B') => void;
  onSelectRoom: (room: RoomZone) => void;
  onSelectUnitAndFloor: (unit: ProjectUnit, floor: number) => void;
  onSelectUnitPanorama: (unit: ProjectUnit, floor: number) => void;
}

const SVG_W = 540;
const SVG_H = 330;
const PAD = 24;

export default function FloorMinimapModal({
  isOpen,
  onClose,
  worldMode,
  telemetry,
  selectedUnit,
  selectedFloor,
  towerFilter,
  onChangeTowerFilter,
  onSelectRoom,
  onSelectUnitAndFloor,
  onSelectUnitPanorama,
}: FloorMinimapModalProps) {
  const [activeTab, setActiveTab] = useState<'masterplan' | 'unit'>(
    worldMode === 'masterplan' ? 'masterplan' : 'unit'
  );
  const [draftFloor, setDraftFloor] = useState<number>(selectedFloor);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(worldMode === 'masterplan' ? 'masterplan' : 'unit');
      setDraftFloor(selectedFloor);
    }
  }, [isOpen, worldMode, selectedFloor]);

  if (!isOpen) return null;

  const layout = getApartmentLayout(selectedUnit.type);
  const toSvgX = (worldX: number) => {
    const norm =
      (worldX - layout.bounds.minX) / (layout.bounds.maxX - layout.bounds.minX);
    return PAD + norm * (SVG_W - PAD * 2);
  };
  const toSvgY = (worldZ: number) => {
    const norm =
      (worldZ - layout.bounds.minZ) / (layout.bounds.maxZ - layout.bounds.minZ);
    return PAD + norm * (SVG_H - PAD * 2);
  };

  const px = toSvgX(telemetry.x);
  const py = toSvgY(telemetry.z);
  const lookAngleDeg = (-telemetry.yaw * 180) / Math.PI;

  const filteredUnits = PROJECT_UNITS.filter(
    (u) => towerFilter === 'ALL' || u.tower === towerFilter
  );

  const activeUnitCode = formatUnitCodeForFloor(selectedUnit, selectedFloor);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.82)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0f1726] p-5 md:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-semibold text-amber-50">
              Mặt bằng Solina Signature by Wyndham
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Chọn căn hộ &amp; tầng bất kỳ (2F–34F) để vào POV 3D thực tế</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-medium">
                Đang chọn: {activeUnitCode} (Tầng {selectedFloor} · {selectedUnit.type})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('masterplan')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'masterplan'
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Mặt bằng &amp; Chọn tầng</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'unit'
                    ? 'bg-amber-500/90 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Sơ đồ căn {activeUnitCode}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng sơ đồ"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeTab === 'masterplan' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-start">
            {/* Reference Typical Floorplan Image */}
            <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#0a111d] p-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2">
                <span>Bản vẽ mặt bằng tầng điển hình (Tầng 4–19)</span>
                <span>Tháp B &amp; Tháp A</span>
              </div>
              <img
                src="./assets/aistudio/image_c4d1a98a.png"
                alt="Mặt bằng tầng điển hình Tầng 4-19 Solina Signature by Wyndham"
                className="w-full h-auto rounded-lg border border-white/10 bg-white"
              />
            </div>

            {/* Interactive Tower, Floor & Unit Selector */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {/* Tower filter & Floor selector */}
              <div className="rounded-xl border border-white/10 bg-[#0a111d] p-3.5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-300">
                    Lọc theo tòa tháp
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
                    {(['ALL', 'B', 'A'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onChangeTowerFilter(t)}
                        className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                          towerFilter === t
                            ? 'bg-amber-500/90 text-slate-950 font-semibold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {t === 'ALL' ? 'Cả 2 Tháp' : `Tháp ${t}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Layers className="w-3.5 h-3.5 text-amber-300" />
                      <span>Chọn tầng muốn vào (2F–34F):</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDraftFloor((f) => Math.max(2, f - 1))}
                        className="w-7 h-7 rounded border border-white/15 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono-tabular text-sm font-semibold text-amber-300 w-16 text-center">
                        Tầng {draftFloor}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraftFloor((f) => Math.min(34, f + 1))}
                        className="w-7 h-7 rounded border border-white/15 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={2}
                    max={34}
                    value={draftFloor}
                    onChange={(e) => setDraftFloor(Number(e.target.value))}
                    aria-label="Thanh trượt chọn cao độ tầng"
                    className="w-full mt-2.5 accent-amber-400 cursor-pointer"
                  />

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {[2, 4, 8, 11, 15, 19, 21, 26, 30, 34].map((fl) => (
                      <button
                        key={fl}
                        type="button"
                        onClick={() => setDraftFloor(fl)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono-tabular cursor-pointer transition-colors ${
                          draftFloor === fl
                            ? 'bg-amber-500/90 text-slate-950 font-semibold'
                            : 'bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        T{fl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {filteredUnits.map((unit) => {
                  const isCurrent = selectedUnit.code === unit.code;
                  const clampedFloor = Math.max(2, Math.min(draftFloor, unit.maxFloor));
                  const displayCode = formatUnitCodeForFloor(unit, clampedFloor);
                  const viewInfo = getUnitBalconyView(unit, clampedFloor);
                  return (
                    <div
                      key={unit.code}
                      className={`rounded-xl border p-3 transition-colors ${
                        isCurrent
                          ? 'border-amber-400/70 bg-amber-500/15'
                          : 'border-white/10 bg-[#0a111d] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-sm font-semibold text-white">
                            {displayCode}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-medium text-amber-200">
                            {unit.type}
                          </span>
                        </div>
                        <span className="font-mono-tabular text-xs text-slate-300">
                          NFA {unit.nfa} · T{clampedFloor}/{unit.maxFloor}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400 truncate">
                        {viewInfo.viewSummary}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectUnitPanorama(unit, clampedFloor);
                            onClose();
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/90 text-slate-950 text-[11px] font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
                        >
                          <Mountain className="w-3.5 h-3.5" />
                          <span>View từ căn T{clampedFloor}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectUnitAndFloor(unit, clampedFloor);
                            onClose();
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-slate-100 text-[11px] font-medium hover:bg-white/15 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Vào nội thất POV</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 items-stretch">
            {/* Interactive 2D Blueprint with Live Player Cone */}
            <div className="rounded-xl border border-white/10 bg-[#0a111d] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2">
                <span>
                  Bản đồ tương tác 2D · {selectedUnit.type} ({selectedUnit.nfa})
                </span>
                <span className="text-amber-300 font-medium">
                  Vị trí: {telemetry.currentRoom.name}
                </span>
              </div>

              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-auto rounded-lg bg-[#101a2b]"
                role="img"
                aria-label={`Sơ đồ 2D căn hộ ${activeUnitCode}`}
              >
                <rect x={0} y={0} width={SVG_W} height={22} fill="#143a59" />
                <text
                  x={SVG_W / 2}
                  y={15}
                  textAnchor="middle"
                  fill="#9ecae8"
                  fontSize="10"
                  letterSpacing="1.5"
                >
                  HƯỚNG BIỂN · TẦNG {selectedFloor}
                </text>

                {layout.rooms.map((room) => {
                  const x = toSvgX(room.bounds.minX);
                  const y = toSvgY(room.bounds.minZ);
                  const w = toSvgX(room.bounds.maxX) - x;
                  const h = toSvgY(room.bounds.maxZ) - y;
                  const isActive = telemetry.currentRoom.id === room.id;

                  return (
                    <g
                      key={room.id}
                      onClick={() => {
                        onSelectRoom(room);
                        onClose();
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill={
                          isActive
                            ? 'rgba(217, 169, 98, 0.22)'
                            : 'rgba(255,255,255,0.03)'
                        }
                        stroke={isActive ? '#e3b368' : 'rgba(255,255,255,0.08)'}
                        strokeWidth={isActive ? 1.5 : 1}
                      />
                      <text
                        x={toSvgX(room.minimapCenter.x)}
                        y={toSvgY(room.minimapCenter.z) - 2}
                        textAnchor="middle"
                        fill={isActive ? '#fde6ba' : '#cbd5e1'}
                        fontSize="10.5"
                        fontWeight={isActive ? '600' : '500'}
                      >
                        {room.name}
                      </text>
                      <text
                        x={toSvgX(room.minimapCenter.x)}
                        y={toSvgY(room.minimapCenter.z) + 11}
                        textAnchor="middle"
                        fill="#7f8fa6"
                        fontSize="8.5"
                      >
                        {room.areaLabel}
                      </text>
                    </g>
                  );
                })}

                {layout.walls.map((w) => (
                  <line
                    key={w.id}
                    x1={toSvgX(w.x1)}
                    y1={toSvgY(w.z1)}
                    x2={toSvgX(w.x2)}
                    y2={toSvgY(w.z2)}
                    stroke={
                      w.material === 'glass' || w.material === 'railing'
                        ? '#60a5fa'
                        : '#e2d9cb'
                    }
                    strokeWidth={
                      w.material === 'glass' || w.material === 'railing' ? 2 : 3.5
                    }
                    strokeLinecap="round"
                  />
                ))}

                {layout.hasCurvedTopLeft && (
                  <path
                    d={`M ${toSvgX(-6.15)} ${toSvgY(-1.5)} Q ${toSvgX(-6.15)} ${toSvgY(-3.76)} ${toSvgX(-4.05)} ${toSvgY(-3.76)}`}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2.5"
                  />
                )}

                {worldMode === 'apartment' && (
                  <g transform={`translate(${px}, ${py}) rotate(${lookAngleDeg})`}>
                    <path
                      d="M 0 0 L -22 -42 A 48 48 0 0 1 22 -42 Z"
                      fill="rgba(245, 189, 96, 0.35)"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={5.5}
                      fill="#f5bd60"
                      stroke="#0f1726"
                      strokeWidth={2}
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Reference Image Preview */}
            <div className="rounded-xl border border-white/10 bg-[#0a111d] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2">
                <span>
                  {selectedUnit.type === '2BR+2WC'
                    ? 'Phối cảnh nội thất mẫu B.11.17'
                    : `Phối cảnh dự án Solina · ${activeUnitCode}`}
                </span>
                <span>
                  NFA {selectedUnit.nfa} · NSA {selectedUnit.nsa}
                </span>
              </div>
              <img
                src={
                  selectedUnit.type === '2BR+2WC'
                    ? './assets/aistudio/image_7ba17adc.png'
                    : './assets/aistudio/image_27fdbc95.png'
                }
                alt={`Phối cảnh ${activeUnitCode}`}
                className="w-full h-full max-h-[270px] object-cover rounded-lg border border-white/10"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
