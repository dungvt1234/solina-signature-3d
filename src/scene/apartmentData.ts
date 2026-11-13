export type LightingPreset = 'sunrise' | 'daylight' | 'evening';

export type CameraMode = 'pov' | 'dollhouse';

export interface RoomZone {
  id: string;
  name: string;
  subtitle: string;
  areaLabel: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  povSpawn: { x: number; y: number; z: number; yaw: number; pitch: number };
  dollhouseFocus: { x: number; y: number; z: number };
  minimapCenter: { x: number; z: number };
}

export interface WallSegment {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  thickness: number;
  height: number;
  material?: 'plaster' | 'darkCap' | 'glass' | 'wood' | 'railing';
  collidable: boolean;
}

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const EYE_HEIGHT = 1.62;
export const WALL_HEIGHT = 2.95;
export const PLAYER_RADIUS = 0.26;

export const APARTMENT_BOUNDS = {
  minX: -6.2,
  maxX: 6.2,
  minZ: -3.8,
  maxZ: 3.7,
};

export const ROOM_ZONES: RoomZone[] = [
  {
    id: 'living',
    name: 'Phòng Khách',
    subtitle: 'Sofa cong hướng biển & vách TV gỗ ấm',
    areaLabel: '24,8 m²',
    bounds: { minX: 1.5, maxX: 6.2, minZ: -2.2, maxZ: 1.15 },
    povSpawn: { x: 2.35, y: EYE_HEIGHT, z: 0.45, yaw: -0.95, pitch: -0.05 },
    dollhouseFocus: { x: 3.85, y: 0.6, z: -0.45 },
    minimapCenter: { x: 3.85, z: -0.45 },
  },
  {
    id: 'dining_kitchen',
    name: 'Bếp & Bàn Ăn',
    subtitle: 'Đảo bếp đá Marble & bàn ăn 6 ghế',
    areaLabel: '21,4 m²',
    bounds: { minX: -0.75, maxX: 6.2, minZ: 1.15, maxZ: 3.7 },
    povSpawn: { x: 5.25, y: EYE_HEIGHT, z: 2.85, yaw: 0.92, pitch: -0.05 },
    dollhouseFocus: { x: 3.2, y: 0.6, z: 2.25 },
    minimapCenter: { x: 3.35, z: 2.2 },
  },
  {
    id: 'balcony',
    name: 'Ban Công Biển',
    subtitle: 'Loggia panorama ôm trọn bình minh đại dương',
    areaLabel: '12,6 m²',
    bounds: { minX: -6.2, maxX: 6.2, minZ: -3.8, maxZ: -2.2 },
    povSpawn: { x: 1.15, y: EYE_HEIGHT, z: -2.95, yaw: 0.55, pitch: -0.02 },
    dollhouseFocus: { x: -0.5, y: 0.5, z: -3.0 },
    minimapCenter: { x: -0.55, z: -3.0 },
  },
  {
    id: 'bedroom2',
    name: 'Phòng Ngủ 2',
    subtitle: 'Giường King hướng vịnh & bàn trang điểm',
    areaLabel: '12,2 m²',
    bounds: { minX: -2.25, maxX: 1.35, minZ: -2.2, maxZ: 1.15 },
    povSpawn: { x: 0.72, y: EYE_HEIGHT, z: 0.52, yaw: 1.12, pitch: -0.06 },
    dollhouseFocus: { x: -0.45, y: 0.6, z: -0.55 },
    minimapCenter: { x: -0.45, z: -0.5 },
  },
  {
    id: 'master_bedroom',
    name: 'Phòng Ngủ Master',
    subtitle: 'Góc kính cong panorama & tủ áo âm tường',
    areaLabel: '14,8 m²',
    bounds: { minX: -6.2, maxX: -2.5, minZ: -2.2, maxZ: 1.5 },
    povSpawn: { x: -2.95, y: EYE_HEIGHT, z: 0.65, yaw: 1.15, pitch: -0.06 },
    dollhouseFocus: { x: -4.4, y: 0.6, z: -0.45 },
    minimapCenter: { x: -4.4, z: -0.45 },
  },
  {
    id: 'master_bath',
    name: 'Phòng Tắm Master',
    subtitle: 'Bồn tắm nằm thư giãn, WC & buồng tắm kính',
    areaLabel: '4,2 m²',
    bounds: { minX: -6.2, maxX: -2.6, minZ: 1.5, maxZ: 3.7 },
    povSpawn: { x: -3.05, y: EYE_HEIGHT, z: 2.15, yaw: 1.32, pitch: -0.08 },
    dollhouseFocus: { x: -4.4, y: 0.5, z: 2.6 },
    minimapCenter: { x: -4.4, z: 2.6 },
  },
  {
    id: 'common_bath',
    name: 'Phòng Tắm Chung',
    subtitle: 'Lavabo đá sáng, gương LED & buồng tắm đứng',
    areaLabel: '2,36 m²',
    bounds: { minX: -2.35, maxX: -0.75, minZ: 1.5, maxZ: 3.7 },
    povSpawn: { x: -1.18, y: EYE_HEIGHT, z: 2.05, yaw: 0.48, pitch: -0.08 },
    dollhouseFocus: { x: -1.55, y: 0.5, z: 2.6 },
    minimapCenter: { x: -1.55, z: 2.6 },
  },
];

// Exterior and interior architectural walls matching B.11.17 floorplan
export const WALL_SEGMENTS: WallSegment[] = [
  // South exterior wall (split at Main Entrance Foyer doorway x: 4.95 -> 5.90)
  { id: 'ext-south-1', x1: -6.2, z1: 3.62, x2: 4.95, z2: 3.62, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: 'ext-south-2', x1: 5.9, z1: 3.62, x2: 6.2, z2: 3.62, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // East exterior wall (Living room + Foyer)
  { id: 'ext-east', x1: 6.12, z1: -2.2, x2: 6.12, z2: 3.7, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // West exterior wall (Master Bath + Master Bedroom straight portion before top-left curve)
  { id: 'ext-west', x1: -6.12, z1: -1.5, x2: -6.12, z2: 3.7, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Master Bath North wall (doorway opening x: -3.35 -> -2.60)
  { id: 'mbath-north-1', x1: -6.12, z1: 1.5, x2: -3.38, z2: 1.5, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Master Bath East wall (separating Master Bath from Common Bath / Hall)
  { id: 'mbath-east', x1: -2.55, z1: 1.5, x2: -2.55, z2: 3.62, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Master Bedroom East partition wall (doorway opening at bottom z: 0.60 -> 1.48)
  { id: 'mbed-east', x1: -2.42, z1: -2.2, x2: -2.42, z2: 0.58, thickness: 0.18, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Common Bath West wall
  { id: 'cbath-west', x1: -2.35, z1: 1.5, x2: -2.35, z2: 3.62, thickness: 0.12, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Common Bath North wall (doorway opening x: -1.55 -> -0.82)
  { id: 'cbath-north-1', x1: -2.35, z1: 1.5, x2: -1.58, z2: 1.5, thickness: 0.12, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Common Bath East wall (adjacent to Refrigerator & Kitchen)
  { id: 'cbath-east', x1: -0.78, z1: 1.5, x2: -0.78, z2: 3.62, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Bedroom 2 West wall (shared partition strip facing hallway gap)
  { id: 'bed2-west', x1: -2.22, z1: -2.2, x2: -2.22, z2: 1.15, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Bedroom 2 South wall (doorway opening on right x: 0.45 -> 1.30)
  { id: 'bed2-south', x1: -2.22, z1: 1.15, x2: 0.42, z2: 1.15, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Bedroom 2 East wall (dividing Bedroom 2 and Living Room)
  { id: 'bed2-east', x1: 1.38, z1: -2.2, x2: 1.38, z2: 1.15, thickness: 0.18, height: WALL_HEIGHT, material: 'plaster', collidable: true },

  // Master Bath internal shower/WC divider stubs (visual glass handled separately, partial solid nib)
  { id: 'mbath-tub-lip', x1: -4.88, z1: 1.58, x2: -4.88, z2: 3.55, thickness: 0.05, height: 2.25, material: 'glass', collidable: true },
  { id: 'mbath-wc-glass', x1: -3.92, z1: 1.58, x2: -3.92, z2: 3.55, thickness: 0.04, height: 2.25, material: 'glass', collidable: true },

  // North glass facade frames (with wide open sliding passages to balcony!)
  // Master Bedroom North sliding glass left & right fixed panes (open center x: -4.20 -> -2.90)
  { id: 'glass-mbed-r', x1: -2.95, z1: -2.2, x2: -2.42, z2: -2.2, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  // Bedroom 2 North sliding glass fixed left pane (open passage x: -0.95 -> +0.85)
  { id: 'glass-bed2-l', x1: -2.22, z1: -2.2, x2: -0.95, z2: -2.2, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  { id: 'glass-bed2-r', x1: 0.85, z1: -2.2, x2: 1.38, z2: -2.2, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  // Living Room North sliding glass fixed sides (wide open passage x: 2.15 -> 4.95)
  { id: 'glass-liv-l', x1: 1.38, z1: -2.2, x2: 2.15, z2: -2.2, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  { id: 'glass-liv-r', x1: 4.95, z1: -2.2, x2: 6.12, z2: -2.2, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },

  // Balcony East side glass railing
  { id: 'rail-east', x1: 6.15, z1: -3.76, x2: 6.15, z2: -2.2, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
  // Balcony North straight glass railing (connects curved corner at x = -4.05 to x = +6.15)
  { id: 'rail-north', x1: -4.05, z1: -3.76, x2: 6.15, z2: -3.76, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
];

// Furniture solid collision boxes so POV player slides smoothly around beds, sofa, tables, kitchen
export const FURNITURE_COLLIDERS: ColliderBox[] = [
  // Master Bed
  { minX: -6.08, maxX: -3.88, minZ: -1.45, maxZ: 0.42 },
  // Master Wardrobe
  { minX: -5.95, maxX: -4.05, minZ: 0.92, maxZ: 1.44 },
  // Master Bathtub
  { minX: -6.08, maxX: -4.92, minZ: 1.65, maxZ: 3.55 },
  // Master Vanity
  { minX: -3.1, maxX: -2.6, minZ: 2.65, maxZ: 3.55 },
  // Common Bath Vanity
  { minX: -1.35, maxX: -0.82, minZ: 2.65, maxZ: 3.55 },
  // Bedroom 2 Bed
  { minX: -2.14, maxX: -0.05, minZ: -1.45, maxZ: 0.35 },
  // Bedroom 2 Wardrobe
  { minX: -1.85, maxX: 0.15, minZ: 0.6, maxZ: 1.08 },
  // Bedroom 2 Desk & Chair
  { minX: 0.55, maxX: 1.3, minZ: -1.55, maxZ: -0.15 },
  // Kitchen Counter & Fridge
  { minX: -0.72, maxX: 4.55, minZ: 2.98, maxZ: 3.62 },
  // Dining Table & Chairs
  { minX: 2.65, maxX: 4.65, minZ: 1.32, maxZ: 2.42 },
  // Living Coffee Table
  { minX: 3.3, maxX: 4.3, minZ: -0.95, maxZ: 0.05 },
  // Living Curved Sofa bounding arcs (approximated by two boxes so player can walk around smoothly)
  { minX: 4.55, maxX: 5.38, minZ: -1.55, maxZ: 0.55 },
  { minX: 3.6, maxX: 4.85, minZ: -1.9, maxZ: -1.25 },
  // Living Accent Armchair
  { minX: 2.05, maxX: 2.85, minZ: -1.75, maxZ: -0.95 },
  // Living TV Console
  { minX: 5.55, maxX: 6.08, minZ: -1.8, maxZ: 1.05 },
  // Balcony Lounge Chairs & Table
  { minX: -1.45, maxX: 0.35, minZ: -3.45, maxZ: -2.65 },
];

export type UnitType = 'STUDIO' | '1BR+' | '2BR+2WC';

export interface ApartmentLayoutConfig {
  unitType: UnitType;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  hasCurvedTopLeft: boolean;
  rooms: RoomZone[];
  walls: WallSegment[];
  colliders: ColliderBox[];
}

export function detectRoomAt(
  x: number,
  z: number,
  rooms: RoomZone[] = ROOM_ZONES
): RoomZone {
  for (const room of rooms) {
    if (
      x >= room.bounds.minX &&
      x <= room.bounds.maxX &&
      z >= room.bounds.minZ &&
      z <= room.bounds.maxZ
    ) {
      return room;
    }
  }
  return rooms[0];
}

// 1BR+ Layout (8.8m x 6.4m)
const ONE_BR_ROOMS: RoomZone[] = [
  {
    id: 'living',
    name: 'Phòng Khách & Bếp',
    subtitle: 'Không gian mở hướng biển & bàn đảo Marble',
    areaLabel: '24,2 m²',
    bounds: { minX: -0.05, maxX: 4.4, minZ: -1.75, maxZ: 3.2 },
    povSpawn: { x: 1.55, y: EYE_HEIGHT, z: 0.95, yaw: -0.45, pitch: -0.04 },
    dollhouseFocus: { x: 2.1, y: 0.6, z: 0.6 },
    minimapCenter: { x: 2.15, z: 0.65 },
  },
  {
    id: 'balcony',
    name: 'Ban Công Biển',
    subtitle: 'Loggia ngắm bình minh & thư giãn ngoài trời',
    areaLabel: '8,4 m²',
    bounds: { minX: -4.4, maxX: 4.4, minZ: -3.2, maxZ: -1.75 },
    povSpawn: { x: 0.25, y: EYE_HEIGHT, z: -2.45, yaw: 0.3, pitch: -0.02 },
    dollhouseFocus: { x: 0, y: 0.5, z: -2.45 },
    minimapCenter: { x: 0, z: -2.45 },
  },
  {
    id: 'master_bedroom',
    name: 'Phòng Ngủ Master',
    subtitle: 'Giường King cửa kính biển & bàn trang điểm',
    areaLabel: '14,0 m²',
    bounds: { minX: -4.4, maxX: -0.05, minZ: -1.75, maxZ: 1.35 },
    povSpawn: { x: -0.85, y: EYE_HEIGHT, z: 0.45, yaw: 1.15, pitch: -0.05 },
    dollhouseFocus: { x: -2.2, y: 0.6, z: -0.25 },
    minimapCenter: { x: -2.25, z: -0.25 },
  },
  {
    id: 'plus_nook',
    name: 'Góc Đa Năng (1BR+)',
    subtitle: 'Phòng làm việc / nghỉ phụ & tủ lưu trữ',
    areaLabel: '5,8 m²',
    bounds: { minX: -4.4, maxX: -1.85, minZ: 1.35, maxZ: 3.2 },
    povSpawn: { x: -2.55, y: EYE_HEIGHT, z: 2.05, yaw: 0.65, pitch: -0.05 },
    dollhouseFocus: { x: -3.1, y: 0.5, z: 2.25 },
    minimapCenter: { x: -3.15, z: 2.25 },
  },
  {
    id: 'common_bath',
    name: 'Phòng Tắm',
    subtitle: 'Gương LED soi thực tế & buồng tắm kính đứng',
    areaLabel: '4,2 m²',
    bounds: { minX: -1.85, maxX: -0.05, minZ: 1.35, maxZ: 3.2 },
    povSpawn: { x: -0.58, y: EYE_HEIGHT, z: 1.85, yaw: 0.68, pitch: -0.08 },
    dollhouseFocus: { x: -0.95, y: 0.5, z: 2.25 },
    minimapCenter: { x: -0.95, z: 2.25 },
  },
];

const ONE_BR_WALLS: WallSegment[] = [
  { id: '1br-south-1', x1: -4.4, z1: 3.12, x2: 3.15, z2: 3.12, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: '1br-south-2', x1: 4.08, z1: 3.12, x2: 4.4, z2: 3.12, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: '1br-east', x1: 4.32, z1: -1.75, x2: 4.32, z2: 3.18, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: '1br-west', x1: -4.32, z1: -1.75, x2: -4.32, z2: 3.18, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  // Bedroom partition (doorway z: 0.45 -> 1.32)
  { id: '1br-bed-e', x1: -0.08, z1: -1.75, x2: -0.08, z2: 0.45, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  // Bedroom South wall (doorway into 1BR+ nook x: -2.8 -> -1.95)
  { id: '1br-bed-s1', x1: -4.32, z1: 1.35, x2: -2.85, z2: 1.35, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  // Bath north wall (doorway x: -0.92 -> -0.15)
  { id: '1br-bath-n', x1: -1.88, z1: 1.35, x2: -0.95, z2: 1.35, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: '1br-bath-w', x1: -1.88, z1: 1.35, x2: -1.88, z2: 3.12, thickness: 0.12, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: '1br-bath-e', x1: -0.08, z1: 1.35, x2: -0.08, z2: 3.12, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  // North balcony sliding glass (openings x: -2.9 -> -1.35 and x: 1.15 -> 3.05)
  { id: '1br-glass-1', x1: -4.32, z1: -1.75, x2: -2.95, z2: -1.75, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  { id: '1br-glass-2', x1: -1.35, z1: -1.75, x2: 1.15, z2: -1.75, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  { id: '1br-glass-3', x1: 3.05, z1: -1.75, x2: 4.32, z2: -1.75, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  // Balcony glass railings
  { id: '1br-rail-w', x1: -4.36, z1: -3.16, x2: -4.36, z2: -1.75, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
  { id: '1br-rail-n', x1: -4.36, z1: -3.16, x2: 4.36, z2: -3.16, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
  { id: '1br-rail-e', x1: 4.36, z1: -3.16, x2: 4.36, z2: -1.75, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
];

const ONE_BR_COLLIDERS: ColliderBox[] = [
  { minX: -4.25, maxX: -2.15, minZ: -1.35, maxZ: 0.55 }, // Bed
  { minX: 1.75, maxX: 3.55, minZ: -1.2, maxZ: 0.75 }, // Sofa + Coffee table
  { minX: 3.85, maxX: 4.28, minZ: -1.4, maxZ: 0.9 }, // TV console
  { minX: 0.45, maxX: 3.25, minZ: 2.48, maxZ: 3.08 }, // Kitchen
  { minX: -4.2, maxX: -3.1, minZ: 1.85, maxZ: 3.05 }, // Study desk in 1BR+
  { minX: -0.65, maxX: -0.12, minZ: 2.25, maxZ: 3.05 }, // Bath vanity
  { minX: -0.95, maxX: 0.85, minZ: -2.85, maxZ: -2.1 }, // Balcony lounge
];

// STUDIO Layout (6.2m x 5.6m)
const STUDIO_ROOMS: RoomZone[] = [
  {
    id: 'living',
    name: 'Studio Suite',
    subtitle: 'Giường King view biển trực diện & góc tiếp khách',
    areaLabel: '24,6 m²',
    bounds: { minX: -3.1, maxX: 3.1, minZ: -1.55, maxZ: 1.25 },
    povSpawn: { x: 1.65, y: EYE_HEIGHT, z: 0.95, yaw: 0.55, pitch: -0.05 },
    dollhouseFocus: { x: 0.1, y: 0.6, z: -0.2 },
    minimapCenter: { x: 0.1, z: -0.2 },
  },
  {
    id: 'balcony',
    name: 'Ban Công Biển',
    subtitle: 'Loggia riêng đón nắng biển & hoàng hôn',
    areaLabel: '6,8 m²',
    bounds: { minX: -3.1, maxX: 3.1, minZ: -2.8, maxZ: -1.55 },
    povSpawn: { x: 0.1, y: EYE_HEIGHT, z: -2.15, yaw: 0.18, pitch: -0.02 },
    dollhouseFocus: { x: 0, y: 0.5, z: -2.15 },
    minimapCenter: { x: 0, z: -2.15 },
  },
  {
    id: 'dining_kitchen',
    name: 'Bếp & Sảnh Vào',
    subtitle: 'Khu bếp gọn sang trọng & bàn ăn đôi',
    areaLabel: '4,8 m²',
    bounds: { minX: -0.45, maxX: 3.1, minZ: 1.25, maxZ: 2.8 },
    povSpawn: { x: 2.25, y: EYE_HEIGHT, z: 1.95, yaw: 0.62, pitch: -0.04 },
    dollhouseFocus: { x: 1.35, y: 0.6, z: 2.0 },
    minimapCenter: { x: 1.35, z: 2.0 },
  },
  {
    id: 'common_bath',
    name: 'Phòng Tắm',
    subtitle: 'Lavabo đá sáng, gương LED & vòi sen mưa',
    areaLabel: '3,6 m²',
    bounds: { minX: -3.1, maxX: -0.45, minZ: 1.25, maxZ: 2.8 },
    povSpawn: { x: -0.95, y: EYE_HEIGHT, z: 1.65, yaw: 0.72, pitch: -0.07 },
    dollhouseFocus: { x: -1.75, y: 0.5, z: 2.0 },
    minimapCenter: { x: -1.75, z: 2.0 },
  },
];

const STUDIO_WALLS: WallSegment[] = [
  { id: 'st-south-1', x1: -3.1, z1: 2.72, x2: 1.95, z2: 2.72, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: 'st-south-2', x1: 2.85, z1: 2.72, x2: 3.1, z2: 2.72, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: 'st-east', x1: 3.02, z1: -1.55, x2: 3.02, z2: 2.78, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: 'st-west', x1: -3.02, z1: -1.55, x2: -3.02, z2: 2.78, thickness: 0.16, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  // Bath enclosure (doorway on north x: -1.35 -> -0.58)
  { id: 'st-bath-n', x1: -3.02, z1: 1.25, x2: -1.38, z2: 1.25, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  { id: 'st-bath-e', x1: -0.48, z1: 1.25, x2: -0.48, z2: 2.72, thickness: 0.14, height: WALL_HEIGHT, material: 'plaster', collidable: true },
  // Balcony sliding glass (wide center passage x: -0.75 -> 1.45)
  { id: 'st-glass-l', x1: -3.02, z1: -1.55, x2: -0.75, z2: -1.55, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  { id: 'st-glass-r', x1: 1.45, z1: -1.55, x2: 3.02, z2: -1.55, thickness: 0.06, height: 2.65, material: 'glass', collidable: true },
  // Railings
  { id: 'st-rail-w', x1: -3.06, z1: -2.76, x2: -3.06, z2: -1.55, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
  { id: 'st-rail-n', x1: -3.06, z1: -2.76, x2: 3.06, z2: -2.76, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
  { id: 'st-rail-e', x1: 3.06, z1: -2.76, x2: 3.06, z2: -1.55, thickness: 0.05, height: 1.12, material: 'railing', collidable: true },
];

const STUDIO_COLLIDERS: ColliderBox[] = [
  { minX: -2.95, maxX: -0.9, minZ: -1.25, maxZ: 0.65 }, // Bed
  { minX: 2.55, maxX: 2.98, minZ: -1.2, maxZ: 0.85 }, // TV & console
  { minX: 1.25, maxX: 2.15, minZ: -1.15, maxZ: -0.25 }, // Lounge chair & table
  { minX: -0.35, maxX: 1.85, minZ: 2.1, maxZ: 2.68 }, // Kitchenette
  { minX: -1.05, maxX: -0.52, minZ: 1.85, maxZ: 2.68 }, // Vanity
  { minX: -0.95, maxX: 0.85, minZ: -2.5, maxZ: -1.8 }, // Balcony lounge
];

export function getApartmentLayout(unitType: UnitType): ApartmentLayoutConfig {
  if (unitType === '1BR+') {
    return {
      unitType,
      bounds: { minX: -4.4, maxX: 4.4, minZ: -3.2, maxZ: 3.2 },
      hasCurvedTopLeft: false,
      rooms: ONE_BR_ROOMS,
      walls: ONE_BR_WALLS,
      colliders: ONE_BR_COLLIDERS,
    };
  }
  if (unitType === 'STUDIO') {
    return {
      unitType,
      bounds: { minX: -3.1, maxX: 3.1, minZ: -2.8, maxZ: 2.8 },
      hasCurvedTopLeft: false,
      rooms: STUDIO_ROOMS,
      walls: STUDIO_WALLS,
      colliders: STUDIO_COLLIDERS,
    };
  }
  return {
    unitType: '2BR+2WC',
    bounds: APARTMENT_BOUNDS,
    hasCurvedTopLeft: true,
    rooms: ROOM_ZONES,
    walls: WALL_SEGMENTS,
    colliders: FURNITURE_COLLIDERS,
  };
}
