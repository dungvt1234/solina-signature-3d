import * as THREE from 'three';
import { LightingPreset } from './apartmentData';
import { SOLINA_GEO } from './masterplanData';
import { buildVungTauSurroundings } from './buildVungTauSurroundings';

export interface BuiltMasterplan {
  root: THREE.Group;
  oceanUniforms: { uTime: { value: number } };
  sailboatGroup: THREE.Group;
  towerMeshes: THREE.Object3D[];
  applyLighting: (preset: LightingPreset, scene: THREE.Scene) => void;
  setSatelliteOverlay: (enabled: boolean) => void;
  setHighlightsVisible: (enabled: boolean) => void;
  updateAnimations: (
    elapsed: number,
    animateMotion: boolean,
    cameraPos?: THREE.Vector3
  ) => void;
  dispose: () => void;
}

function makeRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const hw = w / 2;
  const hd = d / 2;
  const rad = Math.min(r, hw * 0.48, hd * 0.48);
  const s = new THREE.Shape();
  s.moveTo(-hw + rad, -hd);
  s.lineTo(hw - rad, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + rad);
  s.lineTo(hw, hd - rad);
  s.quadraticCurveTo(hw, hd, hw - rad, hd);
  s.lineTo(-hw + rad, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - rad);
  s.lineTo(-hw, -hd + rad);
  s.quadraticCurveTo(-hw, -hd, -hw + rad, -hd);
  s.closePath();
  return s;
}

function createFacadeWindowTexture(renderer: THREE.WebGLRenderer): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const ec = document.createElement('canvas');
  ec.width = w;
  ec.height = h;
  const ectx = ec.getContext('2d')!;

  // Ocean-blue reflective curtain-wall base gradient (sky/sea reflection)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0, '#27729c');
  baseGrad.addColorStop(0.5, '#1d5d85');
  baseGrad.addColorStop(1, '#154a6b');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  ectx.fillStyle = '#0e3c59';
  ectx.fillRect(0, 0, w, h);

  const cols = 12;
  const rows = 16;
  const cw = w / cols;
  const rh = h / rows;

  // Deterministic curtain-wall panes: ocean-blue glass with sparse warm interior lights
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const seed = Math.sin(r * 19.31 + col * 73.17) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const x = col * cw + 3;
      const y = r * rh + 4;
      const ww = cw - 6;
      const wh = rh - 8;

      if (frac > 0.84) {
        ctx.fillStyle = frac > 0.92 ? '#ffe2b8' : '#7ea6bd';
        ctx.fillRect(x, y, ww, wh);
        ectx.fillStyle = frac > 0.92 ? '#ffcf88' : '#7898ad';
        ectx.fillRect(x, y, ww, wh);
      } else if (frac > 0.42) {
        ctx.fillStyle = '#338cb8';
        ctx.fillRect(x, y, ww, wh);
        ectx.fillStyle = '#1b648c';
        ectx.fillRect(x, y, ww, wh);
      } else {
        ctx.fillStyle = '#1d628a';
        ctx.fillRect(x, y, ww, wh);
        ectx.fillStyle = '#12496b';
        ectx.fillRect(x, y, ww, wh);
      }

      // Cool ocean-steel mullion lines
      ctx.fillStyle = '#123852';
      ctx.fillRect(x + ww * 0.48, y, 2, wh);
    }
  }

  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const emissiveMap = new THREE.CanvasTexture(ec);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.anisotropy = maxAniso;

  return { map, emissiveMap };
}

function createSiteGroundTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  // Base coastal soil & warm lawn tone
  ctx.fillStyle = '#47683c';
  ctx.fillRect(0, 0, size, size);

  // Subtle organic turf variation
  for (let i = 0; i < 1800; i++) {
    const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * size;
    const y = ((Math.sin(i * 78.233) * 19341.123) % 1 + 1) % 1 * size;
    const rad = 6 + (i % 18);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(88, 126, 62, 0.14)' : 'rgba(42, 68, 36, 0.14)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inland town parcel grid texture (top half of canvas -> +Z inland)
  ctx.fillStyle = '#d8cfb8';
  ctx.fillRect(0, size * 0.56, size, size * 0.44);
  for (let i = 0; i < 65; i++) {
    const gx = (((Math.sin(i * 41.2) * 9123.1) % 1 + 1) % 1) * size;
    const gy = size * 0.57 + (((Math.sin(i * 17.7) * 5321.9) % 1 + 1) % 1) * (size * 0.41);
    ctx.fillStyle = i % 3 === 0 ? '#5c7c48' : i % 3 === 1 ? '#b9ad95' : '#859876';
    ctx.fillRect(gx, gy, 34 + (i % 40), 26 + (i % 34));
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

function createCrownSignTexture(title: string, subtitle: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Deep ocean-metallic sign background
  ctx.fillStyle = '#0e2338';
  ctx.fillRect(0, 0, w, h);

  // Luxury gold pinstripe border
  ctx.strokeStyle = '#c9a56a';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Main brand title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, w / 2, 92);

  // Wyndham luxury subtitle
  ctx.fillStyle = '#dfbb7c';
  ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, w / 2, 168);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSolinaMasterplan(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): BuiltMasterplan {
  const root = new THREE.Group();
  const oceanUniforms = { uTime: { value: 0 } };
  const oceanSunGlint = { value: 1.0 };
  const sailboatGroup = new THREE.Group();
  const towerMeshes: THREE.Object3D[] = [];

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const facadeTex = createFacadeWindowTexture(renderer);
  track(facadeTex.map);
  track(facadeTex.emissiveMap);

  const groundTex = createSiteGroundTexture(renderer);
  track(groundTex);

  // --- Shared Architectural & Landscape Materials ---
  const whiteSlabMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2eef6,
      roughness: 0.38,
      metalness: 0.1,
    })
  );
  const bronzeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xa47449,
      roughness: 0.34,
      metalness: 0.65,
    })
  );
  const towerFinMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b607d,
      roughness: 0.3,
      metalness: 0.62,
    })
  );
  const darkCrownMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x173c59,
      roughness: 0.38,
      metalness: 0.52,
    })
  );
  const towerGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xdff3ff,
      map: facadeTex.map,
      emissiveMap: facadeTex.emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.62,
      roughness: 0.16,
      metalness: 0.42,
      clearcoat: 0.88,
      clearcoatRoughness: 0.12,
    })
  );
  const lobbyGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffdfb3,
      emissive: new THREE.Color(0xffb457),
      emissiveIntensity: 1.4,
      roughness: 0.25,
    })
  );
  const warmLedRimMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffe4b8,
      emissive: new THREE.Color(0xffc068),
      emissiveIntensity: 1.8,
      roughness: 0.2,
    })
  );
  const balconyGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x98d4f4,
      transparent: true,
      opacity: 0.58,
      roughness: 0.08,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const handrailMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x22384a,
      roughness: 0.22,
      metalness: 0.85,
    })
  );
  const balconyLedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfff2dc,
      emissive: new THREE.Color(0xffbf69),
      emissiveIntensity: 1.35,
      roughness: 0.2,
    })
  );
  const crownSignTexB = track(
    createCrownSignTexture('SOLINA SIGNATURE', 'WYNDHAM HOTELS & RESORTS')
  );
  const crownSignTexA = track(
    createCrownSignTexture('SOLINA SIGNATURE', 'LUXURY TOWER RESIDENCES')
  );
  const crownSignMatB = track(
    new THREE.MeshStandardMaterial({
      map: crownSignTexB,
      emissiveMap: crownSignTexB,
      emissive: new THREE.Color(0xffe6be),
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.45,
    })
  );
  const crownSignMatA = track(
    new THREE.MeshStandardMaterial({
      map: crownSignTexA,
      emissiveMap: crownSignTexA,
      emissive: new THREE.Color(0xffe6be),
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.45,
    })
  );
  const grassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4c7838,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const stoneWalkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc5c3be,
      roughness: 0.78,
      metalness: 0.05,
    })
  );
  const asphaltMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b414a,
      roughness: 0.85,
      metalness: 0.04,
    })
  );
  const sandMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe3d3b6,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  const woodDeckMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9b6b43,
      roughness: 0.72,
      metalness: 0.05,
    })
  );
  const villaWhiteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xedeae4,
      roughness: 0.68,
      metalness: 0.04,
    })
  );
  const palmTrunkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x735c47,
      roughness: 0.9,
    })
  );
  const palmLeafMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38662a,
      roughness: 0.75,
      side: THREE.DoubleSide,
    })
  );
  const treeCanopyMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4b7733,
      roughness: 0.82,
    })
  );

  // --- 1. Coastal Ground, Sandy Beach, Ocean & Waves + Geo Satellite Map ---
  const siteGround = new THREE.Mesh(
    track(new THREE.PlaneGeometry(310, 220)),
    track(
      new THREE.MeshStandardMaterial({
        map: groundTex,
        roughness: 0.9,
        metalness: 0.02,
      })
    )
  );
  siteGround.rotation.x = -Math.PI / 2;
  siteGround.position.set(0, -0.04, 86);
  siteGround.receiveShadow = true;
  root.add(siteGround);

  // Geo-calibrated Vũng Tàu Google Maps Satellite Layer (10.3718°N, 107.1234°E)
  const satelliteMapGroup = new THREE.Group();
  satelliteMapGroup.visible = false;
  satelliteMapGroup.position.set(0, 0.0, -3.5);
  satelliteMapGroup.rotation.y = (SOLINA_GEO.oceanBearingDeg * Math.PI) / 180;

  const mapW = 1480;
  const mapH = mapW * (875 / 1920);
  const satTexture = track(
    new THREE.TextureLoader().load(SOLINA_GEO.mapImage, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      tex.needsUpdate = true;
    })
  );
  satTexture.colorSpace = THREE.SRGBColorSpace;
  const satPlaneMat = track(
    new THREE.MeshBasicMaterial({
      map: satTexture,
      color: 0xf4f6f9,
      toneMapped: false,
    })
  );
  const satPlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(mapW, mapH)),
    satPlaneMat
  );
  satPlane.rotation.x = -Math.PI / 2;
  satPlane.position.set(
    -(SOLINA_GEO.pinNormX - 0.5) * mapW,
    0,
    -(SOLINA_GEO.pinNormY - 0.5) * mapH
  );
  satelliteMapGroup.add(satPlane);
  root.add(satelliteMapGroup);

  // Crisp Solina Parcel Pad & Beachfront Boardwalk (used in Real-Map Mode so only the Solina site sits on the map)
  const parcelPad = new THREE.Mesh(
    track(new THREE.BoxGeometry(72, 0.14, 39)),
    grassMat
  );
  parcelPad.position.set(0, -0.02, -1.5);
  parcelPad.receiveShadow = true;
  parcelPad.visible = false;
  root.add(parcelPad);

  const parcelPromenade = new THREE.Mesh(
    track(new THREE.BoxGeometry(76, 0.14, 3.8)),
    stoneWalkMat
  );
  parcelPromenade.position.set(0, 0.03, -20.2);
  parcelPromenade.receiveShadow = true;
  parcelPromenade.visible = false;
  root.add(parcelPromenade);

  // Resort landscaped podium pad (stylized 3D mode)
  const resortLawn = new THREE.Mesh(
    track(new THREE.BoxGeometry(82, 0.24, 42)),
    grassMat
  );
  resortLawn.position.set(0, -0.06, -1);
  resortLawn.receiveShadow = true;
  root.add(resortLawn);

  // Sandy beach strip (-34 <= z <= -22)
  const beach = new THREE.Mesh(
    track(new THREE.BoxGeometry(310, 0.22, 13)),
    sandMat
  );
  beach.position.set(0, -0.14, -27.5);
  beach.receiveShadow = true;
  root.add(beach);

  // Coastal granite promenade (-22 <= z <= -18.5)
  const promenade = new THREE.Mesh(
    track(new THREE.BoxGeometry(310, 0.14, 3.8)),
    stoneWalkMat
  );
  promenade.position.set(0, 0.02, -20.2);
  promenade.receiveShadow = true;
  root.add(promenade);

  // Full 3D Vũng Tàu Surrounding City, Highways, Golf Paradise, Blanca City, Sun World, Airport & Mountains
  const vungTauSurroundings = buildVungTauSurroundings(isSoftwareGl, track);
  root.add(vungTauSurroundings.group);

  // Animated Coastal Ocean with rolling directional swells, receding surf & golden sunset glint
  const oceanGeo = track(new THREE.PlaneGeometry(340, 230, 128, 96));
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x165a7e,
      roughness: 0.16,
      metalness: 0.12,
      clearcoat: 0.88,
      clearcoatRoughness: 0.14,
    })
  );
  oceanMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanUniforms.uTime;
    shader.uniforms.uSunGlint = oceanSunGlint;
    shader.vertexShader =
      `uniform float uTime;\nvarying vec3 vOceanPos;\nvarying float vWaveCrest;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         // Dampen vertical swell right at the sandy beach edge (local z near +115)
         float shoreAtten = smoothstep(115.0, 96.0, position.z);
         float swell1 = sin(position.z * 0.24 - uTime * 1.65 + sin(position.x * 0.05) * 1.2) * 0.26;
         float swell2 = cos(position.x * 0.17 + position.z * 0.21 - uTime * 1.25) * 0.15;
         float chop = sin(position.x * 0.55 - position.z * 0.42 + uTime * 2.3) * 0.06;
         float wave = (swell1 + swell2 + chop) * shoreAtten;
         transformed.y += wave;
         vWaveCrest = clamp((swell1 + swell2) * 1.8 + 0.35, 0.0, 1.0) * shoreAtten;
         vOceanPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader =
      `uniform float uTime;\nuniform float uSunGlint;\nvarying vec3 vOceanPos;\nvarying float vWaveCrest;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Shallow coastal turquoise gradient approaching sandy shoreline (z around -33)
         float shallow = smoothstep(-58.0, -32.0, vOceanPos.z);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.14, 0.54, 0.68), shallow * 0.55);

         // Rolling whitecaps on deeper wave crests
         float crestFoam = smoothstep(0.74, 0.98, vWaveCrest) * smoothstep(-38.0, -70.0, vOceanPos.z);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.93, 0.97), crestFoam * 0.35);

         // 3 Staggered surf bands sweeping shoreward & receding along the beach (-47 -> -31.5)
         float shoreWaveOffset = sin(vOceanPos.x * 0.065 + uTime * 0.45) * 1.15
                               + cos(vOceanPos.x * 0.14 - uTime * 0.3) * 0.45;
         float zShore = vOceanPos.z + shoreWaveOffset;
         float t1 = fract(uTime * 0.24);
         float t2 = fract(uTime * 0.24 + 0.33);
         float t3 = fract(uTime * 0.24 + 0.67);
         float band1 = exp(-pow((zShore - mix(-47.0, -31.8, t1)) * 1.05, 2.0)) * sin(t1 * 3.14159);
         float band2 = exp(-pow((zShore - mix(-47.0, -31.8, t2)) * 1.05, 2.0)) * sin(t2 * 3.14159);
         float band3 = exp(-pow((zShore - mix(-47.0, -31.8, t3)) * 1.05, 2.0)) * sin(t3 * 3.14159);
         float lacy = 0.62 + 0.38 * sin(vOceanPos.x * 1.35 + uTime * 1.4) * cos(vOceanPos.z * 1.7 - uTime * 1.1);
         float swash = clamp((band1 + band2 + band3) * 0.92 * lacy, 0.0, 1.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 0.99), swash * 0.82);

         // Golden horizon sunset reflection path
         float sunAxis = vOceanPos.x + 42.0 * clamp((-vOceanPos.z - 32.0) / 140.0, 0.0, 1.2);
         float shimmer = sin(vOceanPos.x * 1.7 + uTime * 1.9) * cos(vOceanPos.z * 2.1 - uTime * 1.5);
         float colGlow = exp(-abs(sunAxis) * 0.05) * smoothstep(-34.0, -110.0, vOceanPos.z);
         float sparkle = smoothstep(0.28, 0.9, shimmer) * colGlow;
         diffuseColor.rgb += vec3(1.0, 0.78, 0.42) * (colGlow * 0.48 + sparkle * 1.05) * uSunGlint;`
      );
  };
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.set(0, -0.32, -145);
  ocean.receiveShadow = true;
  root.add(ocean);

  // 4 White Sailboats along the coast
  const hullGeo = track(new THREE.ConeGeometry(0.65, 2.8, 6));
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.scale(1, 0.45, 1);
  const sailGeo = track(new THREE.BufferGeometry());
  sailGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        0, 0.2, -0.9,
        0, 3.3, 0.0,
        0, 0.2, 0.95,
      ]),
      3
    )
  );
  sailGeo.computeVertexNormals();
  const sailMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf8f6f0,
      roughness: 0.55,
      side: THREE.DoubleSide,
    })
  );
  const boatPositions: [number, number, number, number][] = [
    [-22, -46, 0.25, 1.15],
    [-8, -54, -0.18, 1.35],
    [4, -44, 0.42, 0.95],
    [18, -58, -0.35, 1.1],
  ];
  boatPositions.forEach(([bx, bz, rotY, sc], idx) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(hullGeo, villaWhiteMat);
    const sail = new THREE.Mesh(sailGeo, sailMat);
    boat.add(hull, sail);
    boat.position.set(bx, -0.15, bz);
    boat.rotation.y = rotY;
    boat.scale.setScalar(sc);
    boat.userData = { baseX: bx, baseZ: bz, phase: idx * 1.4 };
    sailboatGroup.add(boat);
  });
  root.add(sailboatGroup);

  // --- 2. Lagoon Pool, Golden Teardrop Pavilion & Seashell Cabanas ---
  // Both coping & water use rotateX(-Math.PI / 2), so shapeY = -worldZ.
  // Nestled directly inside the central courtyard pocket between Tower B (+X) and Tower A (-X).
  const poolShape = new THREE.Shape();
  poolShape.moveTo(-4.2, 10.8);
  poolShape.bezierCurveTo(-1.8, 12.6, 2.8, 12.4, 4.6, 10.2);
  poolShape.bezierCurveTo(5.8, 8.2, 4.6, 6.2, 3.6, 4.4);
  poolShape.bezierCurveTo(2.8, 2.8, 4.8, 1.2, 4.2, -1.2);
  poolShape.bezierCurveTo(3.4, -2.5, -0.8, -2.4, -2.0, -0.6);
  poolShape.bezierCurveTo(-2.8, 1.2, -1.8, 3.0, -2.8, 4.8);
  poolShape.bezierCurveTo(-4.2, 6.8, -5.6, 8.6, -4.2, 10.8);
  poolShape.closePath();

  const poolCopingGeo = track(
    new THREE.ExtrudeGeometry(poolShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.48,
      curveSegments: 28,
    })
  );
  poolCopingGeo.rotateX(-Math.PI / 2);
  const poolCoping = new THREE.Mesh(poolCopingGeo, stoneWalkMat);
  poolCoping.position.y = 0.0;
  poolCoping.receiveShadow = true;
  root.add(poolCoping);

  const poolWaterGeo = track(
    new THREE.ExtrudeGeometry(poolShape, {
      depth: 0.08,
      bevelEnabled: false,
      curveSegments: 28,
    })
  );
  poolWaterGeo.rotateX(-Math.PI / 2);
  const poolWaterMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x19c8e6,
      emissive: new THREE.Color(0x0d7fa1),
      emissiveIntensity: 0.62,
      roughness: 0.08,
      metalness: 0.06,
      clearcoat: 0.92,
      side: THREE.DoubleSide,
    })
  );
  poolWaterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanUniforms.uTime;
    shader.vertexShader =
      `varying vec3 vPoolPos;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vPoolPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader =
      `uniform float uTime;\nvarying vec3 vPoolPos;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float ripple = sin(vPoolPos.x * 2.4 + uTime * 1.8) * cos(vPoolPos.z * 2.6 - uTime * 1.5);
         diffuseColor.rgb += vec3(0.08, 0.18, 0.20) * smoothstep(0.15, 0.95, ripple);`
      );
  };
  const poolWater = new THREE.Mesh(poolWaterGeo, poolWaterMat);
  poolWater.position.y = 0.16;
  root.add(poolWater);

  // Wooden pool deck & sun loungers along Tower B courtyard edge
  const poolDeck = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.8, 0.12, 2.4)),
    woodDeckMat
  );
  poolDeck.position.set(4.5, 0.1, -6.0);
  poolDeck.rotation.y = 0.28;
  poolDeck.receiveShadow = true;
  root.add(poolDeck);

  // Golden Teardrop / Lotus Lantern Pavilion (Signature courtyard focal landmark)
  const pavilionGroup = new THREE.Group();
  const pavBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.55, 1.75, 0.25, 20)),
    bronzeMat
  );
  pavBase.position.y = 0.14;
  pavilionGroup.add(pavBase);

  const domePoints = [
    new THREE.Vector2(1.4, 0.25),
    new THREE.Vector2(1.58, 1.15),
    new THREE.Vector2(1.32, 2.1),
    new THREE.Vector2(0.72, 2.95),
    new THREE.Vector2(0.05, 3.5),
  ];
  const domeGeo = track(new THREE.LatheGeometry(domePoints, 18));
  const pavGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffd796,
      emissive: new THREE.Color(0xffa73b),
      emissiveIntensity: 1.5,
      roughness: 0.28,
      transparent: true,
      opacity: 0.88,
    })
  );
  const pavDome = new THREE.Mesh(domeGeo, pavGlowMat);
  pavilionGroup.add(pavDome);

  // Ribbed bronze arches around lantern
  const ribGeo = track(new THREE.TorusGeometry(1.5, 0.045, 6, 20, Math.PI));
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(ribGeo, bronzeMat);
    rib.position.y = 1.3;
    rib.rotation.y = (i / 6) * Math.PI;
    rib.scale.set(0.95, 1.45, 1);
    pavilionGroup.add(rib);
  }
  const pavLight = new THREE.PointLight(0xffb554, 4.5, 14, 1.6);
  pavLight.position.set(0, 1.9, 0);
  pavilionGroup.add(pavLight);
  pavilionGroup.position.set(5.4, 0.08, -0.4);
  root.add(pavilionGroup);

  // 4 Pleated Seashell Cabanas / Umbrellas around pool
  const cabanaConeGeo = track(new THREE.ConeGeometry(1.55, 0.65, 12));
  const cabanaPoleGeo = track(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 8));
  const cabanaMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe8ded1,
      roughness: 0.65,
      side: THREE.DoubleSide,
    })
  );
  [
    [-4.6, -3.4],
    [-5.2, -6.8],
    [-5.8, -10.0],
    [5.4, -10.2],
  ].forEach(([cx, cz]) => {
    const cab = new THREE.Group();
    const pole = new THREE.Mesh(cabanaPoleGeo, bronzeMat);
    pole.position.y = 1.0;
    const top = new THREE.Mesh(cabanaConeGeo, cabanaMat);
    top.position.y = 2.05;
    top.castShadow = !isSoftwareGl;
    cab.add(pole, top);
    cab.position.set(cx, 0.05, cz);
    root.add(cab);
  });

  // Curved Courtyard Stone Walkways & Colorful Playground Pad
  const walkwayArc = new THREE.Mesh(
    track(new THREE.RingGeometry(8.5, 10.6, 28, 1, 0.15, Math.PI * 0.85)),
    stoneWalkMat
  );
  walkwayArc.rotation.x = -Math.PI / 2;
  walkwayArc.position.set(0, 0.08, -7.8);
  root.add(walkwayArc);

  const playgroundPad = new THREE.Mesh(
    track(new THREE.CylinderGeometry(2.2, 2.2, 0.1, 18)),
    track(new THREE.MeshStandardMaterial({ color: 0xd96b43, roughness: 0.78 }))
  );
  playgroundPad.position.set(-8.5, 0.08, -15.0);
  root.add(playgroundPad);

  // --- 3. Two Green Fenced Pickleball / Tennis Courts (Left of Tower B) ---
  const courtGroup = new THREE.Group();
  const courtPad = new THREE.Mesh(
    track(new THREE.BoxGeometry(9.6, 0.14, 12.2)),
    track(new THREE.MeshStandardMaterial({ color: 0x1e6f4c, roughness: 0.8 }))
  );
  courtPad.receiveShadow = true;
  courtGroup.add(courtPad);

  const courtInnerMat = track(
    new THREE.MeshStandardMaterial({ color: 0x268c5e, roughness: 0.75 })
  );
  const courtLineMat = track(
    new THREE.MeshBasicMaterial({ color: 0xf4f4f0 })
  );
  const fenceMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1d4d3a,
      roughness: 0.6,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    })
  );

  [-2.35, 2.35].forEach((cx) => {
    const inner = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.7, 0.15, 9.6)),
      courtInnerMat
    );
    inner.position.set(cx, 0.01, 0);
    courtGroup.add(inner);

    // Net
    const net = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.8, 0.55, 0.08)),
      courtLineMat
    );
    net.position.set(cx, 0.35, 0);
    courtGroup.add(net);
  });

  // Translucent perimeter mesh fence
  const fenceN = new THREE.Mesh(track(new THREE.BoxGeometry(9.6, 1.5, 0.08)), fenceMat);
  fenceN.position.set(0, 0.8, -6.05);
  const fenceS = fenceN.clone();
  fenceS.position.set(0, 0.8, 6.05);
  const fenceW = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 1.5, 12.2)), fenceMat);
  fenceW.position.set(-4.78, 0.8, 0);
  const fenceE = fenceW.clone();
  fenceE.position.set(4.78, 0.8, 0);
  courtGroup.add(fenceN, fenceS, fenceW, fenceE);
  courtGroup.position.set(29.2, 0.08, -7.2);
  root.add(courtGroup);

  // --- 4. South-East Drop-off Roundabout & Resort Avenue ---
  const avenue = new THREE.Mesh(
    track(new THREE.BoxGeometry(190, 0.1, 7.2)),
    asphaltMat
  );
  avenue.position.set(-14, -0.01, 18.5);
  avenue.rotation.y = -0.22;
  avenue.receiveShadow = true;
  root.add(avenue);

  const sideRoad = new THREE.Mesh(
    track(new THREE.BoxGeometry(7.0, 0.1, 74)),
    asphaltMat
  );
  sideRoad.position.set(-27.5, -0.01, 20);
  sideRoad.rotation.y = 0.22;
  sideRoad.receiveShadow = true;
  root.add(sideRoad);

  const roundaboutGroup = new THREE.Group();
  const outerAsphalt = new THREE.Mesh(
    track(new THREE.CylinderGeometry(7.2, 7.2, 0.12, 32)),
    asphaltMat
  );
  const curbRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(3.4, 0.28, 8, 32)),
    stoneWalkMat
  );
  curbRing.rotation.x = Math.PI / 2;
  curbRing.position.y = 0.12;
  const centerGrass = new THREE.Mesh(
    track(new THREE.CylinderGeometry(3.2, 3.2, 0.22, 24)),
    grassMat
  );
  centerGrass.position.y = 0.08;
  roundaboutGroup.add(outerAsphalt, curbRing, centerGrass);
  roundaboutGroup.position.set(-25.5, 0.02, 13.5);
  root.add(roundaboutGroup);

  // --- 5. TOWER B (34 Floors, NW / Left when facing inland from beach) ---
  // Open L/Boomerang plan: Coastal stepped wing on +X side next to Pickleball,
  // bending inward (-X) at the inland end so its flank & 34F wing face toward Tower A & Lagoon Pool.
  const towerBGroup = new THREE.Group();
  towerBGroup.position.set(15.5, 0, 1.8);

  const floorH = 1.12;

  // 2-story warm bronze podiums following both wings of Tower B
  const podiumB1Geo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(10.6, 19.2, 2.2), {
      depth: 2.9,
      bevelEnabled: false,
      curveSegments: 16,
    })
  );
  podiumB1Geo.rotateX(-Math.PI / 2);
  const podiumB1 = new THREE.Mesh(podiumB1Geo, bronzeMat);
  podiumB1.position.set(0.8, 0, -2.6);
  podiumB1.rotation.y = 0.22;
  podiumB1.castShadow = !isSoftwareGl;
  podiumB1.receiveShadow = true;
  podiumB1.userData.tower = 'B';
  towerBGroup.add(podiumB1);
  towerMeshes.push(podiumB1);

  const podiumB2Geo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(15.2, 10.0, 2.0), {
      depth: 2.9,
      bevelEnabled: false,
      curveSegments: 16,
    })
  );
  podiumB2Geo.rotateX(-Math.PI / 2);
  const podiumB2 = new THREE.Mesh(podiumB2Geo, bronzeMat);
  podiumB2.position.set(-4.6, 0, 6.4);
  podiumB2.rotation.y = 0.24;
  podiumB2.castShadow = !isSoftwareGl;
  podiumB2.receiveShadow = true;
  podiumB2.userData.tower = 'B';
  towerBGroup.add(podiumB2);
  towerMeshes.push(podiumB2);

  // Glowing ground lobby cores under both wings
  const lobbyB1 = new THREE.Mesh(
    track(new THREE.BoxGeometry(8.4, 2.3, 16.6)),
    lobbyGlowMat
  );
  lobbyB1.position.set(0.8, 1.25, -2.6);
  lobbyB1.rotation.y = 0.22;
  towerBGroup.add(lobbyB1);

  const lobbyB2 = new THREE.Mesh(
    track(new THREE.BoxGeometry(12.8, 2.3, 7.8)),
    lobbyGlowMat
  );
  lobbyB2.position.set(-4.6, 1.25, 6.4);
  lobbyB2.rotation.y = 0.24;
  towerBGroup.add(lobbyB2);

  // Wing 1: Coastal Stepped Terrace Wing (14F near beach -> 19F -> 24F -> 29F inland)
  // Angled slightly (0.22 rad) so its broad inner side faces Tower A & Lagoon Pool (-X)
  const bCoastGroup = new THREE.Group();
  bCoastGroup.position.set(0.8, 0, -2.6);
  bCoastGroup.rotation.y = 0.22;

  const bTiers = [
    { w: 8.6, d: 5.4, cz: -6.8, floors: 14, r: 2.0 },
    { w: 8.8, d: 4.8, cz: -2.8, floors: 19, r: 1.5 },
    { w: 9.0, d: 4.8, cz: 1.2, floors: 24, r: 1.5 },
    { w: 9.2, d: 5.2, cz: 5.2, floors: 29, r: 1.5 },
  ];

  // Build rounded balconies, curved glass balustrades, top handrails & LED ribbons for Wing 1
  const bTerraceMatrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  bTiers.forEach((tier) => {
    const h = tier.floors * floorH;
    const coreGeo = track(
      new THREE.ExtrudeGeometry(makeRoundedRectShape(tier.w - 0.7, tier.d - 0.5, tier.r), {
        depth: h,
        bevelEnabled: false,
        curveSegments: 14,
      })
    );
    coreGeo.rotateX(-Math.PI / 2);
    const coreMesh = new THREE.Mesh(coreGeo, towerGlassMat);
    coreMesh.position.set(0, 2.9, tier.cz);
    coreMesh.castShadow = !isSoftwareGl;
    coreMesh.receiveShadow = true;
    coreMesh.userData.tower = 'B';
    bCoastGroup.add(coreMesh);
    towerMeshes.push(coreMesh);

    // Rounded slab shape for this tier
    const slabShape = makeRoundedRectShape(tier.w, tier.d, tier.r);
    const slabGeo = track(
      new THREE.ExtrudeGeometry(slabShape, {
        depth: 0.22,
        bevelEnabled: false,
        curveSegments: 14,
      })
    );
    slabGeo.rotateX(-Math.PI / 2);

    // Curved glass balustrade shape
    const railingShape = makeRoundedRectShape(tier.w, tier.d, tier.r);
    railingShape.holes.push(
      makeRoundedRectShape(tier.w - 0.16, tier.d - 0.16, Math.max(0.2, tier.r - 0.08))
    );
    const railingGeo = track(
      new THREE.ExtrudeGeometry(railingShape, {
        depth: 0.36,
        bevelEnabled: false,
        curveSegments: 14,
      })
    );
    railingGeo.rotateX(-Math.PI / 2);

    // Sleek metallic top handrail
    const handrailGeo = track(
      new THREE.ExtrudeGeometry(railingShape, {
        depth: 0.035,
        bevelEnabled: false,
        curveSegments: 14,
      })
    );
    handrailGeo.rotateX(-Math.PI / 2);

    // Underside warm architectural LED ribbon
    const ledGeo = track(
      new THREE.ExtrudeGeometry(railingShape, {
        depth: 0.045,
        bevelEnabled: false,
        curveSegments: 14,
      })
    );
    ledGeo.rotateX(-Math.PI / 2);

    const tierSlabs = new THREE.InstancedMesh(slabGeo, whiteSlabMat, tier.floors + 1);
    const tierRailings = new THREE.InstancedMesh(railingGeo, balconyGlassMat, tier.floors);
    const tierHandrails = new THREE.InstancedMesh(handrailGeo, handrailMat, tier.floors);
    const tierLeds = new THREE.InstancedMesh(ledGeo, balconyLedMat, tier.floors);

    for (let f = 0; f <= tier.floors; f++) {
      dummy.position.set(0, 2.9 + f * floorH, tier.cz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tierSlabs.setMatrixAt(f, dummy.matrix);

      if (f >= 1) {
        dummy.position.set(0, 2.9 + f * floorH + 0.22, tier.cz);
        dummy.updateMatrix();
        tierRailings.setMatrixAt(f - 1, dummy.matrix);

        dummy.position.set(0, 2.9 + f * floorH + 0.22 + 0.36, tier.cz);
        dummy.updateMatrix();
        tierHandrails.setMatrixAt(f - 1, dummy.matrix);

        dummy.position.set(0, 2.9 + f * floorH + 0.17, tier.cz);
        dummy.updateMatrix();
        tierLeds.setMatrixAt(f - 1, dummy.matrix);
      }
    }
    tierSlabs.instanceMatrix.needsUpdate = true;
    tierSlabs.computeBoundingSphere();
    tierSlabs.castShadow = !isSoftwareGl;
    tierSlabs.receiveShadow = true;

    tierRailings.instanceMatrix.needsUpdate = true;
    tierRailings.computeBoundingSphere();
    tierHandrails.instanceMatrix.needsUpdate = true;
    tierHandrails.computeBoundingSphere();
    tierLeds.instanceMatrix.needsUpdate = true;
    tierLeds.computeBoundingSphere();

    bCoastGroup.add(tierSlabs, tierRailings, tierHandrails, tierLeds);

    // Lush green rooftop terrace garden on each stepped roof
    const garden = new THREE.Mesh(
      track(new THREE.BoxGeometry(tier.w - 0.9, 0.35, tier.d - 0.8)),
      grassMat
    );
    garden.position.set(0, 2.9 + h + 0.18, tier.cz);
    bCoastGroup.add(garden);

    for (let b = 0; b < 5; b++) {
      dummy.position.set(
        -tier.w * 0.34 + b * (tier.w * 0.17),
        2.9 + h + 0.62,
        tier.cz + ((b % 2) - 0.5) * 1.1
      );
      dummy.scale.setScalar(0.52 + (b % 3) * 0.15);
      dummy.updateMatrix();
      bTerraceMatrices.push(dummy.matrix.clone());
    }
  });

  // Terrace shrubs instanced mesh for Wing 1
  if (bTerraceMatrices.length > 0) {
    const shrubGeo = track(new THREE.SphereGeometry(0.65, 8, 6));
    const shrubInst = new THREE.InstancedMesh(
      shrubGeo,
      treeCanopyMat,
      bTerraceMatrices.length
    );
    bTerraceMatrices.forEach((m, i) => shrubInst.setMatrixAt(i, m));
    shrubInst.instanceMatrix.needsUpdate = true;
    shrubInst.computeBoundingSphere();
    bCoastGroup.add(shrubInst);
  }

  // Vertical bronze fins along Wing 1
  const bCoastFinGeo = track(new THREE.BoxGeometry(0.24, 32, 0.42));
  const bCoastFinOffsets: [number, number, number][] = [
    [-4.35, 17.5, -5.8],
    [4.35, 17.5, -5.8],
    [-4.55, 19.5, 0.8],
    [4.55, 19.5, 0.8],
    [-4.65, 21.0, 5.2],
    [4.65, 21.0, 5.2],
  ];
  const bCoastFinInst = new THREE.InstancedMesh(
    bCoastFinGeo,
    towerFinMat,
    bCoastFinOffsets.length
  );
  bCoastFinOffsets.forEach(([fx, fy, fz], i) => {
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bCoastFinInst.setMatrixAt(i, dummy.matrix);
  });
  bCoastFinInst.instanceMatrix.needsUpdate = true;
  bCoastFinInst.computeBoundingSphere();
  bCoastGroup.add(bCoastFinInst);
  towerBGroup.add(bCoastGroup);

  // Wing 2: Tall 34F Inland Wing bending INWARD (-X) toward Tower A & Lagoon Pool
  const bWingGroup = new THREE.Group();
  bWingGroup.position.set(-4.6, 0, 6.4);
  bWingGroup.rotation.y = 0.24;

  const wingFloors = 34;
  const wingH = wingFloors * floorH;
  const wingCoreGeo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(13.2, 7.8, 1.8), {
      depth: wingH,
      bevelEnabled: false,
      curveSegments: 14,
    })
  );
  wingCoreGeo.rotateX(-Math.PI / 2);
  const wingCore = new THREE.Mesh(wingCoreGeo, towerGlassMat);
  wingCore.position.y = 2.9;
  wingCore.castShadow = !isSoftwareGl;
  wingCore.receiveShadow = true;
  wingCore.userData.tower = 'B';
  bWingGroup.add(wingCore);
  towerMeshes.push(wingCore);

  const wingSlabUnitGeo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(14.0, 8.6, 2.0), {
      depth: 0.22,
      bevelEnabled: false,
      curveSegments: 14,
    })
  );
  wingSlabUnitGeo.rotateX(-Math.PI / 2);
  const wingSlabs = new THREE.InstancedMesh(wingSlabUnitGeo, whiteSlabMat, wingFloors + 1);
  for (let f = 0; f <= wingFloors; f++) {
    dummy.position.set(0, 2.9 + f * floorH, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    wingSlabs.setMatrixAt(f, dummy.matrix);
  }
  wingSlabs.instanceMatrix.needsUpdate = true;
  wingSlabs.computeBoundingSphere();
  wingSlabs.castShadow = !isSoftwareGl;
  wingSlabs.receiveShadow = true;
  bWingGroup.add(wingSlabs);

  // Wing 2 Curved Glass Balustrades, Metallic Handrails & Underside LED Ribbons
  const wingRailingShape = makeRoundedRectShape(14.0, 8.6, 2.0);
  wingRailingShape.holes.push(makeRoundedRectShape(13.84, 8.44, 1.92));

  const wingRailingGeo = track(
    new THREE.ExtrudeGeometry(wingRailingShape, {
      depth: 0.36,
      bevelEnabled: false,
      curveSegments: 14,
    })
  );
  wingRailingGeo.rotateX(-Math.PI / 2);

  const wingHandrailGeo = track(
    new THREE.ExtrudeGeometry(wingRailingShape, {
      depth: 0.035,
      bevelEnabled: false,
      curveSegments: 14,
    })
  );
  wingHandrailGeo.rotateX(-Math.PI / 2);

  const wingLedGeo = track(
    new THREE.ExtrudeGeometry(wingRailingShape, {
      depth: 0.045,
      bevelEnabled: false,
      curveSegments: 14,
    })
  );
  wingLedGeo.rotateX(-Math.PI / 2);

  const wingRailings = new THREE.InstancedMesh(wingRailingGeo, balconyGlassMat, wingFloors);
  const wingHandrails = new THREE.InstancedMesh(wingHandrailGeo, handrailMat, wingFloors);
  const wingLeds = new THREE.InstancedMesh(wingLedGeo, balconyLedMat, wingFloors);

  for (let f = 1; f <= wingFloors; f++) {
    dummy.position.set(0, 2.9 + f * floorH + 0.22, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    wingRailings.setMatrixAt(f - 1, dummy.matrix);

    dummy.position.set(0, 2.9 + f * floorH + 0.22 + 0.36, 0);
    dummy.updateMatrix();
    wingHandrails.setMatrixAt(f - 1, dummy.matrix);

    dummy.position.set(0, 2.9 + f * floorH + 0.17, 0);
    dummy.updateMatrix();
    wingLeds.setMatrixAt(f - 1, dummy.matrix);
  }
  wingRailings.instanceMatrix.needsUpdate = true;
  wingRailings.computeBoundingSphere();
  wingHandrails.instanceMatrix.needsUpdate = true;
  wingHandrails.computeBoundingSphere();
  wingLeds.instanceMatrix.needsUpdate = true;
  wingLeds.computeBoundingSphere();
  bWingGroup.add(wingRailings, wingHandrails, wingLeds);

  // Vertical bronze fins along Wing 2 facing Tower A & Ocean
  const bWingFinGeo = track(new THREE.BoxGeometry(0.24, wingH + 1.0, 0.45));
  const bWingFinOffsets: [number, number][] = [
    [-4.2, -4.15],
    [0.0, -4.15],
    [4.2, -4.15],
    [-4.2, 4.15],
    [0.0, 4.15],
    [4.2, 4.15],
  ];
  const bWingFinInst = new THREE.InstancedMesh(
    bWingFinGeo,
    towerFinMat,
    bWingFinOffsets.length
  );
  bWingFinOffsets.forEach(([fx, fz], i) => {
    dummy.position.set(fx, 2.9 + wingH / 2, fz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bWingFinInst.setMatrixAt(i, dummy.matrix);
  });
  bWingFinInst.instanceMatrix.needsUpdate = true;
  bWingFinInst.computeBoundingSphere();
  bWingGroup.add(bWingFinInst);

  // Tower B 34F Crown, Rooftop Infinity Pool & Illuminated "SOLINA" Rim
  const bTopY = 2.9 + wingFloors * floorH;
  const bCrown = new THREE.Mesh(
    track(new THREE.BoxGeometry(10.6, 2.3, 4.6)),
    darkCrownMat
  );
  bCrown.position.set(0.6, bTopY + 1.15, 1.3);
  bCrown.userData.tower = 'B';
  bWingGroup.add(bCrown);
  towerMeshes.push(bCrown);

  const bSkyPool = new THREE.Mesh(
    track(new THREE.BoxGeometry(7.8, 0.25, 2.4)),
    poolWaterMat
  );
  bSkyPool.position.set(-0.6, bTopY + 0.18, -2.1);
  bWingGroup.add(bSkyPool);

  const bCrownLed = new THREE.Mesh(
    track(new THREE.BoxGeometry(10.9, 0.22, 4.8)),
    warmLedRimMat
  );
  bCrownLed.position.set(0.6, bTopY + 2.2, 1.3);
  bWingGroup.add(bCrownLed);

  // Illuminated "SOLINA SIGNATURE — WYNDHAM" rooftop signage
  const bSignGeo = track(new THREE.PlaneGeometry(8.2, 1.55));
  const bSignFront = new THREE.Mesh(bSignGeo, crownSignMatB);
  bSignFront.position.set(0.6, bTopY + 1.15, -1.02);
  bSignFront.rotation.y = Math.PI;

  const bSignBack = new THREE.Mesh(bSignGeo, crownSignMatB);
  bSignBack.position.set(0.6, bTopY + 1.15, 3.62);
  bWingGroup.add(bSignFront, bSignBack);

  towerBGroup.add(bWingGroup);
  root.add(towerBGroup);

  // --- 6. TOWER A (21 Floors, SE / Right when facing inland from beach) ---
  const towerAGroup = new THREE.Group();
  towerAGroup.position.set(-14.8, 0, -4.2);
  towerAGroup.rotation.y = -Math.PI * 0.28;

  const aFloors = 21;
  const aH = aFloors * floorH;

  // 2-story bronze podium
  const podiumAGeo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(11.6, 14.8, 3.0), {
      depth: 2.9,
      bevelEnabled: false,
      curveSegments: 18,
    })
  );
  podiumAGeo.rotateX(-Math.PI / 2);
  const podiumA = new THREE.Mesh(podiumAGeo, bronzeMat);
  podiumA.castShadow = !isSoftwareGl;
  podiumA.receiveShadow = true;
  podiumA.userData.tower = 'A';
  towerAGroup.add(podiumA);
  towerMeshes.push(podiumA);

  const lobbyA = new THREE.Mesh(
    track(new THREE.BoxGeometry(9.2, 2.3, 12.2)),
    lobbyGlowMat
  );
  lobbyA.position.y = 1.25;
  towerAGroup.add(lobbyA);

  // Smoked glass core
  const coreAGeo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(9.8, 12.8, 2.6), {
      depth: aH,
      bevelEnabled: false,
      curveSegments: 18,
    })
  );
  coreAGeo.rotateX(-Math.PI / 2);
  const coreA = new THREE.Mesh(coreAGeo, towerGlassMat);
  coreA.position.y = 2.9;
  coreA.castShadow = !isSoftwareGl;
  coreA.receiveShadow = true;
  coreA.userData.tower = 'A';
  towerAGroup.add(coreA);
  towerMeshes.push(coreA);

  // 21 Instanced curved white balcony slabs for Tower A
  const aSlabGeo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(10.8, 13.8, 2.9), {
      depth: 0.22,
      bevelEnabled: false,
      curveSegments: 18,
    })
  );
  aSlabGeo.rotateX(-Math.PI / 2);
  const aSlabInst = new THREE.InstancedMesh(aSlabGeo, whiteSlabMat, aFloors + 1);
  for (let f = 0; f <= aFloors; f++) {
    dummy.position.set(0, 2.9 + f * floorH, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    aSlabInst.setMatrixAt(f, dummy.matrix);
  }
  aSlabInst.instanceMatrix.needsUpdate = true;
  aSlabInst.computeBoundingSphere();
  aSlabInst.castShadow = !isSoftwareGl;
  aSlabInst.receiveShadow = true;
  towerAGroup.add(aSlabInst);

  // Tower A Curved Glass Balustrades, Metallic Handrails & Underside LED Ribbons
  const aRailingShape = makeRoundedRectShape(10.8, 13.8, 2.9);
  aRailingShape.holes.push(makeRoundedRectShape(10.64, 13.64, 2.82));

  const aRailingGeo = track(
    new THREE.ExtrudeGeometry(aRailingShape, {
      depth: 0.36,
      bevelEnabled: false,
      curveSegments: 18,
    })
  );
  aRailingGeo.rotateX(-Math.PI / 2);

  const aHandrailGeo = track(
    new THREE.ExtrudeGeometry(aRailingShape, {
      depth: 0.035,
      bevelEnabled: false,
      curveSegments: 18,
    })
  );
  aHandrailGeo.rotateX(-Math.PI / 2);

  const aLedGeo = track(
    new THREE.ExtrudeGeometry(aRailingShape, {
      depth: 0.045,
      bevelEnabled: false,
      curveSegments: 18,
    })
  );
  aLedGeo.rotateX(-Math.PI / 2);

  const aRailings = new THREE.InstancedMesh(aRailingGeo, balconyGlassMat, aFloors);
  const aHandrails = new THREE.InstancedMesh(aHandrailGeo, handrailMat, aFloors);
  const aLeds = new THREE.InstancedMesh(aLedGeo, balconyLedMat, aFloors);

  for (let f = 1; f <= aFloors; f++) {
    dummy.position.set(0, 2.9 + f * floorH + 0.22, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    aRailings.setMatrixAt(f - 1, dummy.matrix);

    dummy.position.set(0, 2.9 + f * floorH + 0.22 + 0.36, 0);
    dummy.updateMatrix();
    aHandrails.setMatrixAt(f - 1, dummy.matrix);

    dummy.position.set(0, 2.9 + f * floorH + 0.17, 0);
    dummy.updateMatrix();
    aLeds.setMatrixAt(f - 1, dummy.matrix);
  }
  aRailings.instanceMatrix.needsUpdate = true;
  aRailings.computeBoundingSphere();
  aHandrails.instanceMatrix.needsUpdate = true;
  aHandrails.computeBoundingSphere();
  aLeds.instanceMatrix.needsUpdate = true;
  aLeds.computeBoundingSphere();
  towerAGroup.add(aRailings, aHandrails, aLeds);

  // Vertical bronze architectural fins around Tower A
  const aFinGeo = track(new THREE.BoxGeometry(0.22, aH + 1.2, 0.42));
  const aFinInst = new THREE.InstancedMesh(aFinGeo, towerFinMat, 8);
  const aFinCoords: [number, number][] = [
    [-5.2, -3.5],
    [-5.2, 3.5],
    [5.2, -3.5],
    [5.2, 3.5],
    [-2.5, -6.7],
    [2.5, -6.7],
    [-2.5, 6.7],
    [2.5, 6.7],
  ];
  aFinCoords.forEach(([fx, fz], i) => {
    dummy.position.set(fx, 2.9 + aH / 2, fz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    aFinInst.setMatrixAt(i, dummy.matrix);
  });
  aFinInst.instanceMatrix.needsUpdate = true;
  aFinInst.computeBoundingSphere();
  towerAGroup.add(aFinInst);

  // Slanted Dark Rooftop Crown + Warm LED Perimeter Rim
  const aTopY = 2.9 + aH;
  const aCrown = new THREE.Mesh(
    track(new THREE.BoxGeometry(9.2, 2.4, 11.4)),
    darkCrownMat
  );
  aCrown.position.set(0, aTopY + 1.2, 0.4);
  aCrown.rotation.x = -0.08;
  aCrown.userData.tower = 'A';
  towerAGroup.add(aCrown);
  towerMeshes.push(aCrown);

  const aCrownLedGeo = track(
    new THREE.ExtrudeGeometry(makeRoundedRectShape(10.6, 13.6, 2.8), {
      depth: 0.22,
      bevelEnabled: false,
      curveSegments: 16,
    })
  );
  aCrownLedGeo.rotateX(-Math.PI / 2);
  const aCrownLed = new THREE.Mesh(aCrownLedGeo, warmLedRimMat);
  aCrownLed.position.y = aTopY + 0.15;
  towerAGroup.add(aCrownLed);

  // Illuminated "SOLINA SIGNATURE — TOWER A" rooftop signage
  const aSignGeo = track(new THREE.PlaneGeometry(7.2, 1.55));
  const aSignSide1 = new THREE.Mesh(aSignGeo, crownSignMatA);
  aSignSide1.position.set(-4.62, aTopY + 1.2, 0.4);
  aSignSide1.rotation.y = -Math.PI / 2;

  const aSignSide2 = new THREE.Mesh(aSignGeo, crownSignMatA);
  aSignSide2.position.set(4.62, aTopY + 1.2, 0.4);
  aSignSide2.rotation.y = Math.PI / 2;
  towerAGroup.add(aSignSide1, aSignSide2);

  root.add(towerAGroup);

  // --- 7. Instanced Coastal Coconut Palms & Boulevard Street Trees ---
  const parcelPalmPositions: [number, number, number][] = [];
  const outerPalmPositions: [number, number, number][] = [];
  // Coastal promenade palms (split parcel vs outer corridor)
  for (let px = -78; px <= 78; px += 7.2) {
    const entry: [number, number, number] = [
      px,
      -19.2,
      0.95 + ((Math.abs(px) * 13) % 4) * 0.08,
    ];
    if (Math.abs(px) <= 36) parcelPalmPositions.push(entry);
    else outerPalmPositions.push(entry);
  }
  // Courtyard & beach edge palms inside the Solina parcel
  const gardenPalms: [number, number, number][] = [
    [24, -17, 1.05], [19, -16, 0.95], [12, -16.5, 1.1], [8, -14.5, 0.92],
    [-8.5, -14, 1.05], [-13.5, -16, 1.12], [-20, -15, 0.98], [-26, -12, 1.04],
    [7.5, -6, 0.95], [-6.5, -5.5, 0.92], [25, 2, 1.05], [-32, 6, 1.0],
    [-18, 12, 0.9], [-25.5, 13.5, 1.1], [-24.2, 14.5, 0.95], [-26.8, 12.6, 0.9],
  ];
  gardenPalms.forEach((p) => parcelPalmPositions.push(p));
  // Dense outer tropical grove (only shown in stylized 3D terrain mode)
  for (let i = 0; i < 64; i++) {
    const side = i < 32 ? -1 : 1;
    const gx = side * (38 + ((i * 19) % 34));
    const gz = -15 + (((i * 23) % 32));
    outerPalmPositions.push([gx, gz, 0.85 + (i % 5) * 0.1]);
  }

  const trunkGeo = track(new THREE.CylinderGeometry(0.11, 0.22, 4.4, 7));
  const frondGeo = track(new THREE.ConeGeometry(1.75, 0.9, 7));

  const buildPalmInst = (list: [number, number, number][]) => {
    const trunks = new THREE.InstancedMesh(trunkGeo, palmTrunkMat, list.length);
    const crowns = new THREE.InstancedMesh(frondGeo, palmLeafMat, list.length);
    list.forEach(([px, pz, sc], idx) => {
      dummy.position.set(px, 2.2 * sc, pz);
      dummy.rotation.set(0, idx * 0.9, ((idx % 3) - 1) * 0.05);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(px, 4.4 * sc, pz);
      dummy.rotation.set(0, idx * 1.1, 0);
      dummy.scale.set(sc * 1.1, sc, sc * 1.1);
      dummy.updateMatrix();
      crowns.setMatrixAt(idx, dummy.matrix);
    });
    trunks.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    crowns.instanceMatrix.needsUpdate = true;
    crowns.computeBoundingSphere();
    crowns.castShadow = !isSoftwareGl;
    const g = new THREE.Group();
    g.add(trunks, crowns);
    return g;
  };

  const parcelPalmsGroup = buildPalmInst(parcelPalmPositions);
  const outerPalmsGroup = buildPalmInst(outerPalmPositions);
  root.add(parcelPalmsGroup, outerPalmsGroup);

  // --- 8. Instanced Two-Story White Coastal Villas (Landward Neighborhood) ---
  const villaCoords: [number, number][] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const vx = -36 + col * 10.5 + (row % 2) * 1.5;
      const vz = 27 + row * 9.5;
      if (Math.abs(vx + 26) < 6 && vz < 32) continue; // keep roundabout avenue intersection clear
      villaCoords.push([vx, vz]);
    }
  }
  const villaBodyGeo = track(new THREE.BoxGeometry(5.8, 4.2, 6.4));
  const villaRoofGeo = track(new THREE.BoxGeometry(6.3, 0.35, 6.9));
  const villaBodies = new THREE.InstancedMesh(
    villaBodyGeo,
    villaWhiteMat,
    villaCoords.length
  );
  const villaRoofs = new THREE.InstancedMesh(
    villaRoofGeo,
    darkCrownMat,
    villaCoords.length
  );
  villaCoords.forEach(([vx, vz], idx) => {
    dummy.position.set(vx, 2.1, vz);
    dummy.rotation.set(0, -0.22, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    villaBodies.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(vx, 4.35, vz);
    dummy.updateMatrix();
    villaRoofs.setMatrixAt(idx, dummy.matrix);
  });
  villaBodies.instanceMatrix.needsUpdate = true;
  villaBodies.computeBoundingSphere();
  villaBodies.castShadow = !isSoftwareGl;
  villaBodies.receiveShadow = true;
  villaRoofs.instanceMatrix.needsUpdate = true;
  villaRoofs.computeBoundingSphere();
  root.add(villaBodies, villaRoofs);

  // Warm Streetlamp Bulbs along the Solina coastal promenade & roundabout edge
  const lampOrbGeo = track(new THREE.SphereGeometry(0.32, 8, 8));
  const lampPoints: [number, number][] = [];
  for (let lx = -30; lx <= 30; lx += 12) {
    lampPoints.push([lx, -18.5]);
  }
  for (let lx = -30; lx <= 18; lx += 12) {
    lampPoints.push([lx, 14.5 + lx * -0.18]);
  }
  const lampInst = new THREE.InstancedMesh(lampOrbGeo, warmLedRimMat, lampPoints.length);
  lampPoints.forEach(([lx, lz], idx) => {
    dummy.position.set(lx, 2.8, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lampInst.setMatrixAt(idx, dummy.matrix);
  });
  lampInst.instanceMatrix.needsUpdate = true;
  lampInst.computeBoundingSphere();
  root.add(lampInst);

  // --- 9. Sky Dome, Horizon Sun & Masterplan Lighting Rig ---
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x285582) },
    uHorizonColor: { value: new THREE.Color(0xf2be85) },
    uBottomColor: { value: new THREE.Color(0x163d5c) },
  };
  const skyDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(3200, 32, 20)),
    track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: skyUniforms,
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 uTopColor;
          uniform vec3 uHorizonColor;
          uniform vec3 uBottomColor;
          varying vec3 vWorldPos;
          void main() {
            float h = normalize(vWorldPos).y;
            vec3 col = mix(uHorizonColor, uTopColor, smoothstep(0.0, 0.52, max(h, 0.0)));
            col = mix(col, uBottomColor, smoothstep(0.0, -0.22, min(h, 0.0)));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    )
  );
  root.add(skyDome);

  const sunDisc = new THREE.Mesh(
    track(new THREE.SphereGeometry(48, 24, 24)),
    track(new THREE.MeshBasicMaterial({ color: 0xffe4a6 }))
  );
  sunDisc.position.set(-320, 140, -1850);
  root.add(sunDisc);

  const hemiLight = new THREE.HemisphereLight(0x9bc7f0, 0x8f7a62, 0.55);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffd79e, 1.25);
  sunLight.position.set(-38, 42, -55);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 210;
  sunLight.shadow.camera.left = -75;
  sunLight.shadow.camera.right = 75;
  sunLight.shadow.camera.top = 75;
  sunLight.shadow.camera.bottom = -75;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.04;
  scene.add(sunLight);

  // Subtle courtyard fill bounce
  const courtyardBounce = new THREE.PointLight(0xffc978, 2.2, 26, 1.5);
  courtyardBounce.position.set(0, 4.5, -5.5);
  scene.add(courtyardBounce);

  scene.add(root);

  let activePreset: LightingPreset = 'sunrise';
  let isSatMode = false;

  const applyLighting = (preset: LightingPreset, targetScene: THREE.Scene) => {
    activePreset = preset;
    if (preset === 'sunrise') {
      // Sunset/Dusk golden hour matching renders #1 & #5
      targetScene.background = new THREE.Color(0x2a4566);
      targetScene.fog = new THREE.FogExp2(0x6b7f96, isSatMode ? 0.00022 : 0.0024);
      skyUniforms.uTopColor.value.setHex(0x23476e);
      skyUniforms.uHorizonColor.value.setHex(0xf2be85);
      skyUniforms.uBottomColor.value.setHex(0x163d5c);
      sunLight.color.setHex(0xffcb8c);
      sunLight.intensity = 1.12;
      sunLight.position.set(-42, 30, -65);
      hemiLight.color.setHex(0x88b4e6);
      hemiLight.groundColor.setHex(0x7c6852);
      hemiLight.intensity = 0.48;
      oceanMat.color.setHex(0x165578);
      oceanSunGlint.value = 1.0;
      satPlaneMat.color.setHex(0xebeff5);
      sunDisc.visible = true;
      towerGlassMat.emissiveIntensity = 0.68;
      lobbyGlowMat.emissiveIntensity = 1.55;
      warmLedRimMat.emissiveIntensity = 1.85;
      balconyLedMat.emissiveIntensity = 1.65;
      balconyLedMat.emissive.setHex(0xffaa50);
      crownSignMatB.emissiveIntensity = 1.25;
      crownSignMatA.emissiveIntensity = 1.25;
      pavGlowMat.emissiveIntensity = 1.65;
      pavLight.intensity = 5.5;
      courtyardBounce.intensity = 2.4;
    } else if (preset === 'daylight') {
      // Bright coastal daylight matching renders #2, #3 & #4
      targetScene.background = new THREE.Color(0x98cce8);
      targetScene.fog = new THREE.FogExp2(0xaed6ec, isSatMode ? 0.00018 : 0.0018);
      skyUniforms.uTopColor.value.setHex(0x2c78b8);
      skyUniforms.uHorizonColor.value.setHex(0xd8eefc);
      skyUniforms.uBottomColor.value.setHex(0x166d9e);
      sunLight.color.setHex(0xfff6e8);
      sunLight.intensity = 1.48;
      sunLight.position.set(42, 58, 35); // casts crisp dramatic tower shadow onto beach & sea!
      hemiLight.color.setHex(0xbde2ff);
      hemiLight.groundColor.setHex(0x9c8f78);
      hemiLight.intensity = 0.58;
      oceanMat.color.setHex(0x156e9c);
      oceanSunGlint.value = 0.14;
      satPlaneMat.color.setHex(0xffffff);
      sunDisc.visible = false;
      towerGlassMat.emissiveIntensity = 0.36;
      lobbyGlowMat.emissiveIntensity = 0.5;
      warmLedRimMat.emissiveIntensity = 0.45;
      balconyLedMat.emissiveIntensity = 0.38;
      balconyLedMat.emissive.setHex(0xffffff);
      crownSignMatB.emissiveIntensity = 0.45;
      crownSignMatA.emissiveIntensity = 0.45;
      pavGlowMat.emissiveIntensity = 0.4;
      pavLight.intensity = 1.2;
      courtyardBounce.intensity = 0.8;
    } else {
      // Coastal Night
      targetScene.background = new THREE.Color(0x0c1626);
      targetScene.fog = new THREE.FogExp2(0x0c1626, isSatMode ? 0.00035 : 0.0036);
      skyUniforms.uTopColor.value.setHex(0x070e1c);
      skyUniforms.uHorizonColor.value.setHex(0x1a2f4d);
      skyUniforms.uBottomColor.value.setHex(0x091f33);
      sunLight.color.setHex(0x7096cf);
      sunLight.intensity = 0.36;
      sunLight.position.set(-28, 45, -35);
      hemiLight.color.setHex(0x2c4870);
      hemiLight.groundColor.setHex(0x2b231b);
      hemiLight.intensity = 0.32;
      oceanMat.color.setHex(0x0c2b42);
      oceanSunGlint.value = 0.0;
      satPlaneMat.color.setHex(0x758cad);
      sunDisc.visible = false;
      towerGlassMat.emissiveIntensity = 0.88;
      lobbyGlowMat.emissiveIntensity = 1.85;
      warmLedRimMat.emissiveIntensity = 2.1;
      balconyLedMat.emissiveIntensity = 2.35;
      balconyLedMat.emissive.setHex(0xffc570);
      crownSignMatB.emissiveIntensity = 1.85;
      crownSignMatA.emissiveIntensity = 1.85;
      pavGlowMat.emissiveIntensity = 2.0;
      pavLight.intensity = 7.0;
      courtyardBounce.intensity = 3.2;
    }
  };

  // --- 10. Animated Resort Pedestrians (Promenade, Beach, Poolside & Roundabout) ---
  interface AnimatedPedestrian {
    group: THREE.Group;
    bodyGroup: THREE.Group;
    leftArm: THREE.Object3D;
    rightArm: THREE.Object3D;
    leftLeg: THREE.Object3D;
    rightLeg: THREE.Object3D;
    waypoints: [number, number][];
    segLens: number[];
    totalLen: number;
    speed: number;
    phase: number;
    baseY: number;
  }

  const skinMat = track(
    new THREE.MeshStandardMaterial({ color: 0xdfb18b, roughness: 0.72 })
  );
  const pantsMat = track(
    new THREE.MeshStandardMaterial({ color: 0x2b3648, roughness: 0.78 })
  );
  const hairMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.85 })
  );
  const shirtMats = [
    0xf4efe6, // Linen white
    0xe07a5f, // Coral resort
    0x3d5a80, // Coastal navy
    0xd4a373, // Warm sand
    0x588157, // Tropical sage
    0xe9c46a, // Sunburst ochre
  ].map((hex) =>
    track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75 }))
  );

  const headGeo = track(new THREE.SphereGeometry(0.115, 8, 8));
  const hairGeo = track(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55));
  const torsoGeo = track(new THREE.BoxGeometry(0.28, 0.44, 0.17));
  const armGeo = track(new THREE.BoxGeometry(0.085, 0.38, 0.095));
  armGeo.translate(0, -0.17, 0);
  const legGeo = track(new THREE.BoxGeometry(0.105, 0.52, 0.115));
  legGeo.translate(0, -0.26, 0);

  const pedestrianSpecs: Array<{
    waypoints: [number, number][];
    speed: number;
    phase: number;
    scale: number;
    baseY?: number;
  }> = [
    // Coastal promenade walkers (East <-> West along oceanfront walkway)
    { waypoints: [[-36, -19.5], [36, -19.5]], speed: 1.45, phase: 0.05, scale: 1.0 },
    { waypoints: [[-35, -20.1], [37, -20.1]], speed: 1.45, phase: 0.06, scale: 0.95 }, // couple strolling
    { waypoints: [[38, -20.8], [-38, -20.8]], speed: 1.35, phase: 0.22, scale: 1.02 },
    { waypoints: [[-28, -19.0], [28, -19.0]], speed: 1.55, phase: 0.48, scale: 0.97 },
    { waypoints: [[32, -21.2], [-32, -21.2]], speed: 1.28, phase: 0.68, scale: 0.94 },
    { waypoints: [[-44, -19.7], [-6, -19.7]], speed: 1.38, phase: 0.35, scale: 1.0 },
    { waypoints: [[6, -20.4], [44, -20.4]], speed: 1.42, phase: 0.81, scale: 0.98 },
    // Sandy beach shoreline walkers
    { waypoints: [[-26, -28.6], [26, -28.6]], speed: 1.25, phase: 0.14, scale: 0.98, baseY: -0.05 },
    { waypoints: [[24, -29.8], [-22, -29.8]], speed: 1.18, phase: 0.57, scale: 0.94, baseY: -0.06 },
    { waypoints: [[-10, -27.2], [18, -27.2]], speed: 1.32, phase: 0.83, scale: 1.0, baseY: -0.04 },
    // Lagoon pool & courtyard loop walkers (skirting outside the pool basin between Towers A & B)
    {
      waypoints: [[-7.2, -14.8], [7.2, -14.8], [7.6, -4.5], [5.8, 2.5], [-6.8, -1.5], [-7.2, -14.8]],
      speed: 1.3,
      phase: 0.12,
      scale: 0.98,
    },
    {
      waypoints: [[7.2, -14.5], [-7.0, -14.5], [-6.6, -1.8], [5.5, 2.2], [7.5, -4.8], [7.2, -14.5]],
      speed: 1.22,
      phase: 0.61,
      scale: 0.95,
    },
    // Tower A lobby <-> Promenade
    { waypoints: [[-8.2, -2.0], [-8.2, -15.5], [-16.5, -17.5], [-8.2, -2.0]], speed: 1.28, phase: 0.33, scale: 1.0 },
    { waypoints: [[-17.2, -16.8], [-8.8, -14.2], [-8.8, -2.5]], speed: 1.36, phase: 0.74, scale: 0.96 },
    // Tower B lobby <-> Pickleball & Poolside
    { waypoints: [[8.8, -4.5], [12.5, -15.2], [22.5, -15.2], [8.8, -4.5]], speed: 1.34, phase: 0.27, scale: 1.01 },
    { waypoints: [[22.0, -14.6], [23.2, -4.2], [12.2, -15.5]], speed: 1.26, phase: 0.88, scale: 0.95 },
    // SE Drop-off Roundabout & Boulevard sidewalk
    { waypoints: [[-33, 14.5], [-19.5, 11.2], [-15.5, 6.8]], speed: 1.32, phase: 0.42, scale: 0.99 },
    { waypoints: [[-16.2, 7.5], [-20.2, 12.2], [-34.5, 16.0]], speed: 1.25, phase: 0.91, scale: 0.96 },
  ];

  const pedestriansGroup = new THREE.Group();
  const pedestrians: AnimatedPedestrian[] = [];

  pedestrianSpecs.forEach((spec, idx) => {
    const group = new THREE.Group();
    const bodyGroup = new THREE.Group();

    const shirtMat = shirtMats[idx % shirtMats.length];
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 0.76;
    torso.castShadow = !isSoftwareGl;
    bodyGroup.add(torso);

    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.09;
    head.castShadow = !isSoftwareGl;
    bodyGroup.add(head);

    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.105;
    bodyGroup.add(hair);

    const leftArm = new THREE.Object3D();
    leftArm.position.set(-0.19, 0.95, 0);
    leftArm.add(new THREE.Mesh(armGeo, shirtMat));
    bodyGroup.add(leftArm);

    const rightArm = new THREE.Object3D();
    rightArm.position.set(0.19, 0.95, 0);
    rightArm.add(new THREE.Mesh(armGeo, shirtMat));
    bodyGroup.add(rightArm);

    const leftLeg = new THREE.Object3D();
    leftLeg.position.set(-0.08, 0.54, 0);
    const lLegMesh = new THREE.Mesh(legGeo, pantsMat);
    lLegMesh.castShadow = !isSoftwareGl;
    leftLeg.add(lLegMesh);
    bodyGroup.add(leftLeg);

    const rightLeg = new THREE.Object3D();
    rightLeg.position.set(0.08, 0.54, 0);
    const rLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rLegMesh.castShadow = !isSoftwareGl;
    rightLeg.add(rLegMesh);
    bodyGroup.add(rightLeg);

    group.add(bodyGroup);
    group.scale.setScalar(spec.scale * 1.28); // human ~1.65m height in masterplan world
    pedestriansGroup.add(group);

    // Precompute waypoint segment lengths for zero-GC path evaluation
    const segLens: number[] = [];
    let totalLen = 0;
    for (let i = 0; i < spec.waypoints.length - 1; i++) {
      const len = Math.hypot(
        spec.waypoints[i + 1][0] - spec.waypoints[i][0],
        spec.waypoints[i + 1][1] - spec.waypoints[i][1]
      );
      segLens.push(len);
      totalLen += len;
    }

    const baseY = spec.baseY ?? 0.08;
    group.position.set(spec.waypoints[0][0], baseY, spec.waypoints[0][1]);

    pedestrians.push({
      group,
      bodyGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      waypoints: spec.waypoints,
      segLens,
      totalLen: Math.max(0.01, totalLen),
      speed: spec.speed,
      phase: spec.phase,
      baseY,
    });
  });
  root.add(pedestriansGroup);

  const updateAnimations = (
    elapsed: number,
    animateMotion: boolean,
    cameraPos?: THREE.Vector3
  ) => {
    oceanUniforms.uTime.value = animateMotion ? elapsed : 0;
    vungTauSurroundings.updateHighlights(elapsed, animateMotion, cameraPos);
    if (!animateMotion) return;

    // Gentle coastal drift & roll on sailboats
    for (let i = 0; i < sailboatGroup.children.length; i++) {
      const boat = sailboatGroup.children[i];
      const { baseX, baseZ, phase } = boat.userData as {
        baseX: number;
        baseZ: number;
        phase: number;
      };
      boat.position.x = baseX + Math.sin(elapsed * 0.14 + phase) * 2.8;
      boat.position.z = baseZ + Math.cos(elapsed * 0.11 + phase) * 0.9;
      boat.rotation.z = Math.sin(elapsed * 1.1 + phase) * 0.035;
    }

    // Articulated walking loop along waypoints (ping-pong for open paths, continuous for closed loops)
    for (let i = 0; i < pedestrians.length; i++) {
      const p = pedestrians[i];
      const wps = p.waypoints;
      const first = wps[0];
      const last = wps[wps.length - 1];
      const isClosedLoop =
        Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.2;

      let dist = (elapsed * p.speed + p.phase * p.totalLen) % (isClosedLoop ? p.totalLen : p.totalLen * 2);
      let reverse = false;
      if (!isClosedLoop && dist > p.totalLen) {
        dist = p.totalLen * 2 - dist;
        reverse = true;
      }

      // Locate current segment
      let acc = 0;
      let segIdx = 0;
      while (segIdx < p.segLens.length - 1 && acc + p.segLens[segIdx] < dist) {
        acc += p.segLens[segIdx];
        segIdx++;
      }
      const segLen = Math.max(0.001, p.segLens[segIdx]);
      const t = (dist - acc) / segLen;
      const a = wps[segIdx];
      const b = wps[segIdx + 1];
      const px = a[0] + (b[0] - a[0]) * t;
      const pz = a[1] + (b[1] - a[1]) * t;
      const dirX = reverse ? a[0] - b[0] : b[0] - a[0];
      const dirZ = reverse ? a[1] - b[1] : b[1] - a[1];

      p.group.position.set(px, p.baseY, pz);
      p.group.rotation.y = Math.atan2(dirX, dirZ);

      const stride = elapsed * p.speed * 4.8 + p.phase * 10.0;
      const legSwing = Math.sin(stride) * 0.52;
      const armSwing = Math.sin(stride) * 0.42;
      p.leftLeg.rotation.x = legSwing;
      p.rightLeg.rotation.x = -legSwing;
      p.leftArm.rotation.x = -armSwing;
      p.rightArm.rotation.x = armSwing;
      p.bodyGroup.position.y = Math.abs(Math.sin(stride)) * 0.032;
    }
  };

  // Position pedestrians cleanly at t=0 on initial load
  updateAnimations(0.01, true);

  applyLighting('sunrise', scene);

  const setSatelliteOverlay = (enabled: boolean) => {
    isSatMode = enabled;
    satelliteMapGroup.visible = enabled;
    parcelPad.visible = enabled;
    parcelPromenade.visible = enabled;
    vungTauSurroundings.group.visible = true;

    siteGround.visible = !enabled;
    resortLawn.visible = !enabled;
    beach.visible = !enabled;
    promenade.visible = !enabled;
    ocean.visible = !enabled;
    avenue.visible = !enabled;
    sideRoad.visible = !enabled;
    villaBodies.visible = !enabled;
    villaRoofs.visible = !enabled;
    outerPalmsGroup.visible = !enabled;
    applyLighting(activePreset, scene);
  };

  const setHighlightsVisible = (enabled: boolean) => {
    vungTauSurroundings.setHighlightsVisible(enabled);
  };

  return {
    root,
    oceanUniforms,
    sailboatGroup,
    towerMeshes,
    applyLighting,
    setSatelliteOverlay,
    setHighlightsVisible,
    updateAnimations,
    dispose: () => {
      scene.remove(hemiLight);
      scene.remove(sunLight);
      scene.remove(courtyardBounce);
      scene.remove(root);
      disposables.forEach((d) => d.dispose());
    },
  };
}
