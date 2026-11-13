import { UnitType } from './apartmentData';

export type WorldMode = 'masterplan' | 'apartment';

export interface MasterplanCameraPreset {
  id:
    | 'se_sunset'
    | 'nw_coast'
    | 'ocean_front'
    | 'pool_courtyard'
    | 'landscape_pov'
    | 'flycam';
  label: string;
  subtitle: string;
  isPov: boolean;
  isFlycam?: boolean;
  position: [number, number, number];
  target: [number, number, number];
  yaw?: number;
  pitch?: number;
}

export interface ProjectUnit {
  code: string;
  tower: 'A' | 'B';
  type: UnitType;
  nfa: string;
  nsa: string;
  defaultFloor: number;
  maxFloor: number;
  wingLabel: string;
  accentColor: string;
}

export interface FlycamWaypoint {
  id: string;
  label: string;
  position: [number, number, number];
  yaw: number;
  pitch: number;
}

export const FLYCAM_WAYPOINTS: FlycamWaypoint[] = [
  {
    id: 'ocean_glide',
    label: 'Lướt mặt biển',
    position: [0, 12, -62],
    yaw: Math.PI,
    pitch: -0.08,
  },
  {
    id: 'tower_b_crown',
    label: 'Đỉnh Tháp B (34F)',
    position: [38, 48, -28],
    yaw: 2.48,
    pitch: -0.42,
  },
  {
    id: 'courtyard_hover',
    label: 'Trên hồ Lagoon',
    position: [-2, 9.5, -24],
    yaw: -3.03,
    pitch: -0.22,
  },
  {
    id: 'se_roundabout',
    label: 'Bùng binh & Biệt thự',
    position: [-44, 26, 38],
    yaw: -0.83,
    pitch: -0.24,
  },
];

export const MASTERPLAN_CAMERA_PRESETS: MasterplanCameraPreset[] = [
  {
    id: 'se_sunset',
    label: 'Toàn khu Đông Nam',
    subtitle: '2 Tháp A–B, bùng binh đón khách & dãy biệt thự ven biển',
    isPov: false,
    position: [-46, 38, 52],
    target: [0, 12, -2],
  },
  {
    id: 'nw_coast',
    label: 'Góc Tây Bắc',
    subtitle: 'Tháp B giật cấp vườn mái & toàn tuyến bờ biển',
    isPov: false,
    position: [56, 42, 42],
    target: [0, 13, -4],
  },
  {
    id: 'ocean_front',
    label: 'Từ biển nhìn vào',
    subtitle: 'Mặt đứng biển, hồ bơi trung tâm & tháp đôi Solina',
    isPov: false,
    position: [-44, 34, -66],
    target: [0, 13, 2],
  },
  {
    id: 'pool_courtyard',
    label: 'Hồ bơi & Tiện ích',
    subtitle: 'Lagoon pool, chòi đèn giọt nước, sân Pickleball & cảnh quan',
    isPov: false,
    position: [2, 15, -36],
    target: [0, 3.5, -2],
  },
  {
    id: 'landscape_pov',
    label: 'Dạo bộ cảnh quan',
    subtitle: 'Góc nhìn người đi bộ quanh hồ bơi & đường dạo ven biển',
    isPov: true,
    position: [-4.5, 1.68, -21.5],
    target: [2, 2.8, -6],
    yaw: -3.0,
    pitch: 0.04,
  },
  {
    id: 'flycam',
    label: 'Flycam 360°',
    subtitle: 'Bay tự do mọi độ cao · Kéo xoay, WASD bay & E/Q lên xuống',
    isPov: false,
    isFlycam: true,
    position: [-26, 26, -52],
    target: [0, 12, -2],
    yaw: -2.66,
    pitch: -0.24,
  },
];

export const PROJECT_UNITS: ProjectUnit[] = [
  {
    code: 'B.11.17',
    tower: 'B',
    type: '2BR+2WC',
    nfa: '92,35 m²',
    nsa: '85,72 m²',
    defaultFloor: 11,
    maxFloor: 34,
    wingLabel: 'Căn góc Nam · Hướng biển & Bình minh',
    accentColor: '#d99b52',
  },
  {
    code: 'B.18.06',
    tower: 'B',
    type: '2BR+2WC',
    nfa: '83,31 m²',
    nsa: '75,49 m²',
    defaultFloor: 18,
    maxFloor: 34,
    wingLabel: 'Cánh Bắc · View toàn vịnh',
    accentColor: '#d99b52',
  },
  {
    code: 'B.14.08',
    tower: 'B',
    type: '1BR+',
    nfa: '50,91 m²',
    nsa: '46,16 m²',
    defaultFloor: 14,
    maxFloor: 30,
    wingLabel: 'Cánh Trung tâm · 1PN+ đa năng',
    accentColor: '#c9886b',
  },
  {
    code: 'B.09.26',
    tower: 'B',
    type: '1BR+',
    nfa: '51,22 m²',
    nsa: '46,08 m²',
    defaultFloor: 9,
    maxFloor: 26,
    wingLabel: 'Cánh Tây · Ban công cong hướng biển',
    accentColor: '#c9886b',
  },
  {
    code: 'B.12.14',
    tower: 'B',
    type: 'STUDIO',
    nfa: '38,84 m²',
    nsa: '34,35 m²',
    defaultFloor: 12,
    maxFloor: 34,
    wingLabel: 'Cánh dọc Biển · Studio nghỉ dưỡng',
    accentColor: '#b99c7b',
  },
  {
    code: 'A.09.07',
    tower: 'A',
    type: '2BR+2WC',
    nfa: '86,59 m²',
    nsa: '79,35 m²',
    defaultFloor: 9,
    maxFloor: 21,
    wingLabel: 'Tháp A Góc Biển · Ban công vòng cung',
    accentColor: '#d99b52',
  },
  {
    code: 'A.06.02',
    tower: 'A',
    type: '1BR+',
    nfa: '66,46 m²',
    nsa: '60,30 m²',
    defaultFloor: 6,
    maxFloor: 21,
    wingLabel: 'Tháp A · View hồ bơi & đại dương',
    accentColor: '#c9886b',
  },
  {
    code: 'A.10.04',
    tower: 'A',
    type: 'STUDIO',
    nfa: '33,37 m²',
    nsa: '29,02 m²',
    defaultFloor: 10,
    maxFloor: 21,
    wingLabel: 'Tháp A · Studio hướng Đông Nam',
    accentColor: '#b99c7b',
  },
];

export function formatUnitCodeForFloor(unit: ProjectUnit, floor: number): string {
  const parts = unit.code.split('.');
  if (parts.length !== 3) return unit.code;
  const padded = String(Math.max(1, Math.min(unit.maxFloor, floor))).padStart(2, '0');
  return `${parts[0]}.${padded}.${parts[2]}`;
}

export interface UnitBalconyView {
  position: [number, number, number];
  yaw: number;
  pitch: number;
  altMeters: number;
  viewSummary: string;
}

function localToWorld(
  cx: number,
  cz: number,
  theta: number,
  lx: number,
  lz: number
): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [cx + lx * c + lz * s, cz - lx * s + lz * c];
}

function localDirToYaw(theta: number, dx: number, dz: number): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const wdx = dx * c + dz * s;
  const wdz = -dx * s + dz * c;
  return Math.atan2(-wdx, -wdz);
}

/**
 * Computes the real 3D balcony camera position and look orientation
 * on Tower A (21F) or Tower B (34F) for any unit & floor (2..maxFloor).
 */
export function getUnitBalconyView(
  unit: ProjectUnit,
  floor: number
): UnitBalconyView {
  const f = Math.max(2, Math.min(unit.maxFloor, floor));
  const floorH = 1.12;
  const y = 2.9 + (f - 2) * floorH + 0.68;
  // Real-world architectural altitude estimate (~3.3m per floor above podium)
  const altMeters = Math.round((6.5 + (f - 2) * 3.3) * 10) / 10;

  // Tower B Wing 1 (coastal stepped) & Wing 2 (34F inward) world transforms
  const bCoastCx = 16.3;
  const bCoastCz = -0.8;
  const bCoastRot = 0.22;

  const bWingCx = 10.9;
  const bWingCz = 8.2;
  const bWingRot = 0.24;

  // Tower A world transform
  const aCx = -14.8;
  const aCz = -4.2;
  const aRot = -Math.PI * 0.28;

  const tierZ =
    f <= 14 ? -6.8 : f <= 19 ? -2.8 : f <= 24 ? 1.2 : 5.2;

  if (unit.code === 'B.11.17') {
    if (f <= 29) {
      const frontZ = f <= 14 ? -10.8 : f <= 19 ? -6.5 : f <= 24 ? -2.5 : 1.3;
      const [wx, wz] = localToWorld(bCoastCx, bCoastCz, bCoastRot, -1.8, frontZ);
      return {
        position: [wx, y, wz],
        yaw: localDirToYaw(bCoastRot, -0.32, -0.95),
        pitch: -0.14,
        altMeters,
        viewSummary: 'Trực diện biển, hồ Lagoon, Tháp A & dải cát ven bờ',
      };
    }
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, 3.2, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.25, -0.97),
      pitch: -0.22,
      altMeters,
      viewSummary: 'Tầm nhìn cao tầng qua vườn mái giật cấp, hồ bơi & biển',
    };
  }

  if (unit.code === 'B.18.06') {
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, -4.2, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.16, -0.99),
      pitch: -0.17,
      altMeters,
      viewSummary: 'Ôm trọn hồ bơi Lagoon, Tháp A & toàn cảnh vịnh biển',
    };
  }

  if (unit.code === 'B.14.08') {
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, -1.0, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.12, -0.99),
      pitch: -0.16,
      altMeters,
      viewSummary: 'Chính giữa nội khu hướng hồ Lagoon & mặt biển',
    };
  }

  if (unit.code === 'B.09.26') {
    if (f <= 29) {
      const [wx, wz] = localToWorld(bCoastCx, bCoastCz, bCoastRot, 5.8, tierZ);
      return {
        position: [wx, y, wz],
        yaw: localDirToYaw(bCoastRot, 0.86, -0.51),
        pitch: -0.16,
        altMeters,
        viewSummary: 'Cánh Tây nhìn xuống sân Pickleball, rừng dừa & bờ biển Tây Bắc',
      };
    }
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, 5.6, -5.2);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, 0.65, -0.76),
      pitch: -0.22,
      altMeters,
      viewSummary: 'View cao tầng sân Pickleball & đường bờ biển phía Bắc',
    };
  }

  if (unit.code === 'B.12.14') {
    if (f <= 29) {
      const [wx, wz] = localToWorld(bCoastCx, bCoastCz, bCoastRot, -5.8, tierZ);
      return {
        position: [wx, y, wz],
        yaw: localDirToYaw(bCoastRot, -0.82, -0.57),
        pitch: -0.16,
        altMeters,
        viewSummary: 'Cánh dọc biển nhìn sang hồ Lagoon, Tháp A & bùng binh',
      };
    }
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, -6.2, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.45, -0.89),
      pitch: -0.22,
      altMeters,
      viewSummary: 'View tầng cao nhìn bao quát cụm hồ bơi, Tháp A & đại dương',
    };
  }

  if (unit.code === 'A.09.07') {
    const [wx, wz] = localToWorld(aCx, aCz, aRot, -3.6, -7.8);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(aRot, -0.58, -0.81),
      pitch: -0.13,
      altMeters,
      viewSummary: 'Mũi cong hướng biển trực diện, thuyền buồm & bãi cát trắng',
    };
  }

  if (unit.code === 'A.06.02') {
    const [wx, wz] = localToWorld(aCx, aCz, aRot, 6.6, -1.8);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(aRot, 0.94, -0.34),
      pitch: -0.15,
      altMeters,
      viewSummary: 'Nhìn thẳng qua hồ bơi Lagoon, chòi đèn & Tháp B 34 tầng',
    };
  }

  // A.10.04 (SE Drop-off Roundabout & SE Coastline)
  const [wx, wz] = localToWorld(aCx, aCz, aRot, -6.6, 2.2);
  return {
    position: [wx, y, wz],
    yaw: localDirToYaw(aRot, -0.85, 0.52),
    pitch: -0.16,
    altMeters,
    viewSummary: 'Hướng Đông Nam nhìn xuống bùng binh đón khách, đại lộ & biển',
  };
}

// Ground bounds for Landscape POV walking (stays cleanly on resort grounds & beach promenade)
export const LANDSCAPE_POV_BOUNDS = {
  minX: -38,
  maxX: 38,
  minZ: -31,
  maxZ: 24,
};
