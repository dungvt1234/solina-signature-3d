import * as THREE from 'three';
import { SOLINA_GEO } from './masterplanData';

const MAP_W = 1480;
const PIXEL_TO_WORLD = MAP_W / 1920;
const ORIGIN_PX = SOLINA_GEO.pinNormX * 1920; // 1246
const ORIGIN_PY = SOLINA_GEO.pinNormY * 875; // 455
const THETA_RAD = (SOLINA_GEO.oceanBearingDeg * Math.PI) / 180;
const COS_T = Math.cos(THETA_RAD);
const SIN_T = Math.sin(THETA_RAD);

export interface BuiltVungTauSurroundings {
  group: THREE.Group;
  highlightsGroup: THREE.Group;
  setHighlightsVisible: (visible: boolean) => void;
  updateHighlights: (
    elapsed: number,
    animateMotion: boolean,
    cameraPos?: THREE.Vector3
  ) => void;
}

/**
 * Converts a pixel coordinate (px, py) on the 1920x875 Vũng Tàu satellite map
 * into exact 3D masterplan world (x, z) coordinates matching satelliteMapGroup.
 */
export function mapPixelToWorld(px: number, py: number): [number, number] {
  const lx = (px - ORIGIN_PX) * PIXEL_TO_WORLD;
  const lz = (py - ORIGIN_PY) * PIXEL_TO_WORLD;
  const wx = lx * COS_T + lz * SIN_T;
  const wz = -3.5 - lx * SIN_T + lz * COS_T;
  return [wx, wz];
}

function buildRoadRibbon(
  pointsPx: [number, number][],
  width: number,
  y: number,
  mat: THREE.Material,
  track: <T extends { dispose: () => void }>(item: T) => T
): THREE.Group {
  const g = new THREE.Group();
  const worldPts = pointsPx.map(([px, py]) => mapPixelToWorld(px, py));
  for (let i = 0; i < worldPts.length - 1; i++) {
    const [x1, z1] = worldPts[i];
    const [x2, z2] = worldPts[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const seg = new THREE.Mesh(
      track(new THREE.BoxGeometry(width, 0.16, len + width * 0.35)),
      mat
    );
    seg.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    seg.rotation.y = angle;
    seg.receiveShadow = true;
    g.add(seg);
  }
  return g;
}

function createCalloutTexture(
  title: string,
  subtitle: string,
  accentCss: string,
  isPrimary: boolean
): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const padX = 24;
  const titleFont = isPrimary
    ? '700 32px system-ui, -apple-system, sans-serif'
    : '700 26px system-ui, -apple-system, sans-serif';
  const subFont = '600 20px system-ui, -apple-system, sans-serif';

  ctx.font = titleFont;
  const w1 = ctx.measureText(title).width;
  ctx.font = subFont;
  const w2 = subtitle ? ctx.measureText(subtitle).width : 0;

  const boxW = Math.min(720, Math.ceil(Math.max(w1, w2) + padX * 2 + 22));
  const boxH = subtitle ? 92 : 58;
  canvas.width = boxW;
  canvas.height = boxH;

  // Rounded dark pill background
  const r = 16;
  ctx.fillStyle = isPrimary
    ? 'rgba(18, 28, 46, 0.94)'
    : 'rgba(10, 17, 30, 0.90)';
  ctx.beginPath();
  ctx.moveTo(r, 2);
  ctx.lineTo(boxW - r, 2);
  ctx.quadraticCurveTo(boxW - 2, 2, boxW - 2, r);
  ctx.lineTo(boxW - 2, boxH - r);
  ctx.quadraticCurveTo(boxW - 2, boxH - 2, boxW - r, boxH - 2);
  ctx.lineTo(r, boxH - 2);
  ctx.quadraticCurveTo(2, boxH - 2, 2, boxH - r);
  ctx.lineTo(2, r);
  ctx.quadraticCurveTo(2, 2, r, 2);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = isPrimary ? 4 : 3;
  ctx.strokeStyle = accentCss;
  ctx.stroke();

  // Left accent bar
  ctx.fillStyle = accentCss;
  ctx.fillRect(14, 14, 7, boxH - 28);

  // Text
  ctx.textBaseline = 'top';
  ctx.font = titleFont;
  ctx.fillStyle = isPrimary ? '#fde68a' : '#f8fafc';
  ctx.fillText(title, 32, 13);

  if (subtitle) {
    ctx.font = subFont;
    ctx.fillStyle = accentCss;
    ctx.fillText(subtitle, 32, 50);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { texture, aspect: boxW / boxH };
}

interface AnimatedHighlight {
  ring: THREE.Mesh;
  diamond: THREE.Mesh;
  diamondBaseY: number;
  sprite: THREE.Sprite;
  spriteBasePos: THREE.Vector3;
  spriteAspect: number;
  isPrimary: boolean;
  phase: number;
}

export function buildVungTauSurroundings(
  isSoftwareGl: boolean,
  track: <T extends { dispose: () => void }>(item: T) => T
): BuiltVungTauSurroundings {
  const group = new THREE.Group();
  const highlightsGroup = new THREE.Group();

  // --- Shared Materials ---
  const roadAsphaltMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x333c48,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  const highwayStripeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd1b36a,
      roughness: 0.72,
      metalness: 0.02,
    })
  );
  const mountainMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2f5a2e,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
    })
  );
  const mountainHighlightMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3e6f37,
      roughness: 0.9,
      flatShading: true,
    })
  );
  const urbanWallMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0.08,
    })
  );
  const urbanRoofMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.05,
    })
  );
  const resortGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x2b7ba8,
      roughness: 0.2,
      metalness: 0.45,
      clearcoat: 0.8,
    })
  );
  const resortWhiteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe6eff6,
      roughness: 0.42,
      metalness: 0.1,
    })
  );
  const aquaPoolMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x19c8e6,
      emissive: new THREE.Color(0x0b7594),
      emissiveIntensity: 0.55,
      roughness: 0.12,
      clearcoat: 0.9,
    })
  );
  const golfGreenMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3e883d,
      roughness: 0.84,
      emissive: new THREE.Color(0x144018),
      emissiveIntensity: 0.18,
    })
  );
  const sandBunkerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe4d5b7,
      roughness: 0.92,
    })
  );
  const runwayMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x454d59,
      roughness: 0.86,
    })
  );
  const runwayLineMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.45,
      emissive: new THREE.Color(0x94a3b8),
      emissiveIntensity: 0.35,
    })
  );

  // --- 1. Major Arterial Highways (Đ. 3 Tháng 2 / QL51C, QL51B, Đ. 30/4 & Đ. Thùy Vân) ---
  const ql51cPts: [number, number][] = [
    [735, 875],
    [785, 745],
    [915, 580],
    [1040, 458],
    [1155, 368],
    [1270, 326],
    [1365, 265],
    [1495, 175],
    [1645, 72],
    [1760, 0],
  ];
  group.add(buildRoadRibbon(ql51cPts, 6.4, 0.13, roadAsphaltMat, track));
  group.add(buildRoadRibbon(ql51cPts, 0.42, 0.19, highwayStripeMat, track));

  const ql51bPts: [number, number][] = [
    [775, 650],
    [820, 465],
    [945, 315],
    [1110, 200],
    [1290, 95],
    [1465, 0],
  ];
  group.add(buildRoadRibbon(ql51bPts, 4.8, 0.12, roadAsphaltMat, track));

  // Đ. 30 Tháng 4 (connecting Tam Thắng -> Sân bay -> Bến Đình / Cảng PTSC)
  const d304Pts: [number, number][] = [
    [615, 575],
    [695, 310],
    [765, 115],
    [835, 0],
  ];
  group.add(buildRoadRibbon(d304Pts, 4.2, 0.11, roadAsphaltMat, track));

  // Đ. Nguyễn An Ninh (connecting Đ. 3/2 roundabout -> Đ. 30/4)
  const nanPts: [number, number][] = [
    [785, 745],
    [680, 675],
    [605, 580],
  ];
  group.add(buildRoadRibbon(nanPts, 3.8, 0.11, roadAsphaltMat, track));

  // --- 2. Đông Bắc (NE): Blanca City Sun Group & Sun World Vung Tau Aqua Adventure ---
  const blancaGroup = new THREE.Group();
  const blancaCentersPx: [number, number, number, number][] = [
    [1370, 272, 13, 24],
    [1405, 250, 15, 30],
    [1442, 232, 14, 26],
    [1480, 212, 12, 20],
  ];
  blancaCentersPx.forEach(([px, py, w, h], idx) => {
    const [wx, wz] = mapPixelToWorld(px, py);
    const tower = new THREE.Group();
    const core = new THREE.Mesh(
      track(new THREE.BoxGeometry(w, h, w * 0.65)),
      resortGlassMat
    );
    core.position.y = h / 2;
    const crown = new THREE.Mesh(
      track(new THREE.BoxGeometry(w + 1.2, 1.5, w * 0.65 + 1.2)),
      resortWhiteMat
    );
    crown.position.y = h + 0.75;
    const podium = new THREE.Mesh(
      track(new THREE.BoxGeometry(w + 3.5, 3.4, w * 0.75 + 2.5)),
      resortWhiteMat
    );
    podium.position.y = 1.7;
    tower.add(podium, core, crown);
    tower.position.set(wx, 0, wz);
    tower.rotation.y = idx % 2 === 0 ? 0.15 : -0.1;
    blancaGroup.add(tower);
  });
  group.add(blancaGroup);

  // Sun World Aqua Adventure Waterpark
  const [swX, swZ] = mapPixelToWorld(1470, 305);
  const sunWorldGroup = new THREE.Group();
  const swLagoon = new THREE.Mesh(
    track(new THREE.CylinderGeometry(26, 28, 0.4, 24)),
    aquaPoolMat
  );
  swLagoon.scale.set(1.38, 1, 0.92);
  swLagoon.position.y = 0.24;
  sunWorldGroup.add(swLagoon);

  const slideColors = [0xf97316, 0xec4899, 0xeab308, 0x06b6d4];
  slideColors.forEach((hex, idx) => {
    const slideTower = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.6, 2.5, 10 + idx * 1.6, 10)),
      track(
        new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.4,
          emissive: new THREE.Color(hex),
          emissiveIntensity: 0.22,
        })
      )
    );
    const angle = (idx / 4) * Math.PI * 2;
    slideTower.position.set(
      Math.cos(angle) * 15,
      5.0 + idx * 0.8,
      Math.sin(angle) * 11
    );
    sunWorldGroup.add(slideTower);
  });
  sunWorldGroup.position.set(swX, 0, swZ);
  group.add(sunWorldGroup);

  // --- 3. Tây Nam (SW): Sân Golf Paradise & Vias Hotel Vũng Tàu ---
  const [golfX, golfZ] = mapPixelToWorld(1045, 585);
  const golfGroup = new THREE.Group();
  const fairway1 = new THREE.Mesh(
    track(new THREE.CylinderGeometry(34, 36, 0.28, 22)),
    golfGreenMat
  );
  fairway1.scale.set(1.85, 1, 0.88);
  fairway1.position.y = 0.16;
  golfGroup.add(fairway1);

  [
    [-18, -8, 6.5],
    [14, 6, 5.2],
    [28, -10, 4.8],
  ].forEach(([bx, bz, r]) => {
    const bunker = new THREE.Mesh(
      track(new THREE.CylinderGeometry(r, r * 1.1, 0.34, 14)),
      sandBunkerMat
    );
    bunker.position.set(bx, 0.2, bz);
    golfGroup.add(bunker);
  });

  const golfPond = new THREE.Mesh(
    track(new THREE.CylinderGeometry(11, 11, 0.34, 18)),
    aquaPoolMat
  );
  golfPond.position.set(4, 0.22, -12);
  golfGroup.add(golfPond);

  const clubhouse = new THREE.Mesh(
    track(new THREE.BoxGeometry(15, 5.0, 9.5)),
    resortWhiteMat
  );
  clubhouse.position.set(-24, 2.5, 14);
  golfGroup.add(clubhouse);
  golfGroup.position.set(golfX, 0, golfZ);
  group.add(golfGroup);

  // Vias Hotel & Bãi Sau beachfront hotels
  const baiSauHotels: [number, number, number, number][] = [
    [840, 815, 14, 24],
    [795, 845, 12, 20],
    [905, 765, 12, 18],
  ];
  baiSauHotels.forEach(([px, py, w, h]) => {
    const [wx, wz] = mapPixelToWorld(px, py);
    const hGroup = new THREE.Group();
    const body = new THREE.Mesh(
      track(new THREE.BoxGeometry(w, h, w * 0.72)),
      resortGlassMat
    );
    body.position.y = h / 2;
    const cap = new THREE.Mesh(
      track(new THREE.BoxGeometry(w + 1, 1.3, w * 0.72 + 1)),
      resortWhiteMat
    );
    cap.position.y = h + 0.65;
    hGroup.add(body, cap);
    hGroup.position.set(wx, 0, wz);
    group.add(hGroup);
  });

  // --- 4. Sân bay Vũng Tàu (Runways & Hangars) ---
  const [apX, apZ] = mapPixelToWorld(732, 392);
  const airportGroup = new THREE.Group();
  const mainRunway = new THREE.Mesh(
    track(new THREE.BoxGeometry(12, 0.24, 92)),
    runwayMat
  );
  mainRunway.position.y = 0.14;
  mainRunway.rotation.y = 0.48;
  const crossRunway = new THREE.Mesh(
    track(new THREE.BoxGeometry(10, 0.24, 58)),
    runwayMat
  );
  crossRunway.position.set(-10, 0.15, 8);
  crossRunway.rotation.y = -0.32;
  const runwayStripe = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.1, 0.28, 84)),
    runwayLineMat
  );
  runwayStripe.position.y = 0.18;
  runwayStripe.rotation.y = 0.48;
  const hangar = new THREE.Mesh(
    track(new THREE.BoxGeometry(17, 5.2, 13)),
    resortWhiteMat
  );
  hangar.position.set(16, 2.6, -12);
  airportGroup.add(mainRunway, crossRunway, runwayStripe, hangar);
  airportGroup.position.set(apX, 0, apZ);
  group.add(airportGroup);

  // --- 5. Bệnh viện Đa khoa Vũng Tàu, Destiny Plaza & Cảng PTSC ---
  const [hospX, hospZ] = mapPixelToWorld(1355, 56);
  const hospGroup = new THREE.Group();
  const hospBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(22, 14, 15)),
    resortWhiteMat
  );
  hospBody.position.y = 7;
  const crossMat = track(
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  const crossA = new THREE.Mesh(track(new THREE.BoxGeometry(10, 0.6, 3.2)), crossMat);
  crossA.position.y = 14.3;
  const crossB = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.6, 10)), crossMat);
  crossB.position.y = 14.3;
  hospGroup.add(hospBody, crossA, crossB);
  hospGroup.position.set(hospX, 0, hospZ);
  group.add(hospGroup);

  // Destiny Entertainment Hub
  const [destX, destZ] = mapPixelToWorld(1156, 178);
  const destinyMall = new THREE.Mesh(
    track(new THREE.CylinderGeometry(12, 14, 11, 8)),
    resortGlassMat
  );
  destinyMall.position.set(destX, 5.5, destZ);
  group.add(destinyMall);

  // Cảng PTSC Vũng Tàu (Quay deck + Gantry Cranes)
  const [portX, portZ] = mapPixelToWorld(490, 200);
  const portGroup = new THREE.Group();
  const quay = new THREE.Mesh(
    track(new THREE.BoxGeometry(58, 1.2, 22)),
    track(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }))
  );
  quay.position.y = 0.6;
  portGroup.add(quay);
  const craneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.45,
      emissive: new THREE.Color(0x9a3412),
      emissiveIntensity: 0.25,
    })
  );
  [-18, 0, 18].forEach((cx) => {
    const mast = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 14, 2.4)), craneMat);
    mast.position.set(cx, 7.5, -2);
    const boom = new THREE.Mesh(track(new THREE.BoxGeometry(2.0, 1.8, 16)), craneMat);
    boom.position.set(cx, 13.5, 4);
    portGroup.add(mast, boom);
  });
  portGroup.position.set(portX, 0, portZ);
  portGroup.rotation.y = 0.38;
  group.add(portGroup);

  // --- 6. Núi Lớn & Núi Nhỏ Coastal Mountain Ridges (Western Vũng Tàu Peninsula) ---
  const mountainPeaksPx: [number, number, number, number][] = [
    [135, 370, 82, 54], // Núi Lớn main peak
    [95, 290, 68, 42], // Núi Lớn north shoulder
    [205, 420, 64, 36], // Chùa Hộ Pháp ridge
    [65, 470, 72, 46], // Bãi Dâu cliffside
    [215, 535, 58, 32], // Bến Đình hills
    [155, 765, 62, 38], // Núi Nhỏ north
    [205, 835, 56, 34], // Núi Nhỏ south / Tượng Chúa
  ];
  mountainPeaksPx.forEach(([px, py, rad, h], idx) => {
    const [wx, wz] = mapPixelToWorld(px, py);
    const mGroup = new THREE.Group();
    const baseCone = new THREE.Mesh(
      track(new THREE.ConeGeometry(rad, h, 9)),
      idx % 2 === 0 ? mountainMat : mountainHighlightMat
    );
    baseCone.position.y = h * 0.45;
    baseCone.scale.set(1.15, 1, 0.85);
    baseCone.rotation.y = idx * 0.7;

    const shoulder = new THREE.Mesh(
      track(new THREE.ConeGeometry(rad * 0.65, h * 0.7, 8)),
      mountainHighlightMat
    );
    shoulder.position.set(rad * 0.35, h * 0.32, -rad * 0.2);
    mGroup.add(baseCone, shoulder);
    mGroup.position.set(wx, 0, wz);
    group.add(mGroup);
  });

  // --- 7. Instanced Vũng Tàu Urban Neighborhoods (Phường 10, Rạch Dừa, Tam Thắng, Bến Đình) ---
  interface BuildingSpec {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    rot: number;
    wallHex: number;
    roofHex: number;
  }
  const buildings: BuildingSpec[] = [];
  const wallPalette = [0xe8e2d7, 0xdce4eb, 0xf2ece1, 0xcfd8e3, 0xe5d6c5];
  const roofPalette = [0x9c4a35, 0x3b5875, 0x5c6672, 0xb85c3e, 0x2d4a66];

  for (let i = 0; i < 420; i++) {
    const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const h2 = Math.abs(Math.sin(i * 78.233 + 1.3) * 19341.123) % 1;
    const h3 = Math.abs(Math.sin(i * 41.7 + 7.1) * 9123.7) % 1;

    const px = 310 + h1 * 1060;
    const py = 35 + h2 * 780;

    const coastX = 1246 + (455 - py) * 1.09;
    if (px > coastX - 28) continue;
    if (Math.hypot(px - 1246, py - 455) < 72) continue;
    if (px > 620 && px < 835 && py > 275 && py < 505) continue;
    if (px > 925 && px < 1185 && py > 465 && py < 700) continue;
    if (px < 330 && py > 250 && py < 610) continue;

    const [wx, wz] = mapPixelToWorld(px, py);
    const isMidRise = h3 > 0.87;
    const w = isMidRise ? 8.5 + (i % 4) * 1.8 : 4.6 + (i % 3) * 1.4;
    const d = isMidRise ? 8.5 + ((i + 1) % 3) * 1.8 : 5.0 + ((i + 2) % 3) * 1.3;
    const h = isMidRise ? 10 + (h3 - 0.87) * 85 : 3.0 + h3 * 5.2;

    buildings.push({
      x: wx,
      z: wz,
      w,
      d,
      h,
      rot: ((i % 5) - 2) * 0.08,
      wallHex: wallPalette[i % wallPalette.length],
      roofHex: isMidRise ? 0x264b6b : roofPalette[i % roofPalette.length],
    });
  }

  if (buildings.length > 0) {
    const unitBox = track(new THREE.BoxGeometry(1, 1, 1));
    const wallInst = new THREE.InstancedMesh(unitBox, urbanWallMat, buildings.length);
    const roofInst = new THREE.InstancedMesh(unitBox, urbanRoofMat, buildings.length);
    const dummy = new THREE.Object3D();
    const colorTmp = new THREE.Color();

    buildings.forEach((b, idx) => {
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      wallInst.setMatrixAt(idx, dummy.matrix);
      wallInst.setColorAt(idx, colorTmp.setHex(b.wallHex));

      dummy.position.set(b.x, b.h + 0.3, b.z);
      dummy.scale.set(b.w + 0.5, 0.6, b.d + 0.5);
      dummy.updateMatrix();
      roofInst.setMatrixAt(idx, dummy.matrix);
      roofInst.setColorAt(idx, colorTmp.setHex(b.roofHex));
    });

    wallInst.instanceMatrix.needsUpdate = true;
    if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
    wallInst.computeBoundingSphere();
    wallInst.castShadow = !isSoftwareGl;
    wallInst.receiveShadow = true;

    roofInst.instanceMatrix.needsUpdate = true;
    if (roofInst.instanceColor) roofInst.instanceColor.needsUpdate = true;
    roofInst.computeBoundingSphere();
    group.add(wallInst, roofInst);
  }

  // --- 8. Instanced Coastal & Urban Foliage ---
  const treeCoords: [number, number, number][] = [];
  for (let i = 0; i < 180; i++) {
    const h1 = Math.abs(Math.sin(i * 31.7 + 2.1) * 31823.4) % 1;
    const h2 = Math.abs(Math.sin(i * 53.3 + 4.9) * 17329.7) % 1;
    const px = 220 + h1 * 1360;
    const py = 40 + h2 * 780;
    const coastX = 1246 + (455 - py) * 1.09;
    if (px > coastX - 18) continue;
    if (Math.hypot(px - 1246, py - 455) < 62) continue;
    if (px > 640 && px < 815 && py > 295 && py < 485) continue;
    const [wx, wz] = mapPixelToWorld(px, py);
    treeCoords.push([wx, wz, 0.9 + (i % 4) * 0.25]);
  }
  if (treeCoords.length > 0) {
    const treeTrunkGeo = track(new THREE.CylinderGeometry(0.22, 0.35, 2.8, 5));
    const treeCanopyGeo = track(new THREE.DodecahedronGeometry(2.2, 0));
    const tTrunkMat = track(new THREE.MeshStandardMaterial({ color: 0x6b523e, roughness: 0.9 }));
    const tLeafMat = track(new THREE.MeshStandardMaterial({ color: 0x3b6d2e, roughness: 0.85 }));

    const tTrunks = new THREE.InstancedMesh(treeTrunkGeo, tTrunkMat, treeCoords.length);
    const tCrowns = new THREE.InstancedMesh(treeCanopyGeo, tLeafMat, treeCoords.length);
    const dummy = new THREE.Object3D();
    treeCoords.forEach(([wx, wz, sc], idx) => {
      dummy.position.set(wx, 1.4 * sc, wz);
      dummy.rotation.set(0, idx * 0.8, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      tTrunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(wx, 3.3 * sc, wz);
      dummy.scale.set(sc * 1.15, sc * 0.9, sc * 1.15);
      dummy.updateMatrix();
      tCrowns.setMatrixAt(idx, dummy.matrix);
    });
    tTrunks.instanceMatrix.needsUpdate = true;
    tTrunks.computeBoundingSphere();
    tCrowns.instanceMatrix.needsUpdate = true;
    tCrowns.computeBoundingSphere();
    group.add(tTrunks, tCrowns);
  }

  // --- 9. Optional Landmark Callout Labels (No highlight lines/rings/arcs) ---
  interface LandmarkLabelSpec {
    title: string;
    subtitle: string;
    px: number;
    py: number;
    css: string;
    labelY: number;
    isPrimary?: boolean;
  }

  const landmarkSpecs: LandmarkLabelSpec[] = [
    {
      title: 'SOLINA SIGNATURE',
      subtitle: 'Tâm dự án · Bãi Chí Linh (10.37°N)',
      px: 1246,
      py: 455,
      css: '#fbbf24',
      labelY: 56,
      isPrimary: true,
    },
    {
      title: 'Đ. 3 Tháng 2 (QL51C)',
      subtitle: 'Trục đại lộ huyết mạch · ~450 m',
      px: 1155,
      py: 368,
      css: '#fbbf24',
      labelY: 20,
    },
    {
      title: 'Blanca City Sun Group',
      subtitle: 'Đại đô thị biển · ~1.4 km (3 phút)',
      px: 1415,
      py: 252,
      css: '#38bdf8',
      labelY: 38,
    },
    {
      title: 'Sun World Aqua Adventure',
      subtitle: 'Công viên nước · ~1.6 km (4 phút)',
      px: 1475,
      py: 305,
      css: '#22d3ee',
      labelY: 28,
    },
    {
      title: 'Sân Golf Paradise',
      subtitle: 'Sân golf 27 hố · ~1.5 km (4 phút)',
      px: 1045,
      py: 585,
      css: '#4ade80',
      labelY: 24,
    },
    {
      title: 'Vias Hotel · Bãi Sau',
      subtitle: 'Tổ hợp nghỉ dưỡng · ~2.4 km',
      px: 840,
      py: 815,
      css: '#f472b6',
      labelY: 32,
    },
    {
      title: 'Bệnh viện Đa khoa Vũng Tàu',
      subtitle: 'Y tế tuyến đầu · ~2.6 km (6 phút)',
      px: 1355,
      py: 56,
      css: '#f87171',
      labelY: 28,
    },
    {
      title: 'Tổ hợp Giải trí Destiny',
      subtitle: 'Thương mại P.10 · ~1.8 km',
      px: 1156,
      py: 178,
      css: '#34d399',
      labelY: 24,
    },
    {
      title: 'Sân bay Vũng Tàu',
      subtitle: 'Hạ tầng hàng không · ~3.5 km',
      px: 732,
      py: 392,
      css: '#93c5fd',
      labelY: 22,
    },
    {
      title: 'Cảng PTSC & Bến Đình',
      subtitle: 'Cảng dịch vụ dầu khí · ~5.2 km',
      px: 490,
      py: 200,
      css: '#fdba74',
      labelY: 26,
    },
    {
      title: 'Bến Phà Vũng Tàu – Cần Giờ',
      subtitle: 'Kết nối biển TP.HCM',
      px: 125,
      py: 165,
      css: '#7dd3fc',
      labelY: 22,
    },
    {
      title: 'Núi Lớn · Thích Ca Phật Đài',
      subtitle: 'Danh thắng sinh thái phía Tây',
      px: 175,
      py: 395,
      css: '#86efac',
      labelY: 62,
    },
    {
      title: 'Bãi biển Đồi Nhái',
      subtitle: 'Dải biển du lịch phía Đông Bắc',
      px: 1815,
      py: 120,
      css: '#5eead4',
      labelY: 22,
    },
  ];

  const animatedHighlights: {
    sprite: THREE.Sprite;
    spriteBasePos: THREE.Vector3;
    spriteAspect: number;
    baseY: number;
    isPrimary: boolean;
  }[] = [];

  landmarkSpecs.forEach((lm) => {
    const [wx, wz] = mapPixelToWorld(lm.px, lm.py);
    const { texture, aspect } = createCalloutTexture(
      lm.title,
      lm.subtitle,
      lm.css,
      Boolean(lm.isPrimary)
    );
    track(texture);
    const spriteMat = track(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
    );
    const sprite = new THREE.Sprite(spriteMat);
    const spriteBasePos = new THREE.Vector3(wx, lm.labelY, wz);
    sprite.position.copy(spriteBasePos);
    sprite.renderOrder = lm.isPrimary ? 20 : 12;
    sprite.scale.set(22 * aspect, 22, 1);
    highlightsGroup.add(sprite);

    animatedHighlights.push({
      sprite,
      spriteBasePos,
      spriteAspect: aspect,
      baseY: lm.labelY,
      isPrimary: Boolean(lm.isPrimary),
    });
  });

  group.add(highlightsGroup);

  const updateHighlights = (
    _elapsed: number,
    _animateMotion: boolean,
    cameraPos?: THREE.Vector3
  ) => {
    if (!highlightsGroup.visible || !cameraPos) return;
    for (let i = 0; i < animatedHighlights.length; i++) {
      const item = animatedHighlights[i];
      const dist = item.spriteBasePos.distanceTo(cameraPos);
      const factor = item.isPrimary ? 0.044 : 0.036;
      const h = THREE.MathUtils.clamp(
        dist * factor,
        item.isPrimary ? 5.6 : 4.2,
        item.isPrimary ? 48 : 38
      );
      item.sprite.scale.set(h * item.spriteAspect, h, 1);
      item.sprite.position.y = item.baseY + Math.max(4, h * 0.45);
    }
  };

  return {
    group,
    highlightsGroup,
    setHighlightsVisible: (visible: boolean) => {
      highlightsGroup.visible = visible;
    },
    updateHighlights,
  };
}
