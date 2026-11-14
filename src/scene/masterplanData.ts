import { UnitType } from './apartmentData';

export type WorldMode = 'masterplan' | 'apartment';

export interface MasterplanCameraPreset {
  id:
    | 'se_sunset'
    | 'nw_coast'
    | 'ocean_front'
    | 'pool_courtyard'
    | 'vungtau_city'
    | 'full_map'
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

export const SOLINA_GEO = {
  lat: 10.371829254703332,
  lng: 107.12343251489503,
  coordsLabel: '10.3718° N, 107.1234° E',
  locationLabel: 'Bãi Chí Linh · Đ. 3 Tháng 2 (QL51C), TP. Vũng Tàu',
  // In masterplan local space, -Z points straight offshore to Biển Đông (~138° SE on Google Maps)
  oceanBearingDeg: 138,
  mapImage: './assets/aistudio/image_18151cc4.png',
  // Exact pixel position of the "Solina Vũng Tàu" pin in the 1920x875 reference map
  pinNormX: 0.649,
  pinNormY: 0.52,
} as const;

export function worldDirToCompassBearing(dx: number, dz: number): number {
  const relDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return (((SOLINA_GEO.oceanBearingDeg + relDeg) % 360) + 360) % 360;
}

export function compassBearingToWorldDir(bearingDeg: number): [number, number] {
  const rad = ((bearingDeg - SOLINA_GEO.oceanBearingDeg) * Math.PI) / 180;
  return [Math.sin(rad), -Math.cos(rad)];
}

export function bearingToCompassInfo(deg: number): {
  short: string;
  name: string;
  landmark: string;
} {
  const d = ((deg % 360) + 360) % 360;
  if (d >= 337.5 || d < 22.5) {
    return { short: 'B', name: 'Bắc', landmark: 'QL51B · Khu Phước Sơn' };
  }
  if (d < 67.5) {
    return { short: 'ĐB', name: 'Đông Bắc', landmark: 'Blanca City · Sun World Aqua' };
  }
  if (d < 112.5) {
    return { short: 'Đ', name: 'Đông', landmark: 'Biển Đông · Bãi tắm Nòng Nọc' };
  }
  if (d < 157.5) {
    return { short: 'ĐN', name: 'Đông Nam', landmark: 'Biển Đông · Bãi Chí Linh' };
  }
  if (d < 202.5) {
    return { short: 'N', name: 'Nam', landmark: 'Biển Đông · Hướng Bãi Sau' };
  }
  if (d < 247.5) {
    return { short: 'TN', name: 'Tây Nam', landmark: 'Golf Paradise · Vias Hotel' };
  }
  if (d < 292.5) {
    return { short: 'T', name: 'Tây', landmark: 'Sân bay Vũng Tàu · Núi Lớn' };
  }
  return { short: 'TB', name: 'Tây Bắc', landmark: 'Đ. 3 Tháng 2 (QL51C) · KDC P.10' };
}

export interface VungTauMapLandmark {
  id: string;
  label: string;
  bearingDeg: number;
  distanceLabel: string;
  normX: number;
  normY: number;
}

export const VUNG_TAU_MAP_LANDMARKS: VungTauMapLandmark[] = [
  {
    id: 'solina',
    label: 'Solina Vũng Tàu (Tâm dự án)',
    bearingDeg: 138,
    distanceLabel: '0 m',
    normX: 0.649,
    normY: 0.52,
  },
  {
    id: 'ocean_se',
    label: 'Biển Đông · Bãi Chí Linh',
    bearingDeg: 138,
    distanceLabel: 'Trực diện biển',
    normX: 0.72,
    normY: 0.62,
  },
  {
    id: 'sunworld_ne',
    label: 'Blanca City & Sun World Aqua',
    bearingDeg: 48,
    distanceLabel: '~1.4 km Đông Bắc',
    normX: 0.75,
    normY: 0.29,
  },
  {
    id: 'paradise_sw',
    label: 'Sân Golf Paradise & Vias Hotel',
    bearingDeg: 228,
    distanceLabel: '~1.8 km Tây Nam',
    normX: 0.46,
    normY: 0.81,
  },
  {
    id: 'highway_nw',
    label: 'Đ. 3 Tháng 2 (QL51C)',
    bearingDeg: 318,
    distanceLabel: '~450 m Tây Bắc',
    normX: 0.6,
    normY: 0.4,
  },
  {
    id: 'hospital_n',
    label: 'Bệnh viện Đa khoa Vũng Tàu',
    bearingDeg: 10,
    distanceLabel: '~2.6 km Bắc',
    normX: 0.705,
    normY: 0.065,
  },
  {
    id: 'airport_w',
    label: 'Sân bay Vũng Tàu',
    bearingDeg: 280,
    distanceLabel: '~3.5 km Tây',
    normX: 0.381,
    normY: 0.448,
  },
  {
    id: 'port_nw',
    label: 'Cảng PTSC & Núi Lớn',
    bearingDeg: 295,
    distanceLabel: '~5.2 km Tây Bắc',
    normX: 0.255,
    normY: 0.228,
  },
];

export const FLYCAM_WAYPOINTS: FlycamWaypoint[] = [
  {
    id: 'ocean_glide',
    label: 'Lướt Biển Đông (ĐN)',
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
    label: 'Hướng Đ. 3 Tháng 2',
    position: [-44, 26, 38],
    yaw: -0.83,
    pitch: -0.24,
  },
  {
    id: 'vungtau_panorama',
    label: 'Toàn cảnh Vũng Tàu',
    position: [135, 138, -210],
    yaw: -2.62,
    pitch: -0.34,
  },
  {
    id: 'full_map_flycam',
    label: 'Toàn map (1020m)',
    position: [365, 1020, -69],
    yaw: 2.386,
    pitch: -1.279,
  },
];

export const MASTERPLAN_CAMERA_PRESETS: MasterplanCameraPreset[] = [
  {
    id: 'se_sunset',
    label: 'Phía Đ. 3 Tháng 2',
    subtitle: 'Nhìn từ phía đất liền QL51C ra Tháp A–B & Biển Đông (ĐN)',
    isPov: false,
    position: [-46, 38, 52],
    target: [0, 12, -2],
  },
  {
    id: 'nw_coast',
    label: 'Phía Golf Paradise (TN)',
    subtitle: 'Góc Tây Nam nhìn Tháp B giật cấp vườn mái & bờ biển Chí Linh',
    isPov: false,
    position: [56, 42, 42],
    target: [0, 13, -4],
  },
  {
    id: 'ocean_front',
    label: 'Từ Biển Đông nhìn vào',
    subtitle: 'Hướng Đông Nam nhìn trực diện mặt biển, hồ Lagoon & tháp đôi',
    isPov: false,
    position: [-44, 34, -66],
    target: [0, 13, 2],
  },
  {
    id: 'pool_courtyard',
    label: 'Hồ bơi & Tiện ích',
    subtitle: 'Lagoon pool giữa 2 tháp, chòi đèn giọt nước & sân Pickleball',
    isPov: false,
    position: [2, 15, -36],
    target: [0, 3.5, -2],
  },
  {
    id: 'vungtau_city',
    label: 'Toàn cảnh Vũng Tàu',
    subtitle: 'Blanca City, Sun World, Đ. 3/2, Golf Paradise, Sân bay & Núi Lớn',
    isPov: false,
    position: [90, 118, 175],
    target: [25, 8, 15],
  },
  {
    id: 'full_map',
    label: 'Toàn map',
    subtitle: 'Bao quát trọn bản đồ Vũng Tàu: Cần Giờ – Núi Lớn – Solina – Đồi Nhái',
    isPov: false,
    position: [365, 1060, -79],
    target: [155, 0, 154],
  },
  {
    id: 'landscape_pov',
    label: 'Dạo bộ cảnh quan',
    subtitle: 'Góc nhìn người đi bộ quanh hồ bơi & đường dạo ven biển Chí Linh',
    isPov: true,
    position: [-4.5, 1.68, -21.5],
    target: [2, 2.8, -6],
    yaw: -3.0,
    pitch: 0.04,
  },
  {
    id: 'flycam',
    label: 'Flycam 360°',
    subtitle: 'Bay tự do quanh tọa độ 10.3718°N, 107.1234°E · WASD bay & E/Q lên xuống',
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
    wingLabel: 'Đông Nam · Trực diện Biển Đông & Bãi Chí Linh',
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
    wingLabel: 'Đông Nam · Ôm trọn hồ Lagoon & Biển Đông',
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
    wingLabel: 'Đông Nam · Trung tâm nội khu hướng biển',
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
    wingLabel: 'Tây Nam · Hướng Golf Paradise, Vias & Bãi Sau',
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
    wingLabel: 'Đông · Nhìn hồ Lagoon, Tháp A & Blanca City',
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
    wingLabel: 'Đông Nam · Mũi cong biển Chí Linh & Sun World',
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
    wingLabel: 'Nam / Tây Nam · Hồ bơi Lagoon & Tháp B 34F',
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
    wingLabel: 'Đông Bắc · Hướng Blanca City, Sun World & Biển Đông',
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
        viewSummary: 'Đông Nam (138°) · Trực diện Biển Đông, hồ Lagoon & Tháp A',
      };
    }
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, 3.2, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.25, -0.97),
      pitch: -0.22,
      altMeters,
      viewSummary: 'Tầng cao hướng Đông Nam · Vườn mái giật cấp & Biển Chí Linh',
    };
  }

  if (unit.code === 'B.18.06') {
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, -4.2, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.16, -0.99),
      pitch: -0.17,
      altMeters,
      viewSummary: 'Đông Nam · Ôm trọn hồ Lagoon, Tháp A & Biển Đông',
    };
  }

  if (unit.code === 'B.14.08') {
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, -1.0, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.12, -0.99),
      pitch: -0.16,
      altMeters,
      viewSummary: 'Đông Nam · Chính giữa nội khu nhìn thẳng Biển Chí Linh',
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
        viewSummary: 'Tây Nam (228°) · Sân Pickleball, Golf Paradise & Bãi Sau',
      };
    }
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, 5.6, -5.2);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, 0.65, -0.76),
      pitch: -0.22,
      altMeters,
      viewSummary: 'Tầng cao Tây Nam · Toàn cảnh Golf Paradise & bờ biển Vũng Tàu',
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
        viewSummary: 'Đông · Hồ Lagoon, Tháp A & dải biển hướng Blanca City',
      };
    }
    const [wx, wz] = localToWorld(bWingCx, bWingCz, bWingRot, -6.2, -5.6);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(bWingRot, -0.45, -0.89),
      pitch: -0.22,
      altMeters,
      viewSummary: 'Tầng cao hướng Đông · Toàn cảnh hồ bơi, Tháp A & Biển Đông',
    };
  }

  if (unit.code === 'A.09.07') {
    const [wx, wz] = localToWorld(aCx, aCz, aRot, -3.6, -7.8);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(aRot, -0.58, -0.81),
      pitch: -0.13,
      altMeters,
      viewSummary: 'Đông / Đông Nam · Mũi cong hướng Biển Đông & Blanca City',
    };
  }

  if (unit.code === 'A.06.02') {
    const [wx, wz] = localToWorld(aCx, aCz, aRot, 6.6, -1.8);
    return {
      position: [wx, y, wz],
      yaw: localDirToYaw(aRot, 0.94, -0.34),
      pitch: -0.15,
      altMeters,
      viewSummary: 'Nam / Tây Nam · Hồ bơi Lagoon, Tháp B 34F & Bãi Chí Linh',
    };
  }

  // A.10.04 (NE / E facing Blanca City, Sun World & SE Roundabout)
  const [wx, wz] = localToWorld(aCx, aCz, aRot, -6.6, 2.2);
  return {
    position: [wx, y, wz],
    yaw: localDirToYaw(aRot, -0.85, 0.52),
    pitch: -0.16,
    altMeters,
    viewSummary: 'Đông Bắc (48°) · Bùng binh đón khách, hướng Sun World & Blanca City',
  };
}

// Ground bounds for Landscape POV walking (stays cleanly on resort grounds & beach promenade)
export const LANDSCAPE_POV_BOUNDS = {
  minX: -38,
  maxX: 38,
  minZ: -31,
  maxZ: 24,
};
