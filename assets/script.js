const container = document.getElementById("webgl-container");

// AUDIO (đặt ở đầu file: đăng ký sẵn trước khi dựng cảnh 3D nặng, để lượt chạm sớm vẫn bật được nhạc)
const bgm = document.getElementById("bgm");
const audioBtn = document.getElementById("audio-btn");
let isPlaying = false;

function playMusic() {
  return bgm.play().then(() => {
    isPlaying = true;
    audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  });
}

function pauseMusic() {
  bgm.pause();
  isPlaying = false;
  audioBtn.innerHTML = '<i class="fas fa-music" style="opacity:0.5;"></i>';
}

audioBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  removeUnlockListeners();
  if (isPlaying) pauseMusic();
  else playMusic().catch(() => {});
});

// Tự động phát nhạc khi mở trang. Trình duyệt thường chặn tự phát có tiếng cho tới khi người xem
// tương tác, nên thử lại ở mọi lần chạm/click/bấm phím cho tới khi phát được.
// (Trên điện thoại chỉ "nhấc tay" (touchend/click) mới được tính là cho phép phát nhạc.)
const unlockEvents = ["pointerup", "touchend", "click", "keydown"];
function unlockAudio(e) {
  if (audioBtn.contains(e.target)) return; // để nút nhạc tự xử lý
  if (isPlaying) return removeUnlockListeners();
  playMusic()
    .then(removeUnlockListeners) // chỉ gỡ khi đã phát được; bị chặn thì lần chạm sau thử lại
    .catch(() => {});
}
function removeUnlockListeners() {
  unlockEvents.forEach((ev) => document.removeEventListener(ev, unlockAudio, true));
}
// capture = true: vẫn nhận được cả khi phần tử khác chặn sự kiện (stopPropagation)
unlockEvents.forEach((ev) => document.addEventListener(ev, unlockAudio, true));
playMusic()
  .then(removeUnlockListeners)
  .catch(() => {});
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) || window.innerWidth < 768;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060312, 0.0055); // mỏng hơn để thấy làng, sông, núi phía dưới

// Màn ngang (máy tính, điện thoại xoay ngang) và màn dọc dùng góc nhìn khác nhau
const isPortrait = () => window.innerHeight > window.innerWidth;

const camera = new THREE.PerspectiveCamera(
  isPortrait() ? 60 : 45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

// Góc nhìn khi mở trang: cả cây + đảo vừa khung, cặp đôi ở giữa phía dưới, trăng góc trên trái.
// (Màn dọc hẹp nên lùi xa hơn để cây không bị cắt hai bên.)
const DEFAULT_CAM_POS = new THREE.Vector3();
const DEFAULT_CAM_TARGET = new THREE.Vector3();
function updateDefaultView() {
  if (isPortrait()) {
    DEFAULT_CAM_POS.set(0, 14, 54);
    DEFAULT_CAM_TARGET.set(0, 8.0, 0);
  } else {
    // camera thấp gần ngang mặt đảo, hơi ngước lên: thấy trọn tán cây, trăng, núi phía sau
    DEFAULT_CAM_POS.set(0, 7.8, 37);
    DEFAULT_CAM_TARGET.set(0, 9.2, 0);
  }
}
updateDefaultView();

camera.position.copy(DEFAULT_CAM_POS);

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 + 0.05;
controls.minDistance = 8;
controls.maxDistance = 85;
controls.target.copy(DEFAULT_CAM_TARGET);
// người xem đã tự xoay/zoom thì khi xoay máy không tự đặt lại góc nhìn nữa
let userMovedCamera = false;
controls.addEventListener("start", () => {
  userMovedCamera = true;
});

// LIGHTS
const ambientLight = new THREE.AmbientLight(0x2a103d, 1.4);
scene.add(ambientLight);

const treeLight = new THREE.PointLight(0xffb6c1, 2.5, 45);
treeLight.position.set(0, 12, 0); // giữa tán cây (cây cao gấp 1.5)
scene.add(treeLight);

const warmLight = new THREE.PointLight(0xffaa33, 2.0, 30);
warmLight.position.set(0, -2, 0);
scene.add(warmLight);

// ISLAND
const islandGroup = new THREE.Group();
scene.add(islandGroup);

const islandGeo = new THREE.CylinderGeometry(
  8.5,
  2.2,
  7.5,
  isMobile ? 32 : 48,
  12,
);
const posAttr = islandGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
  const vx = posAttr.getX(i);
  const vy = posAttr.getY(i);
  const vz = posAttr.getZ(i);

  const distFromCenter = Math.sqrt(vx * vx + vz * vz);
  const noise =
    Math.sin(vx * 0.8) * Math.cos(vz * 0.8) * 0.6 +
    Math.sin(vx * 1.8 + vz * 1.5) * 0.3;

  if (vy > 0) {
    posAttr.setY(i, vy + noise * (1.0 - distFromCenter / 12));
  } else {
    posAttr.setX(i, vx + (Math.random() - 0.5) * 1.4);
    posAttr.setZ(i, vz + (Math.random() - 0.5) * 1.4);
  }
}
islandGeo.computeVertexNormals();

const islandMat = new THREE.MeshStandardMaterial({
  color: 0x3d231b,
  roughness: 0.85,
  flatShading: true,
});
const islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandGroup.add(islandMesh);

const topGeo = new THREE.CylinderGeometry(8.6, 7.8, 0.8, isMobile ? 32 : 48, 4);
const topPos = topGeo.attributes.position;
for (let i = 0; i < topPos.count; i++) {
  const vx = topPos.getX(i);
  const vy = topPos.getY(i);
  const vz = topPos.getZ(i);
  const noise = Math.sin(vx * 0.9) * Math.cos(vz * 0.9) * 0.5;
  topPos.setY(i, vy + noise * 0.4);
}
topGeo.computeVertexNormals();
const topMat = new THREE.MeshStandardMaterial({
  color: 0x22130e,
  roughness: 0.9,
  flatShading: true,
});
const topMesh = new THREE.Mesh(topGeo, topMat);
topMesh.position.y = 3.6;
islandGroup.add(topMesh);

// BỆ MẶT ĐÁ NHỎ & ĐÁ TẢNG RẢI RÁC ÍT HƠN
const stoneMat = new THREE.MeshStandardMaterial({
  color: 0x4a4d52,
  roughness: 0.85,
  metalness: 0.1,
  flatShading: true,
});

// 1. Bệ đá nhỏ dẹt ẩn nhẹ dưới gốc cây
const mainStonePlatformGeo = new THREE.CylinderGeometry(2.5, 3.0, 0.15, 6);
const mainStonePlatform = new THREE.Mesh(mainStonePlatformGeo, stoneMat);
mainStonePlatform.position.set(0, 3.9, 0);
islandGroup.add(mainStonePlatform);

// 2. Chỉ 3 viên đá nhỏ điểm xuyết trên mặt đất
const rockCount = 3;
for (let i = 0; i < rockCount; i++) {
  const rockGeo = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.25, 0);
  const rockMesh = new THREE.Mesh(rockGeo, stoneMat);

  const angle = (i / rockCount) * Math.PI * 2 + 0.5;
  const dist = 3.8 + Math.random() * 2.0;

  rockMesh.position.set(Math.cos(angle) * dist, 3.9, Math.sin(angle) * dist);
  rockMesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );
  islandGroup.add(rockMesh);
}

// TREE TRUNK & BRANCHES
const treeGroup = new THREE.Group();
treeGroup.position.set(0, 4.0, 0);
islandGroup.add(treeGroup);

const trunkMat = new THREE.MeshStandardMaterial({
  color: 0x2b140e,
  roughness: 0.85,
});

// Cây to và cao gấp 1.5 lần (thân, cành, tán)
const TREE_K = 1.5;
const trunkCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.15 * TREE_K, 2.5 * TREE_K, -0.1 * TREE_K),
  new THREE.Vector3(-0.1 * TREE_K, 5.0 * TREE_K, 0.1 * TREE_K),
  new THREE.Vector3(0.0, 7.5 * TREE_K, 0.0),
]);

// Ống thon dần: bán kính r0 ở gốc giảm dần tới r1 ở ngọn (thân và cành nhọn dần phần ngọn)
function taperedTube(curve, segs, r0, r1, radial) {
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position;
  const P = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const r = r0 + (r1 - r0) * Math.pow(t, 0.8);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(P).multiplyScalar(r).add(P);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  return geo;
}

const TRUNK_R0 = 0.34 * TREE_K; // gốc
const TRUNK_R1 = 0.05 * TREE_K; // ngọn
const trunkRadiusAt = (t) => TRUNK_R0 + (TRUNK_R1 - TRUNK_R0) * Math.pow(t, 0.8);
const trunkGeo = taperedTube(trunkCurve, 32, TRUNK_R0, TRUNK_R1, 10);
const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
treeGroup.add(trunkMesh);

const branchClusters = [];
const mainBranchCount = 12;
for (let i = 0; i < mainBranchCount; i++) {
  const angle = (i / mainBranchCount) * Math.PI * 2 + Math.random() * 0.3;
  const h = 3.0 + Math.random() * 4.0;
  const startP = trunkCurve.getPointAt(h / 7.5);
  const len = (3.0 + Math.random() * 2.2) * TREE_K;

  const endP = new THREE.Vector3(
    startP.x + Math.cos(angle) * len,
    startP.y + (0.8 + Math.random() * 1.0) * TREE_K,
    startP.z + Math.sin(angle) * len,
  );

  const midP = new THREE.Vector3().addVectors(startP, endP).multiplyScalar(0.5);
  midP.y += 0.4 * TREE_K;

  const bCurve = new THREE.CatmullRomCurve3([startP, midP, endP]);
  // cành to ở chỗ mọc ra từ thân (không to hơn thân ở đó), thon nhọn dần tới đầu cành
  const bR0 = Math.min(0.11 * TREE_K, trunkRadiusAt(h / 7.5) * 0.6);
  const bGeo = taperedTube(bCurve, 14, bR0, 0.012 * TREE_K, 7);
  const bMesh = new THREE.Mesh(bGeo, trunkMat);
  treeGroup.add(bMesh);

  branchClusters.push({ center: endP, radius: (3.2 + Math.random() * 1.0) * 1.25 });
}

// HỆ THỐNG TÁN LÁ
const particleCount = isMobile ? 30000 : 54000; // tán to hơn nên nhiều hoa hơn để vẫn dày
const blossomGeo = new THREE.BufferGeometry();
const blossomPos = new Float32Array(particleCount * 3);
const blossomColors = new Float32Array(particleCount * 3);

const colorDustyPink = new THREE.Color(0xe8a2a8);
const colorSoftPink = new THREE.Color(0xf0b6bc);
const colorPaleRose = new THREE.Color(0xf7d1d5);
const colorSoftWhite = new THREE.Color(0xfdf0f2);

const clusters = [
  { center: new THREE.Vector3(0, 9.5 * TREE_K, 0), radius: 6.2 * 1.25 },
  { center: new THREE.Vector3(0, 7.5 * TREE_K, 0), radius: 7.0 * 1.25 },
  { center: new THREE.Vector3(0, 5.5 * TREE_K, 0), radius: 6.0 * 1.25 },
  ...branchClusters,
];

for (let i = 0; i < particleCount; i++) {
  const c = clusters[Math.floor(Math.random() * clusters.length)];

  const u = Math.random();
  const r = Math.pow(u, 0.65) * c.radius;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  const x = c.center.x + r * Math.sin(phi) * Math.cos(theta);
  const y = c.center.y + r * Math.sin(phi) * Math.sin(theta) * 0.8;
  const z = c.center.z + r * Math.cos(phi);

  blossomPos[i * 3] = x;
  blossomPos[i * 3 + 1] = y;
  blossomPos[i * 3 + 2] = z;

  const heightFactor = THREE.MathUtils.clamp((y - 3 * TREE_K) / (7 * TREE_K), 0, 1);
  const randC = Math.random();
  let col;

  if (heightFactor < 0.3) {
    col = randC < 0.6 ? colorDustyPink : colorSoftPink;
  } else if (heightFactor < 0.7) {
    col =
      randC < 0.4
        ? colorSoftPink
        : randC < 0.8
          ? colorPaleRose
          : colorDustyPink;
  } else {
    col = randC < 0.5 ? colorSoftWhite : colorPaleRose;
  }

  blossomColors[i * 3] = col.r;
  blossomColors[i * 3 + 1] = col.g;
  blossomColors[i * 3 + 2] = col.b;
}

blossomGeo.setAttribute("position", new THREE.BufferAttribute(blossomPos, 3));
blossomGeo.setAttribute("color", new THREE.BufferAttribute(blossomColors, 3));

function createParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.4, "rgba(240,182,188,0.6)");
  grad.addColorStop(1, "rgba(240,182,188,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

const blossomMat = new THREE.PointsMaterial({
  size: isMobile ? 0.5 : 0.42,
  vertexColors: true,
  map: createParticleTexture(),
  transparent: true,
  opacity: 0.75,
  blending: THREE.NormalBlending,
  depthWrite: false,
});

const blossomParticles = new THREE.Points(blossomGeo, blossomMat);
treeGroup.add(blossomParticles);

// RABBITS
function createRabbit() {
  const group = new THREE.Group();
  const rabbitMat = new THREE.MeshStandardMaterial({
    color: 0xf8f8ff,
    roughness: 0.5,
  });

  const bodyGeo = new THREE.SphereGeometry(0.5, 12, 12);
  bodyGeo.scale(0.8, 1, 0.9);
  const bodyMesh = new THREE.Mesh(bodyGeo, rabbitMat);
  bodyMesh.position.y = 0.4;
  group.add(bodyMesh);

  const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
  const headMesh = new THREE.Mesh(headGeo, rabbitMat);
  headMesh.position.set(0, 0.85, 0.2);
  group.add(headMesh);

  const earGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.5, 8);
  const earLeft = new THREE.Mesh(earGeo, rabbitMat);
  earLeft.position.set(-0.12, 1.25, 0.18);
  earLeft.rotation.z = 0.15;
  earLeft.rotation.x = -0.1;
  group.add(earLeft);

  const earRight = earLeft.clone();
  earRight.position.x = 0.12;
  earRight.rotation.z = -0.15;
  group.add(earRight);

  return group;
}

const rabbits = [];
for (let i = 0; i < 4; i++) {
  const rabbitMesh = createRabbit();
  islandGroup.add(rabbitMesh);

  rabbits.push({
    mesh: rabbitMesh,
    orbitRadius: 2.8 + Math.random() * 3.2,
    orbitSpeed: (0.12 + Math.random() * 0.15) * (i % 2 === 0 ? 1 : -1),
    phase: (i / 4) * Math.PI * 2,
    baseY: 4.05,
    hopSpeed: 4.5 + Math.random() * 2.0,
    hopHeight: 0.15,
    scale: 0.75 + Math.random() * 0.25,
  });
  rabbits[i].mesh.scale.setScalar(rabbits[i].scale);
}

function updateRabbits(time) {
  rabbits.forEach((r) => {
    const angle = r.phase + time * r.orbitSpeed;
    const sign = Math.sign(r.orbitSpeed) || 1;

    const x = Math.cos(angle) * r.orbitRadius;
    const z = Math.sin(angle) * r.orbitRadius;
    const hop = Math.abs(Math.sin(time * r.hopSpeed)) * r.hopHeight;

    r.mesh.position.set(x, r.baseY + hop, z);

    const dx = -Math.sin(angle) * sign;
    const dz = Math.cos(angle) * sign;
    r.mesh.rotation.y = Math.atan2(dx, dz);
  });
}

// ĐÔI TRAI GÁI CHIBI NGỒI BÊN MÉP ĐẢO
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Dùng chung chất liệu cùng màu để gộp được các mảnh lại (xem mergeByMaterial)
const matCache = new Map();
function softMat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }),
    );
  }
  return matCache.get(key);
}
const SHINE_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });
const BLUSH_MAT = softMat(0xf5a0a6, { roughness: 0.82 });

// Khối tròn bo mịn: hình cầu bán kính 1 được co giãn theo scale
const BLOB_GEO = isMobile
  ? new THREE.SphereGeometry(1, 18, 12)
  : new THREE.SphereGeometry(1, 28, 20);
function addBlob(parent, mat, pos, scale, rot) {
  const m = new THREE.Mesh(BLOB_GEO, mat);
  m.position.copy(pos);
  m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(m);
  return m;
}

// Tay/chân: ống trụ nối điểm a -> b, bo tròn hai đầu
function addLimb(parent, a, b, radius, mat, radiusB = radius) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const seg = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusB, radius, dir.length(), 16),
    mat,
  );
  seg.position.copy(a).addScaledVector(dir, 0.5);
  seg.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(seg);
  addBlob(parent, mat, a, [radius, radius, radius]);
  addBlob(parent, mat, b, [radiusB, radiusB, radiusB]);
}

// Tay/chân liền khối: một ống cong mượt đi qua các khớp (vai-khuỷu-cổ tay, hông-gối-cổ chân),
// bán kính đổi dần theo từng khớp, hai đầu bo tròn. Không còn mối nối ở khuỷu/gối.
const LIMB_SEG = isMobile ? 16 : 24;
const LIMB_RADIAL = isMobile ? 12 : 16;
// flat (tuỳ chọn): ép dẹt phần cuối ống theo trục flat.axis, bắt đầu từ khớp flat.fromJoint
// và dẹt hẳn ở khớp kế tiếp (dùng cho bàn tay liền với cẳng tay).
function addSmoothLimb(parent, mat, joints, radii, flat) {
  const curve = new THREE.CatmullRomCurve3(joints, false, "centripetal");

  // độ dài tích luỹ giữa các khớp để biết mỗi vòng ống nằm giữa khớp nào
  const cum = [0];
  for (let i = 1; i < joints.length; i++) cum.push(cum[i - 1] + joints[i].distanceTo(joints[i - 1]));
  const total = cum[cum.length - 1];
  const segs = Math.max(LIMB_SEG, Math.ceil(total / (isMobile ? 0.03 : 0.02)));
  const geo = new THREE.TubeGeometry(curve, segs, 1, LIMB_RADIAL, false);
  const smoothstep = (f) => {
    const c = Math.min(1, Math.max(0, f));
    return c * c * (3 - 2 * c);
  };
  const radiusAt = (d) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const s = smoothstep((d - cum[i - 1]) / (cum[i] - cum[i - 1])); // chuyển mượt giữa hai khớp
    return radii[i - 1] + (radii[i] - radii[i - 1]) * s;
  };
  const flatAt = (d) => {
    if (!flat) return 1;
    const d0 = cum[flat.fromJoint];
    const d1 = cum[flat.fromJoint + 1];
    return 1 - (1 - flat.amount) * smoothstep((d - d0) / (d1 - d0));
  };

  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const P = new THREE.Vector3();
  const u = new THREE.Vector3();
  const n = new THREE.Vector3();
  const axis = flat ? flat.axis.clone().normalize() : null;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const r = radiusAt(t * total);
    const sq = flatAt(t * total);
    for (let j = 0; j <= LIMB_RADIAL; j++) {
      const idx = i * (LIMB_RADIAL + 1) + j;
      u.fromBufferAttribute(pos, idx).sub(P); // hướng pháp tuyến đơn vị của ống gốc
      n.copy(u);
      if (axis && sq < 1) {
        const c = u.dot(axis);
        u.addScaledVector(axis, c * (sq - 1)); // ép dẹt theo trục
        n.addScaledVector(axis, c * (1 / sq - 1)); // pháp tuyến của mặt elip
      }
      n.normalize();
      pos.setXYZ(idx, P.x + u.x * r, P.y + u.y * r, P.z + u.z * r);
      nor.setXYZ(idx, n.x, n.y, n.z);
    }
  }
  parent.add(new THREE.Mesh(geo, mat));

  // bo tròn hai đầu (đầu cuối dẹt theo bàn tay nếu có)
  const a = radii[0];
  const b = radii[radii.length - 1];
  addBlob(parent, mat, joints[0], [a, a, a]);
  const tip = addBlob(parent, mat, joints[joints.length - 1], [b, b * (flat ? flat.amount : 1), b]);
  if (flat) tip.quaternion.setFromUnitVectors(UP, axis);
}

// Thân áo tròn trịa dựng bằng LatheGeometry (xoay một đường cong quanh trục)
function addTorso(parent, mat, k) {
  const profile = [
    [0.001, 0], [0.2, 0.01], [0.24, 0.1], [0.25, 0.22],
    [0.24, 0.34], [0.19, 0.43], [0.08, 0.47], [0.001, 0.47],
  ].map(([r, y]) => new THREE.Vector2(r * k, y));
  const geo = new THREE.LatheGeometry(profile, 32);
  geo.scale(1, 1, 0.75);
  const torso = new THREE.Mesh(geo, mat);
  parent.add(torso);
}

function addClothingDetails(upper, o) {
  const seamMat = softMat(o.detailColor || 0xffd8bd, { roughness: 0.55 });
  // (đã bỏ đường nẹp dọc giữa ngực: nhìn như trục xương lộ ra; hai cúc nằm khuất nên bỏ luôn)
  if (o.skirt) {
    // A slim waist band ties the skirt visually to the cardigan.
    addBlob(upper, seamMat, v3(0, -0.015, 0), [0.205 * o.bodyK, 0.035, 0.15]);
  }
}

// Mặt chibi: mắt to long lanh, má hồng, miệng cười
function addFace(head, R, o) {
  const cy = R * 0.9; // tâm đầu
  // điểm trên bề mặt mặt (mặt hơi dẹt theo z)
  const onFace = (x, y, lift = 0) =>
    v3(x, cy + y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) * 0.95 + lift);
  const faceRot = (x, y) => [-y / R, x / R, 0];

  const white = softMat(0xfff8f1, { roughness: 0.3 });
  const iris = softMat(o.eye, { roughness: 0.25 });
  const shine = SHINE_MAT;
  const dark = softMat(0x2a1a12);
  const es = o.eyeSize;

  [-1, 1].forEach((s) => {
    const ex = 0.115 * s;
    const ey = -0.018;
    addBlob(head, softMat(0xe9bcb0), onFace(ex, ey, -0.018), [0.061 * es, 0.074 * es, 0.009], faceRot(ex, ey));
    addBlob(head, white, onFace(ex, ey, -0.013), [0.052 * es, 0.064 * es, 0.008], faceRot(ex, ey));
    addBlob(head, iris, onFace(ex + 0.006 * s, ey - 0.008, -0.009), [0.038 * es, 0.05 * es, 0.007], faceRot(ex, ey));
    addBlob(head, dark, onFace(ex + 0.008 * s, ey - 0.012, -0.005), [0.024 * es, 0.036 * es, 0.006], faceRot(ex, ey));
    addBlob(head, shine, onFace(ex - 0.008, ey + 0.015, 0.001), [0.009, 0.01, 0.004]);
    addBlob(head, shine, onFace(ex + 0.021, ey - 0.03, 0.001), [0.005, 0.006, 0.003]);

    // lông mày
    const by = 0.105;
    const brow = addBlob(head, softMat(o.hair), onFace(ex, by, 0.002), [0.048, o.browThick, 0.012], faceRot(ex, by));
    brow.rotation.z = -0.12 * s;

    // mi mắt cong cho cô gái
    if (o.lashes) {
      const lash = new THREE.Mesh(
      new THREE.TorusGeometry(0.058 * es, 0.005, 6, 16, Math.PI * 0.8),
        dark,
      );
      lash.position.copy(onFace(ex, ey + 0.006, -0.01));
      lash.rotation.set(-ey / R, ex / R, Math.PI * 0.1);
      head.add(lash);
    }

    // má hồng
    addBlob(head, BLUSH_MAT, onFace(0.19 * s, -0.1, 0.001), [0.052, 0.026, 0.009], faceRot(0.19 * s, -0.1));

    // tai
    if (o.ears) addBlob(head, o.skinMat, v3(R * 0.96 * s, cy - 0.01, 0), [0.045, 0.07, 0.035]);
  });

  // mũi & miệng cười
  addBlob(head, softMat(0xeaa991), onFace(0, -0.075, 0.006), [0.018, 0.012, 0.012]);
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.034, 0.007, 8, 20, Math.PI),
    softMat(0xb5525a),
  );
  mouth.position.copy(onFace(0, -0.14, 0.006));
  mouth.rotation.set(0.15, 0, Math.PI);
  head.add(mouth);
}

// TÓC: hàng nghìn sợi mảnh, không dùng lớp phủ giả.
// Mỗi sợi là một dải mỏng nằm ép theo đầu, thon dần tới ngọn nhọn, gốc chìm trong da đầu.
// Tất cả sợi của một mái tóc được ghi thẳng vào một BufferGeometry để dựng nhanh.
const HAIR_DENSITY = isMobile ? 25 : 100; // số sợi = số gốc x HAIR_DENSITY
const HAIR_W = 0.0075; // nửa bề rộng sợi ở gốc
const HAIR_SEG = isMobile ? 6 : 8;

// Số ngẫu nhiên có seed để tóc giống nhau mỗi lần tải trang
let hairSeed = 20240917;
function hairRand() {
  hairSeed = (hairSeed * 1664525 + 1013904223) >>> 0;
  return hairSeed / 4294967296;
}
const jitter = (amount) => (hairRand() - 0.5) * 2 * amount;

function createHairBuilder(center) {
  // sway: độ lay theo gió của từng đỉnh (0 ở gốc -> lớn ở ngọn, tóc dài lay nhiều hơn)
  return { center, pos: [], nor: [], idx: [], sway: [] };
}

const _hP = new THREE.Vector3();
const _hT = new THREE.Vector3();
const _hO = new THREE.Vector3();
const _hW = new THREE.Vector3();
// taperPow lớn = sợi giữ bề rộng lâu hơn rồi mới thon nhọn ở ngọn
function addStrand(hb, points, halfWidth, taperPow = 1.4, seg = HAIR_SEG) {
  const curve = new THREE.CatmullRomCurve3(points);
  const c = hb.center;
  const base = hb.pos.length / 3;
  let len = 0;
  for (let i = 1; i < points.length; i++) len += points[i].distanceTo(points[i - 1]);
  const swayK = Math.min(1, len / 0.45); // tóc ngắn (mái, tóc nam) lay rất ít
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    hb.sway.push(t * swayK, t * swayK);
    curve.getPoint(t, _hP);
    curve.getTangent(t, _hT);
    // hướng "ra ngoài": trên đầu hướng theo tâm đầu, phần rủ xuống hướng ngang
    const dy = _hP.y - c.y;
    _hO.set(_hP.x - c.x, dy > 0 ? dy : dy * 0.2, _hP.z - c.z).normalize();
    _hW.crossVectors(_hT, _hO);
    if (_hW.lengthSq() < 1e-8) _hW.set(1, 0, 0);
    _hW.normalize().multiplyScalar(halfWidth * Math.max(0.03, 1 - Math.pow(t, taperPow)));
    hb.pos.push(
      _hP.x - _hW.x, _hP.y - _hW.y, _hP.z - _hW.z,
      _hP.x + _hW.x, _hP.y + _hW.y, _hP.z + _hW.z,
    );
    hb.nor.push(_hO.x, _hO.y, _hO.z, _hO.x, _hO.y, _hO.z);
  }
  for (let i = 0; i < seg; i++) {
    const a = base + i * 2;
    hb.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
}

function finishHair(hb, head, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(hb.pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(hb.nor, 3));
  geo.setAttribute("sway", new THREE.Float32BufferAttribute(hb.sway, 1));
  geo.setIndex(hb.idx);
  head.add(new THREE.Mesh(geo, mat));
  addHairWind(mat);
}

// Gió nhẹ làm tóc bay: dịch các đỉnh tóc ngay trong shader theo thời gian,
// gốc tóc đứng yên, ngọn tóc lay nhiều (thuộc tính sway). Không phải dựng lại tóc mỗi khung hình.
const HAIR_WIND_TIME = { value: 0 };
function addHairWind(mat) {
  if (mat.userData.wind) return;
  mat.userData.wind = true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = HAIR_WIND_TIME;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float sway;\nuniform float uWindTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float w = sway * sway;
        float ph = uWindTime * 1.4 + position.y * 3.0 + position.x * 2.0 + position.z * 1.5;
        float gust = 0.6 + 0.4 * sin(uWindTime * 0.35);
        // gió thổi nhẹ sang phải và ra sau, dập dờn
        transformed.x += (0.35 + sin(ph) * 0.55 + sin(ph * 2.3 + 1.7) * 0.2) * 0.035 * w * gust;
        transformed.z += (-0.3 + sin(ph * 0.8 + 0.9) * 0.4) * 0.03 * w * gust;
        transformed.y += sin(ph * 1.3) * 0.006 * w;`,
      );
  };
}

// Điểm trên mặt cầu quanh đầu: theta tính từ đỉnh đầu, phi = 0 ở phía trước
function sph(c, r, theta, phi) {
  return v3(
    c.x + r * Math.sin(theta) * Math.sin(phi),
    c.y + r * Math.cos(theta),
    c.z + r * Math.sin(theta) * Math.cos(phi) * 0.97,
  );
}

// Điểm nằm sát bề mặt mặt/trán (đầu hơi dẹt theo z giống addFace)
function faceSurface(R, cy, x, y, lift) {
  return v3(x, cy + y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) * 0.95 + lift);
}

// Chân tóc: trán cao (frontDeg), hai bên ngang tai, gáy thấp (120°)
function hairlineAt(phi, frontDeg) {
  return ((frontDeg + (120 - frontDeg) * (1 - Math.cos(phi)) / 2) * Math.PI) / 180;
}

// Tóc phủ đầu: gốc rải đều trên da đầu, mỗi sợi chải từ gốc xuống quá chân tóc một chút.
// Sợi mọc gần đỉnh nằm lớp ngoài, phủ lên sợi mọc thấp hơn.
function addScalpStrands(hb, R, count, frontDeg) {
  const c = hb.center;
  for (let i = 0; i < count; i++) {
    const phi = hairRand() * Math.PI * 2;
    const line = hairlineAt(phi, frontDeg);
    const thMax = line - 0.05;
    const th0 = Math.acos(1 - hairRand() * (1 - Math.cos(thMax))); // rải đều theo diện tích
    const th1 = Math.max(th0 + 0.15, Math.min(th0 + 0.5 + hairRand() * 0.25, line + 0.05 + hairRand() * 0.05));
    const ph1 = phi + 0.15 + jitter(0.05);
    // luôn nằm ngoài lớp da đầu (1.03R) để không bị nhiễu chấm đen
    const layer = R * (1.045 + 0.045 * (1 - th0 / thMax)) + hairRand() * 0.004;

    const pts = [sph(c, R * 0.96, th0, phi)];
    for (let k = 1; k <= 3; k++) {
      const t = k / 3;
      pts.push(sph(c, layer + 0.006 * Math.sin(Math.PI * t), th0 + (th1 - th0) * t, phi + (ph1 - phi) * t));
    }
    addStrand(hb, pts, HAIR_W * (0.8 + hairRand() * 0.4));
  }
}

// Mái: sợi mảnh từ chân tóc chải chéo xuống trán, dừng trên lông mày
function addFringe(hb, R, cy, x0, x1, count, sweep, endY) {
  for (let i = 0; i < count; i++) {
    const x = x0 + (x1 - x0) * hairRand();
    const sw = sweep * (0.85 + hairRand() * 0.3);
    const lift = 0.004 + hairRand() * 0.01;
    addStrand(
      hb,
      [
        faceSurface(R, cy, x, 0.26, -0.02),
        faceSurface(R, cy, x + sw * 0.45, 0.21, lift + 0.004),
        faceSurface(R, cy, x + sw, endY + jitter(0.012), lift),
      ],
      HAIR_W * (0.8 + hairRand() * 0.4),
    );
  }
}

// Lớp da đầu màu tóc tối nằm dưới các sợi: khe giữa sợi không lộ da trắng.
// Đặt ở 1.03R: ngoài da mặt (đỉnh đầu cao 1.02R), trong các sợi tóc (>= 1.045R).
function scalpMat(mat) {
  return softMat(mat.color.clone().multiplyScalar(0.55).getHex(), { roughness: 0.8 });
}
function addScalp(head, R, cy, mat, coverAngle, tilt) {
  const scalp = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.03, 32, 16, 0, Math.PI * 2, 0, coverAngle),
    scalpMat(mat),
  );
  scalp.position.y = cy;
  scalp.scale.z = 0.97;
  scalp.rotation.x = -tilt;
  head.add(scalp);
}

// Phủ kín chỏm đầu: sợi mọc từ bên kia đỉnh, vắt ngang qua đỉnh rồi chải xuống,
// nằm lớp ngoài cùng để che điểm hội tụ ở đỉnh đầu
function addCrownCover(hb, R, count) {
  const c = hb.center;
  for (let i = 0; i < count; i++) {
    const phi = hairRand() * Math.PI * 2;
    const th0 = -0.3 * hairRand(); // theta âm = phía bên kia đỉnh đầu
    const th1 = 0.35 + hairRand() * 0.35;
    const layer = R * 1.095 + jitter(0.004);
    const pts = [sph(c, R * 0.96, th0 - 0.1, phi)];
    for (let k = 1; k <= 3; k++) {
      const t = k / 3;
      pts.push(sph(c, layer + 0.006 * Math.sin(Math.PI * t), th0 + (th1 - th0) * t, phi + 0.1 * t));
    }
    addStrand(hb, pts, HAIR_W * (0.8 + hairRand() * 0.4));
  }
}

// Tóc chàng trai: ngắn, phủ đều bằng sợi, mái chải lệch (không có tóc mai)
function addBoyHair(head, R, mat) {
  const cy = R * 0.9;
  addScalp(head, R, cy, mat, Math.PI * 0.47, 0.7);
  const hb = createHairBuilder(v3(0, cy, 0));
  addScalpStrands(hb, R, 28 * HAIR_DENSITY, 45);
  addCrownCover(hb, R, 8 * HAIR_DENSITY);
  addFringe(hb, R, cy, -0.21, 0.15, 10 * HAIR_DENSITY, 0.085, 0.165);
  finishHair(hb, head, mat);
}

// Mái dài hai bên ôm mặt, cắt tầng 3 bậc: gò má -> hàm -> dưới cằm.
// Bậc dài hơn nằm lớp ngoài hơn một chút để thấy rõ từng tầng.
function addLayeredSideBangs(hb, R, cy) {
  const steps = [-0.04, -0.2, -0.36];
  [-1, 1].forEach((s) => {
    steps.forEach((endY, layer) => {
      const outward = layer * 0.012;
      // dày hơn và đi phía ngoài đuôi mắt/lông mày, không lộ mi mắt qua kẽ tóc
      for (let i = 0; i < 2.5 * HAIR_DENSITY; i++) {
        const x0 = 0.13 + hairRand() * 0.07;
        const lift = 0.006 + hairRand() * 0.008 + outward;
        const xSide = 0.27 + outward + hairRand() * 0.04;
        const yEnd = endY + jitter(0.025);
        const zMid = faceSurface(R, cy, xSide, yEnd * 0.5, 0).z;
        addStrand(
          hb,
          [
            faceSurface(R, cy, s * x0, 0.22, -0.02),
            faceSurface(R, cy, s * (x0 + 0.09), 0.13, lift),
            v3(s * (xSide - 0.01), cy + yEnd * 0.5, Math.max(zMid, 0.09) + lift),
            v3(s * xSide, cy + yEnd, 0.1 + lift + jitter(0.01)),
          ],
          HAIR_W * (0.8 + hairRand() * 0.4),
        );
      }
    });
  });
}

// Tóc cô gái: phủ đều bằng sợi, mái chéo, tóc dài gợn sóng sau lưng và hai bên
function addGirlHair(head, R, mat) {
  const cy = R * 0.9;
  const c = v3(0, cy, 0);
  addScalp(head, R, cy, mat, Math.PI * 0.5, 0.62);
  const hb = createHairBuilder(c);
  addScalpStrands(hb, R, 32 * HAIR_DENSITY, 50);
  addCrownCover(hb, R, 8 * HAIR_DENSITY);
  addFringe(hb, R, cy, -0.21, 0.11, 9 * HAIR_DENSITY, 0.13, 0.155);
  addLayeredSideBangs(hb, R, cy);

  // da đầu tối phủ thêm hai bên sau tai và gáy (vùng tóc dài mọc ra)
  const backScalp = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.03, 32, 16, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.68),
    scalpMat(mat),
  );
  backScalp.position.y = cy;
  backScalp.scale.z = 0.97;
  head.add(backScalp);

  // Tóc dài: gốc mọc từ gần đỉnh, chải ôm theo đầu xuống gáy/sau tai rồi mới rủ,
  // xếp nhiều lớp (out) cho khối tóc dày, sợi giữ bề rộng tới gần ngọn
  const longSeg = isMobile ? 10 : 14;
  const longStrand = (phi, th0, thDrop, out, len, dropPts, taper = 3) => {
    const layer = R * 1.06 + out;
    const b = sph(c, layer, thDrop, phi);
    addStrand(
      hb,
      [
        sph(c, R * 0.99, th0, phi),
        sph(c, layer, th0 + 0.2, phi),
        sph(c, layer, (th0 + 0.2 + thDrop) / 2, phi),
        b,
        ...dropPts(b, len),
      ],
      HAIR_W * 1.3 * (0.8 + hairRand() * 0.4),
      taper,
      longSeg,
    );
  };

  // sau lưng
  for (let i = 0; i < 28 * HAIR_DENSITY; i++) {
    const out = hairRand() * 0.06;
    const wave = jitter(0.025);
    longStrand(
      Math.PI * (0.55 + 0.9 * hairRand()),
      0.2 + hairRand() * 1.0,
      1.95,
      out,
      0.58 + hairRand() * 0.1,
      (b, len) => [
        v3(b.x * (1.05 + out) + wave, cy - len * 0.55, b.z * (1.02 + out)),
        v3(b.x * (1.1 + out) - wave, cy - len, b.z * (1.02 + out)),
      ],
    );
  }

  // Tóc thái dương: phủ vùng giữa mái hai bên và tai, chải vòng ra sau, ngọn nhọn
  [-1, 1].forEach((s) => {
    for (let k = 0; k < 5 * HAIR_DENSITY; k++) {
      const phi = Math.PI * (0.2 + hairRand() * 0.28);
      const th0 = hairlineAt(phi, 50) - 0.25 - hairRand() * 0.2;
      const th1 = 1.55 + hairRand() * 0.25;
      const ph1 = phi + Math.PI * (0.12 + hairRand() * 0.1); // vòng ra sau
      const layer = R * 1.06 + hairRand() * 0.03;
      const pts = [sph(c, R * 0.99, th0, s * phi)];
      for (let j = 1; j <= 3; j++) {
        const t = j / 3;
        pts.push(sph(c, layer + 0.008 * Math.sin(Math.PI * t), th0 + (th1 - th0) * t, s * (phi + (ph1 - phi) * t)));
      }
      addStrand(hb, pts, HAIR_W * (0.8 + hairRand() * 0.4), 1.0);
    }
  });

  // Hai bên sau tai rủ qua vai: càng về sau càng dài, ngọn chải ra sau và nhọn dần
  [-1, 1].forEach((s) => {
    for (let k = 0; k < 6 * HAIR_DENSITY; k++) {
      const back = hairRand(); // 0 = sát mặt, 1 = về phía sau
      const out = hairRand() * 0.05;
      const wave = jitter(0.025);
      longStrand(
        s * Math.PI * (0.42 + back * 0.15),
        0.5 + hairRand() * 0.7,
        1.75,
        out,
        0.36 + back * 0.22 + hairRand() * 0.06,
        (b, len) => [
          v3(b.x * 1.05 + wave, cy - len * 0.55, b.z - 0.02),
          v3(b.x - wave, cy - len, b.z - 0.07 - back * 0.05),
        ],
        1.2, // thon nhọn dần
      );
    }
  });

  finishHair(hb, head, mat);
}

// Váy xoè ngắn liền khối: uốn một hình cầu phủ hông và nửa đùi
// Váy khi ngồi: tấm vải từ eo trải phẳng phủ đều lên hai đùi, xoè ra hai bên xuống mặt ghế,
// phía trước rủ thẳng xuống qua đầu gối với gấu váy là một đường ngang thẳng hàng.
function addSkirt(person, mat) {
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const smooth = (t) => {
    const c = clamp01(t);
    return c * c * (3 - 2 * c);
  };

  const WAIST_Y = 0.2;
  const LAP_Y = 0.245; // mặt vải trên đùi (đùi cao tới ~0.215)
  const SEAT_Y = 0.015; // mép váy xoè nằm trên mặt ghế
  const HEM_Y = -0.1; // gấu váy phía trước, thấp hơn đầu gối
  const HALF_W = 0.36; // váy xoè ra hai bên
  const FRONT_Z = 0.53; // mép trước, qua đầu gối (gối tới ~0.49)
  const BACK_Z = -0.17; // mông tròn phía sau

  // độ cao mặt vải: phẳng trên hai đùi, dốc dần ra hai bên và phía sau xuống mặt ghế
  const heightAt = (x, z) => {
    const side = smooth((Math.abs(x) - 0.19) / (HALF_W - 0.19));
    const back = smooth((0.02 - z) / 0.17);
    return LAP_Y + (SEAT_Y - LAP_Y) * Math.max(side, back);
  };

  const nA = 64; // quanh eo
  const nTop = 12; // từ eo ra mép
  const nDrop = 10; // mép bo tròn + vạt rủ phía trước
  const ARC_PART = 0.6; // phần đầu của vạt là cung tròn, phần sau rủ thẳng
  const EDGE_R = 0.12; // bán kính bo mép váy (hình bán nguyệt khi nhìn nghiêng)
  const rows = nTop + nDrop;
  const pos = [];

  for (let r = 0; r <= rows; r++) {
    for (let i = 0; i <= nA; i++) {
      const a = Math.PI + (i / nA) * Math.PI * 2; // bắt đầu ở phía sau để đường nối bị che
      const sa = Math.sin(a);
      const ca = Math.cos(a);
      const frontness = smooth((ca - 0.25) / 0.5); // 1 ở cạnh trước, 0 ở hai bên/sau
      const backness = smooth((-ca - 0.05) / 0.5); // 1 ở chính giữa phía sau
      // roundW: 1 ở nửa sau + hai bên hông (bo tròn như mông), 0 ở phía trước (trải phẳng trên đùi)
      const roundW = smooth((0.45 - ca) / 0.6);
      // mép váy: phía trước là chữ nhật bo góc (cạnh thẳng), nửa sau tròn dần thành elip
      const pw = 0.35 + 0.45 * roundW;
      const ex = HALF_W * Math.sign(sa) * Math.pow(Math.abs(sa), pw) * (1 - 0.3 * backness);
      const ez = (ca > 0 ? FRONT_Z : -BACK_Z) * Math.sign(ca) * Math.pow(Math.abs(ca), pw);

      // Mép váy bo tròn: mặt trên dừng lùi vào trong một đoạn rf, rồi uốn cong tròn (bán kính rf)
      // ra tới mép và xuống dưới, sau đó mới rủ thẳng tới gấu. Không còn vách đứng góc cạnh.
      const edgeTop = heightAt(ex, ez) + (SEAT_Y - heightAt(ex, ez)) * roundW;
      const edgeBottom = edgeTop + (HEM_Y - edgeTop) * frontness;
      const rf = Math.min(EDGE_R, edgeTop - edgeBottom);
      const oLen = Math.hypot(ex, ez) || 1;
      const ox = ex / oLen;
      const oz = ez / oLen;
      const exi = ex - ox * rf;
      const ezi = ez - oz * rf;
      const top = heightAt(exi, ezi) + (SEAT_Y - heightAt(exi, ezi)) * roundW;
      const bottom = top + (HEM_Y - top) * frontness;

      if (r <= nTop) {
        const t = r / nTop;
        // phía trước: trải phẳng trên đùi tới chỗ bắt đầu bo mép
        const fx = 0.17 * sa + (exi - 0.17 * sa) * t;
        const fz = 0.12 * ca + (ezi - 0.12 * ca) * t;
        const fy = WAIST_Y + (heightAt(fx, fz) - WAIST_Y) * smooth(t * 3);
        // nửa sau: cong tròn một phần tư elip từ ngang mặt đùi xuống ghế, ôm tròn mông
        const s = Math.sin((t * Math.PI) / 2);
        const rx = 0.17 * sa + (exi - 0.17 * sa) * s;
        const rz = 0.12 * ca + (ezi - 0.12 * ca) * s;
        const ry = SEAT_Y + (LAP_Y + 0.005 - SEAT_Y) * Math.cos((t * Math.PI) / 2);
        pos.push(
          fx + (rx - fx) * roundW,
          fy + (ry - fy) * roundW,
          fz + (rz - fz) * roundW,
        );
      } else {
        const t = (r - nTop) / nDrop;
        if (t <= ARC_PART) {
          // cung tròn bo mép
          const phi = (t / ARC_PART) * (Math.PI / 2);
          pos.push(exi + ox * rf * Math.sin(phi), top - rf * (1 - Math.cos(phi)), ezi + oz * rf * Math.sin(phi));
        } else {
          // vạt rủ thẳng xuống gấu (chỉ phía trước), xoè nhẹ
          const u = (t - ARC_PART) / (1 - ARC_PART);
          const flare = 1 + 0.06 * u * frontness;
          const yStart = top - rf;
          pos.push(ex * flare, yStart + (Math.min(bottom, yStart) - yStart) * u, ez + 0.03 * u * frontness);
        }
      }
    }
  }

  const idx = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < nA; i++) {
      const a = r * (nA + 1) + i;
      const b = a + nA + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  person.add(new THREE.Mesh(geo, mat));
}

// Nhân vật chibi ngồi; gốc toạ độ tại mặt đất chỗ ngồi, mặt hướng +z
function createChibi(o) {
  const person = new THREE.Group();
  const skinMat = softMat(0xf9d9c4, { roughness: 0.72 });
  const topMat = softMat(o.top);
  const legMat = softMat(o.legs);
  const shoeMat = softMat(o.shoes, { roughness: 0.45 });
  const hairMat = softMat(o.hair, { roughness: 0.5, side: THREE.DoubleSide });
  const innerMat = softMat(0xf3ece6);

  // Chân thả xuống mép đảo
  if (o.skirt) addSkirt(person, softMat(o.skirt, { side: THREE.DoubleSide }));
  else addBlob(person, legMat, v3(0, 0.13, 0), [0.23, 0.12, 0.18]);

  [-1, 1].forEach((s) => {
    const hip = v3(o.hipX * s, 0.13, 0);
    const knee = v3((o.hipX + 0.01) * s, 0.13, 0.4);
    const ankle = v3((o.hipX + 0.02) * s, -0.3, 0.46);
    addSmoothLimb(person, legMat, [hip, knee, ankle], [o.legR, o.legR * 0.92, o.legR * 0.8]);
    addBlob(person, shoeMat, v3(ankle.x, ankle.y - 0.05, ankle.z + 0.05), [0.095, 0.07, 0.15]);
  });

  // Thân trên (có thể nghiêng)
  const upper = new THREE.Group();
  // torsoLift: thân trên dài hơn (người cao hơn); tay được bù lại để vẫn đặt trên gối
  const lift = o.torsoLift || 0;
  upper.position.y = 0.1 + lift;
  upper.rotation.z = o.upperTilt;
  upper.rotation.y = o.bodyTurn || 0;
  upper.rotation.x = o.leanForward || 0; // ngả người ra trước
  person.add(upper);
  person.userData.upper = upper;

  addTorso(upper, topMat, o.bodyK);
  addClothingDetails(upper, o);
  // áo trong màu trắng lộ ra phía trước
  // cổ áo / mũ hoodie
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.13 * o.bodyK, 0.05, 12, 28),
    topMat,
  );
  collar.position.set(0, 0.45, -0.02);
  collar.rotation.x = Math.PI / 2;
  upper.add(collar);
  if (o.hood) {
    addBlob(upper, topMat, v3(0, 0.44, -0.13), [0.18, 0.1, 0.09]);
    [-1, 1].forEach((s) =>
      addLimb(upper, v3(0.05 * s, 0.42, 0.16), v3(0.055 * s, 0.28, 0.19), 0.008, innerMat),
    );
  }

  // Tay áo (dài hoặc ngắn), hai bàn tay đặt lên gối.
  // Vai đặt ở mép thân, khuỷu ra ngoài thân, cổ tay nâng lên trên đùi để tay không chìm.
  // Khuỷu/cổ tay/bàn tay giữ cố định trên gối dù thân trên nghiêng: đổi ngược qua phép xoay thân.
  upper.updateMatrix();
  const toUpper = new THREE.Matrix4().copy(upper.matrix).invert();
  const upperQInv = upper.quaternion.clone().invert();
  const fixed = (x, y, z) => v3(x, y + 0.1 + lift, z).applyMatrix4(toUpper);
  const sh = 0.24 * o.bodyK;
  [-1, 1].forEach((s) => {
    const shoulder = v3(sh * s, 0.38, 0);
    const hug = o.hugArm && o.hugArm.side === s ? o.hugArm : null;
    const k = o.armR;
    // Cả cánh tay + bàn tay là một khối liền: vai -> khuỷu -> cổ tay (thon) -> lòng bàn tay (nở, dẹt)
    // -> đầu ngón (thu nhỏ). Bàn tay to hơn cổ tay, ép dẹt theo mặt nó áp vào.
    const HAND_R = k * 0.85; // nửa bề ngang bàn tay
    const HAND_FLAT = 0.45; // độ dày / bề ngang
    const halfT = HAND_R * HAND_FLAT; // nửa bề dày bàn tay

    let joints;
    let flatAxis;
    if (hug) {
      // tay ôm: vai -> dọc lưng bạn gái -> cổ tay (hông phải) -> bàn tay áp eo
      joints = [shoulder, ...hug.joints, hug.hand.mid, hug.hand.tip];
      flatAxis = hug.hand.axis;
    } else {
      // tay đặt trên gối: cẳng tay dọc theo đùi, bàn tay úp lên đầu gối theo hướng cẳng tay
      const elbowP = v3((sh + 0.07) * s, 0.19 - lift * 0.5, 0.08);
      const wristXZ = v3((o.hipX + 0.02) * s, 0, 0.31);
      const dir = new THREE.Vector3().subVectors(wristXZ, elbowP);
      dir.y = 0;
      dir.normalize();
      // đáy bàn tay chạm mặt đùi / mặt váy (toạ độ người), đổi sang toạ độ thân trên chưa xoay
      const surfaceY = (o.skirt ? 0.25 : 0.232) - 0.1 - lift;
      const midY = surfaceY + halfT;
      const at = (d, y) => fixed(wristXZ.x + dir.x * d, y, wristXZ.z + dir.z * d);
      joints = [shoulder, fixed(elbowP.x, elbowP.y, elbowP.z), at(0, midY + 0.012), at(0.06, midY), at(0.115, midY - 0.012)];
      flatAxis = UP.clone().applyQuaternion(upperQInv); // dẹt theo phương thẳng đứng
    }

    const n = joints.length;
    // bán kính: vai 0.85k thon dần tới cổ tay 0.6k, lòng bàn tay nở ra, đầu ngón thu nhỏ
    const radii = joints.map((_, i) => {
      if (i === n - 1) return k * 0.45;
      if (i === n - 2) return HAND_R;
      return k * (0.85 - (0.25 * i) / (n - 3));
    });
    addSmoothLimb(upper, skinMat, joints, radii, { axis: flatAxis, fromJoint: n - 3, amount: HAND_FLAT });

    // tay áo ngắn phồng nhẹ tới giữa bắp tay
    const sleeveEnd = shoulder.clone().lerp(joints[1], 0.5);
    addSmoothLimb(upper, topMat, [shoulder, sleeveEnd], [k * 1.1, k * 1.2]);
  });

  // Cổ + đầu to
  addLimb(upper, v3(0, 0.44, 0), v3(0, 0.52, 0), 0.06, skinMat);
  const head = new THREE.Group();
  head.position.y = 0.48;
  head.rotation.z = o.headTilt;
  head.scale.setScalar(o.headScale || 1); // thu nhỏ cả đầu: mặt, tóc giữ đúng tỉ lệ
  upper.add(head);

  const R = o.headR;
  addBlob(head, skinMat, v3(0, R * 0.9, 0), [R, R * 1.02, R * 0.95]);
  addFace(head, R, { ...o, skinMat });
  o.hairStyle(head, R, hairMat);

  return person;
}

const couple = new THREE.Group();

// Cặp đôi đặt trên mép đảo (toạ độ + tỉ lệ của cả cặp trong cảnh)
const COUPLE_POS = v3(0, 4.05, 8.05);
const COUPLE_SCALE = 1.72;

// Độ cao mặt đảo ngay dưới chỗ ngồi (toạ độ của cả cặp), dò bằng tia chiếu thẳng xuống
// mặt đảo gồ ghề, để mỗi người ngồi sát đất: không lơ lửng, không lún.
function seatHeight(personX, personScale, hipX) {
  if (typeof topMesh === "undefined") return 0;
  islandGroup.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const down = v3(0, -1, 0);
  let best = -Infinity;
  [-hipX - 0.08, -hipX, 0, hipX, hipX + 0.08].forEach((x) => {
    [-0.12, 0, 0.12, 0.25].forEach((z) => {
      const wx = COUPLE_POS.x + (personX + x * personScale) * COUPLE_SCALE;
      const wz = COUPLE_POS.z + z * personScale * COUPLE_SCALE;
      ray.set(v3(wx, 20, wz), down);
      const hit = ray.intersectObjects([topMesh, islandMesh], false)[0];
      if (hit) best = Math.max(best, (hit.point.y - COUPLE_POS.y) / COUPLE_SCALE);
    });
  });
  return best === -Infinity ? 0 : best - 0.01;
}

// Tư thế: hai người ngồi sát nhau, bạn nữ nghiêng đầu về phía bạn nam
const BOY_X = -0.28;
const BOY_SCALE = 1.08;
const BOY_LIFT = 0.125; // thân trên dài hơn để cao hơn bạn gái nửa cái đầu
const BOY_Y = seatHeight(BOY_X, BOY_SCALE, 0.11);
const GIRL_SCALE = 0.95;
const GIRL_POS = v3(0.26, seatHeight(0.26, GIRL_SCALE, 0.09), 0);

// Cô gái bên phải: cardigan hồng, váy hồng, tất trắng, tóc dài gợn sóng,
// ngả người và tựa đầu lên vai chàng trai
const girlOpts = {
  top: 0xf0a1b5,
  detailColor: 0xffd6df,
  accentColor: 0xffedc2,
  legs: 0xf4f1ee,
  shoes: 0xe98aa6,
  hair: 0x0b0a0a, // đen (không để 0x000000 để vẫn thấy ánh sáng trên sợi tóc)
  eye: 0x6a2f22,
  eyeSize: 1.15,
  browThick: 0.011,
  lashes: true,
  skirt: 0xe5879f,
  shortSleeves: true,
  bodyK: 0.85,
  headR: 0.32,
  headScale: 0.82,
  hipX: 0.09,
  legR: 0.085,
  armR: 0.065,
  handX: 0.07,
  upperTilt: 0,
  headTilt: 0.14, // nghiêng đầu về phía bạn trai
  hairStyle: addGirlHair,
};
const girl = createChibi(girlOpts);
girl.position.copy(GIRL_POS);
girl.scale.setScalar(GIRL_SCALE);
couple.add(girl);

// Bán kính thân áo theo độ cao (khớp với addTorso)
function torsoRadius(y, k) {
  const prof = [[0.001, 0], [0.2, 0.01], [0.24, 0.1], [0.25, 0.22], [0.24, 0.34], [0.19, 0.43], [0.08, 0.47]];
  for (let i = 1; i < prof.length; i++) {
    if (y <= prof[i][1]) {
      const f = (y - prof[i - 1][1]) / (prof[i][1] - prof[i - 1][1]);
      return (prof[i - 1][0] + (prof[i][0] - prof[i - 1][0]) * f) * k;
    }
  }
  return 0.08 * k;
}

// Tính tay ôm eo từ bề mặt lưng/eo thật của bạn gái, đổi sang toạ độ thân trên bạn nam.
// Mỗi điểm nằm cách da đúng bằng bán kính tay (+ khe rất nhỏ): ôm sát mà không lún vào.
function computeHugArm() {
  couple.updateMatrixWorld(true);
  const gU = girl.userData.upper.matrixWorld;
  const boyUpper = new THREE.Matrix4().compose(
    v3(BOY_X, BOY_Y + (0.1 + BOY_LIFT) * BOY_SCALE, 0),
    new THREE.Quaternion(),
    v3(BOY_SCALE, BOY_SCALE, BOY_SCALE),
  );
  const toBoy = new THREE.Matrix4().copy(boyUpper).invert().multiply(gU);
  const k = girlOpts.bodyK;
  // bán kính tay bạn nam đổi sang đơn vị của bạn gái
  const armR = (0.075 * 0.75 * BOY_SCALE) / GIRL_SCALE;

  // alpha: góc quanh eo, 90° = giữa lưng, 180° = hông trái (phía bạn nam), 0° = hông phải
  const onBack = (alphaDeg, y, offset) => {
    const a = (alphaDeg * Math.PI) / 180;
    const r = torsoRadius(y, k);
    const p = v3(r * Math.cos(a), y, -0.75 * r * Math.sin(a));
    const n = v3(Math.cos(a) / r, 0, -Math.sin(a) / (0.75 * r)).normalize();
    return { p: p.clone().addScaledVector(n, offset), n };
  };

  const joints = [
    onBack(155, 0.32, armR + 0.016), // đoạn gần vai: đường cong cắt góc nên chừa khe lớn hơn
    onBack(125, 0.27, armR + 0.008),
    onBack(95, 0.22, armR + 0.004),
    onBack(65, 0.18, armR + 0.004),
    onBack(35, 0.15, armR + 0.004),
  ].map((e) => e.p.applyMatrix4(toBoy));

  // bàn tay (liền với cẳng tay) áp lên hông phải, ngón tay vòng ra trước;
  // dẹt theo pháp tuyến eo để lòng bàn tay áp sát người bạn gái
  const toGirl = BOY_SCALE / GIRL_SCALE;
  const handHalfT = 0.075 * 0.85 * 0.45 * toGirl;
  const tipHalfT = 0.075 * 0.45 * 0.45 * toGirl;
  const mid = onBack(8, 0.15, handHalfT + 0.004);
  const tip = onBack(-14, 0.145, tipHalfT + 0.004);

  return {
    side: 1,
    joints,
    hand: {
      mid: mid.p.applyMatrix4(toBoy),
      tip: tip.p.applyMatrix4(toBoy),
      axis: mid.n.clone().transformDirection(toBoy),
    },
  };
}

// Chàng trai bên trái: hoodie hồng, quần jean, giày trắng, tóc ngắn mái lệch,
// tay phải vòng qua lưng ôm sát eo bạn gái
const boy = createChibi({
  top: 0xf29bb0,
  detailColor: 0xffd2c5,
  accentColor: 0xffe7b8,
  legs: 0x3b4a66,
  shoes: 0xf2f2f2,
  hair: 0x0b0a0a, // đen (không để 0x000000 để vẫn thấy ánh sáng trên sợi tóc)
  eye: 0x5a2e1e,
  eyeSize: 1,
  browThick: 0.018,
  ears: true,
  hood: true,
  shortSleeves: true,
  hugArm: computeHugArm(),
  bodyK: 1,
  headR: 0.33,
  headScale: 0.82,
  torsoLift: BOY_LIFT,
  hipX: 0.11,
  legR: 0.1,
  armR: 0.075,
  handX: 0.07,
  upperTilt: 0,
  headTilt: -0.03,
  hairStyle: addBoyHair,
});
boy.position.set(BOY_X, BOY_Y, 0);
boy.scale.setScalar(BOY_SCALE);
couple.add(boy);

// Gộp mọi mảnh cùng chất liệu thành một mesh: ~150 lần vẽ -> ~15 lần vẽ mỗi khung hình
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (!buckets.has(obj.material)) buckets.set(obj.material, []);
    buckets.get(obj.material).push(obj);
  });

  const merged = new THREE.Group();
  buckets.forEach((meshes, mat) => {
    const parts = meshes.map((m) =>
      m.geometry
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld)),
    );
    const vertCount = parts.reduce((n, g) => n + g.attributes.position.count, 0);
    const pos = new Float32Array(vertCount * 3);
    const nor = new Float32Array(vertCount * 3);
    // giữ thuộc tính sway (tóc bay theo gió) khi gộp; mảnh không có thì = 0
    const hasSway = parts.some((g) => g.attributes.sway);
    const sway = hasSway ? new Float32Array(vertCount) : null;
    const idx = [];
    let offset = 0;
    parts.forEach((g) => {
      pos.set(g.attributes.position.array, offset * 3);
      nor.set(g.attributes.normal.array, offset * 3);
      if (sway && g.attributes.sway) sway.set(g.attributes.sway.array, offset);
      if (g.index) g.index.array.forEach((i) => idx.push(i + offset));
      else for (let i = 0; i < g.attributes.position.count; i++) idx.push(i + offset);
      offset += g.attributes.position.count;
      g.dispose();
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    if (sway) geo.setAttribute("sway", new THREE.BufferAttribute(sway, 1));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    merged.add(new THREE.Mesh(geo, mat));
  });

  return merged;
}

const coupleMesh = mergeByMaterial(couple);
coupleMesh.scale.setScalar(COUPLE_SCALE);
// sát mép đảo để cẳng chân thả hẳn ra ngoài bờ; độ cao từng người đã khớp mặt đất (seatHeight)
coupleMesh.position.copy(COUPLE_POS);
coupleMesh.matrixAutoUpdate = false; // đứng yên, không cần tính lại ma trận mỗi khung hình
coupleMesh.updateMatrix();
islandGroup.add(coupleMesh);

// Đèn ấm phía trước để thấy rõ mặt hai người (đèn chính của cảnh ở sau lưng họ)
const coupleLight = new THREE.PointLight(0xffd6a5, 2.2, 12);
coupleLight.position.set(0, 7.7, 11.2);
islandGroup.add(coupleLight);

// LANTERNS & MESSAGES WITH IMAGES
const lanternsGroup = new THREE.Group();
scene.add(lanternsGroup);

const lanterns = [];
const interactiveObjects = [];

const wishList = [
  { text: "Chúc bé iu và gia đình một mùa Trung Thu đoàn viên, tràn ngập niềm vui và hạnh phúc!" },
  { text: "Cầu chúc cho mọi nguyện ước của em bé đêm nay sẽ trở thành hiện thực." },
  { text: "Trăng tròn ấm áp, chúc tình yêu giữa mình và em bé mãi bền chặt." },
  { text: "Chúc em bé luôn giữ được tâm hồn trong trẻo, yêu đời như ánh trăng rằm." },
  { text: "Trung Thu bình an, vạn sự như ý, công danh thăng tiến rực rỡ!" },
  { text: "Chúc riêng bé iu một đêm trăng thật lãng mạn và ngọt ngào." },
  { text: "Sức khỏe dồi dào, tâm an yên, miệng luôn mỉm cười rạng rỡ." },
];

// Ảnh cho đèn lồng: mỗi đèn lấy ngẫu nhiên một ảnh trong assets/1.jpg ... assets/9.jpg
const LANTERN_IMAGE_COUNT = 9;
const randomLanternImage = () =>
  `./assets/${1 + Math.floor(Math.random() * LANTERN_IMAGE_COUNT)}.jpg`;

function createLanternTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#ff4d4d");
  grad.addColorStop(0.5, "#e63946");
  grad.addColorStop(1, "#ffb703");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 120, 120);
  return new THREE.CanvasTexture(canvas);
}

const lanternTex = createLanternTexture();

function createLanternMesh() {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.6, 0.45, 1.4, 6);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: lanternTex,
    emissive: 0xff7700,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const capGeo = new THREE.CylinderGeometry(0.63, 0.63, 0.1, 6);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.5,
  });
  const capTop = new THREE.Mesh(capGeo, capMat);
  capTop.position.y = 0.7;
  group.add(capTop);

  const tagGeo = new THREE.PlaneGeometry(0.35, 0.7);
  const tagMat = new THREE.MeshBasicMaterial({
    color: 0xd90429,
    side: THREE.DoubleSide,
  });
  const tag = new THREE.Mesh(tagGeo, tagMat);
  tag.position.set(0, -1.1, 0);
  group.add(tag);

  const spriteMat = new THREE.SpriteMaterial({
    map: createParticleTexture(),
    color: 0xffaa00,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(spriteMat);
  glow.scale.set(3.2, 3.2, 1);
  group.add(glow);

  const hitGeo = new THREE.SphereGeometry(1.6, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  group.add(hitMesh);

  return { group, hitMesh };
}

const lanternCount = isMobile ? 24 : 38;
for (let i = 0; i < lanternCount; i++) {
  const { group: lantern, hitMesh } = createLanternMesh();

  const radius = 9 + Math.random() * 25;
  const angle = Math.random() * Math.PI * 2;
  const y = -1 + Math.random() * 30;

  lantern.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

  const wishData = wishList[Math.floor(Math.random() * wishList.length)];

  lantern.userData = {
    speedY: 0.008 + Math.random() * 0.012,
    swingSpeed: 0.8 + Math.random() * 1.2,
    initialX: lantern.position.x,
    initialZ: lantern.position.z,
    wish: wishData.text,
    imgUrl: randomLanternImage(),
    id: i,
  };

  const sc = 0.75 + Math.random() * 0.5;
  lantern.scale.set(sc, sc, sc);

  hitMesh.userData.parentLantern = lantern;

  lanternsGroup.add(lantern);
  lanterns.push(lantern);
  interactiveObjects.push(hitMesh);
}

// FALLING PETALS & STARS
// Cánh hoa rơi: cùng kiểu với hoa trên tán cây (đốm hồng mềm, cùng kích thước, cùng màu).
// Mỗi cánh tách ra từ một bông trên cây, rơi xuống và bị gió cuốn bay (cùng hướng gió với tóc).
const fallingPetalsCount = isMobile ? 160 : 360;
const ISLAND_TOP_R = 8.3; // bán kính mặt đảo (cánh hoa "đáp" xuống mặt đảo)
const TREE_BASE = new THREE.Vector3(0, 4.0, 0); // vị trí gốc cây (treeGroup)

const petalsGeo = new THREE.BufferGeometry();
const petalsPos = new Float32Array(fallingPetalsCount * 3);
const petalsCol = new Float32Array(fallingPetalsCount * 3);
petalsGeo.setAttribute("position", new THREE.BufferAttribute(petalsPos, 3));
petalsGeo.setAttribute("color", new THREE.BufferAttribute(petalsCol, 3));

const petalsMat = new THREE.PointsMaterial({
  size: blossomMat.size,
  vertexColors: true,
  map: blossomMat.map,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
});
const petalsParticles = new THREE.Points(petalsGeo, petalsMat);
scene.add(petalsParticles);

const petalsData = [];

// Tách một cánh ra từ một bông ngẫu nhiên trên tán cây (lấy luôn màu của bông đó)
function resetPetal(i, scatter) {
  const j = Math.floor(Math.random() * particleCount);
  let x = blossomPos[j * 3] + TREE_BASE.x;
  let y = blossomPos[j * 3 + 1] + TREE_BASE.y;
  let z = blossomPos[j * 3 + 2] + TREE_BASE.z;
  if (scatter) {
    // lúc mới mở trang: rải sẵn cánh đang bay dọc đường rơi
    const k = Math.random();
    y -= k * 7;
    x += k * 5;
  }
  petalsPos[i * 3] = x;
  petalsPos[i * 3 + 1] = y;
  petalsPos[i * 3 + 2] = z;
  petalsCol[i * 3] = blossomColors[j * 3];
  petalsCol[i * 3 + 1] = blossomColors[j * 3 + 1];
  petalsCol[i * 3 + 2] = blossomColors[j * 3 + 2];
  petalsData[i] = {
    fall: 0.01 + Math.random() * 0.02,
    drift: 0.7 + Math.random() * 0.6, // cánh nhẹ bị gió cuốn xa hơn
    phase: Math.random() * Math.PI * 2,
  };
}

for (let i = 0; i < fallingPetalsCount; i++) resetPetal(i, true);
petalsGeo.attributes.color.needsUpdate = true;

function updatePetals(time) {
  const gust = 0.6 + 0.4 * Math.sin(time * 0.35); // gió mạnh yếu theo đợt (giống gió làm tóc bay)
  let recolor = false;
  for (let i = 0; i < fallingPetalsCount; i++) {
    const d = petalsData[i];
    const k = i * 3;
    // rơi chậm, bay lượn, bị gió thổi sang phải và hơi ra sau
    petalsPos[k + 1] -= d.fall * (0.8 + 0.4 * Math.sin(time * 1.3 + d.phase));
    petalsPos[k] += (0.018 * gust + Math.sin(time * 0.9 + d.phase) * 0.008) * d.drift;
    petalsPos[k + 2] += (-0.004 + Math.cos(time * 0.7 + d.phase) * 0.007) * d.drift;

    const x = petalsPos[k];
    const z = petalsPos[k + 2];
    const ground = Math.hypot(x, z) < ISLAND_TOP_R ? 4.05 : -3;
    if (petalsPos[k + 1] < ground || x > 30) {
      resetPetal(i, false);
      recolor = true;
    }
  }
  petalsGeo.attributes.position.needsUpdate = true;
  if (recolor) petalsGeo.attributes.color.needsUpdate = true;
}

// Hoa rụng trên mặt đảo (cùng kiểu đốm hoa): dày nhất quanh gốc cây, thưa dần ra mép.
// Mỗi cánh được chiếu thẳng xuống để nằm đúng trên mặt đất gồ ghề / bệ đá.
const groundPetalCount = isMobile ? 600 : 1600;
{
  islandGroup.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const groundTargets = [topMesh, mainStonePlatform];
  const gPos = [];
  const gCol = [];
  // hướng gió thổi cánh hoa (khớp updatePetals: sang phải, hơi ra sau)
  const windDir = new THREE.Vector2(0.018, -0.004).normalize();
  for (let tries = 0; gPos.length / 3 < groundPetalCount && tries < groundPetalCount * 8; tries++) {
    const r = 0.35 + Math.pow(Math.random(), 1.6) * (ISLAND_TOP_R - 0.5);
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // phía cuối gió hoa rụng nhiều hơn hẳn, càng xa gốc càng lệch rõ về phía cuối gió
    const downwind = (1 + Math.cos(a) * windDir.x + Math.sin(a) * windDir.y) / 2; // 0 đầu gió .. 1 cuối gió
    const bias = Math.min(1, r / 2.5);
    const keep = (1 - bias) + bias * (0.15 + 0.85 * downwind * downwind);
    if (Math.random() > keep) continue;
    ray.set(new THREE.Vector3(x, 20, z), down);
    const hit = ray.intersectObjects(groundTargets, false)[0];
    if (!hit) continue;
    gPos.push(x, hit.point.y + 0.05, z);
    const j = Math.floor(Math.random() * particleCount);
    const dim = 0.8 + Math.random() * 0.15; // hoa rụng hơi sẫm hơn hoa trên cây
    gCol.push(blossomColors[j * 3] * dim, blossomColors[j * 3 + 1] * dim, blossomColors[j * 3 + 2] * dim);
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute("position", new THREE.Float32BufferAttribute(gPos, 3));
  gGeo.setAttribute("color", new THREE.Float32BufferAttribute(gCol, 3));
  const groundPetals = new THREE.Points(
    gGeo,
    new THREE.PointsMaterial({
      size: blossomMat.size * 0.9,
      vertexColors: true,
      map: blossomMat.map,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  islandGroup.add(groundPetals); // lắc lư cùng hòn đảo
}

const starCount = isMobile ? 400 : 900;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 180;
  starPos[i * 3 + 1] = 15 + Math.random() * 90; // sao ở trên trời, không lơ lửng sát mặt đất
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 180;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.4,
  transparent: true,
  opacity: 0.7,
});
scene.add(new THREE.Points(starGeo, starMat));

// MẶT TRĂNG: treo cao ở xa phía sau cây, có quầng sáng, không bị sương mù che
// Vân mặt trăng: các "biển" tối loang lổ, miệng hố có vành sáng, hạt lấm tấm.
// Vẽ theo kiểu trải phẳng (rộng gấp đôi cao) để bọc quanh quả cầu.
function createMoonTexture() {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const blob = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // nền sáng vàng kem, hơi loang
  ctx.fillStyle = "#f4ead0";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    blob(rnd() * W, rnd() * H, 20 + rnd() * 60, rnd() < 0.5 ? "rgba(255,250,232,0.18)" : "rgba(214,202,172,0.14)");
  }

  // "biển" mặt trăng: các mảng tối lớn, mép loang lổ (ghép từ nhiều vệt tròn mờ)
  const maria = [[300, 180, 120], [420, 250, 90], [250, 300, 80], [560, 200, 70], [700, 280, 110], [820, 170, 60], [150, 220, 55]];
  maria.forEach(([cx, cy, r]) => {
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r;
      blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * (0.25 + rnd() * 0.35), "rgba(150,142,124,0.16)");
    }
  });

  // miệng hố: lòng tối, vành sáng lệch về phía có ánh sáng
  const crater = (x, y, r) => {
    blob(x, y, r * 1.35, "rgba(255,252,238,0.35)"); // vệt văng sáng quanh hố
    ctx.fillStyle = "rgba(160,150,128,0.55)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,250,235,0.7)";
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.strokeStyle = "rgba(110,100,86,0.45)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, Math.PI * 1.95, Math.PI * 0.85);
    ctx.stroke();
  };
  for (let i = 0; i < 26; i++) crater(rnd() * W, 60 + rnd() * (H - 120), 8 + rnd() * 20);
  for (let i = 0; i < 140; i++) crater(rnd() * W, 30 + rnd() * (H - 60), 2 + rnd() * 6);

  // hạt lấm tấm
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(120,110,95,0.18)" : "rgba(255,255,245,0.2)";
    ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }
  return new THREE.CanvasTexture(canvas);
}

const MOON_POS = new THREE.Vector3(-70, 95, -230);
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(14, 48, 32),
  new THREE.MeshBasicMaterial({ map: createMoonTexture(), color: 0xfff3d0, fog: false }),
);
moon.position.copy(MOON_POS);
moon.rotation.y = -0.6;
scene.add(moon);

const moonGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: createParticleTexture(),
    color: 0xfff0c8,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }),
);
moonGlow.scale.set(90, 90, 1);
moonGlow.position.copy(MOON_POS);
scene.add(moonGlow);

// ánh trăng xanh nhạt chiếu xuống cảnh và mặt đất
const moonLight = new THREE.DirectionalLight(0xaebfff, 0.55);
moonLight.position.copy(MOON_POS);
scene.add(moonLight);

// MÂY CAO MỎNG: các dải mây mờ kéo dài trên cao, được trăng rọi, trôi chậm theo gió
function createCloudTexture(seed) {
  const W = 512;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  // nhiều vệt mờ dẹt chồng lên nhau -> mây sợi mỏng, mép tan dần
  for (let i = 0; i < 90; i++) {
    const cx = W * (0.12 + rnd() * 0.76);
    const cy = H * (0.5 + (rnd() - 0.5) * 0.35 * Math.sin((cx / W) * Math.PI));
    const rx = 40 + rnd() * 110;
    const ry = 6 + rnd() * 18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(255,255,255,${0.1 + rnd() * 0.12})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}

const clouds = [];
{
  const textures = [11, 29, 47].map(createCloudTexture);
  const COUNT = isMobile ? 10 : 18;
  for (let i = 0; i < COUNT; i++) {
    const mat = new THREE.SpriteMaterial({
      map: textures[i % textures.length],
      color: 0xb8c4e6, // trắng xám hơi xanh dưới ánh trăng
      transparent: true,
      opacity: 0.22 + Math.random() * 0.18,
      depthWrite: false,
      fog: false,
    });
    const cloud = new THREE.Sprite(mat);
    const w = 90 + Math.random() * 110;
    cloud.scale.set(w, w * (0.22 + Math.random() * 0.12), 1);
    // mây bay vòng tròn quanh cảnh: mỗi đám một bán kính, góc, độ cao riêng
    cloud.userData = {
      angle: Math.random() * Math.PI * 2,
      radius: 110 + Math.random() * 150,
      speed: randomCloudSpeed(),
      target: randomCloudSpeed(),
      nextChange: Math.random(), // lệch pha để các đám không đổi tốc cùng lúc
    };
    cloud.position.y = 60 + Math.random() * 55;
    placeCloud(cloud);
    scene.add(cloud);
    clouds.push(cloud);
  }
}

// tốc độ quay (radian/giây) ngẫu nhiên, mỗi đám một khác
function randomCloudSpeed() {
  return 0.004 + Math.random() * 0.018;
}

function placeCloud(c) {
  const d = c.userData;
  c.position.x = Math.cos(d.angle) * d.radius;
  c.position.z = Math.sin(d.angle) * d.radius;
}

function updateClouds(time, delta) {
  clouds.forEach((c) => {
    const d = c.userData;
    // mỗi giây chọn tốc độ mới ngẫu nhiên cho từng đám
    if (time >= d.nextChange) {
      d.target = randomCloudSpeed();
      d.nextChange = time + 1;
    }
    // chuyển tốc độ mượt (không giật) về tốc độ mới
    d.speed += (d.target - d.speed) * Math.min(1, delta * 1.5);
    d.angle += d.speed * delta;
    placeCloud(c);
  });
}

// MẶT ĐẤT BÊN DƯỚI: đồi núi, sông uốn lượn, đường đất, ruộng lúa, làng nhà mái rơm
const GROUND_Y = -46; // hòn đảo lơ lửng cao phía trên thung lũng (gấp đôi trước: -24)
const GROUND_SIZE = 560;
const GROUND_SEG = isMobile ? 110 : 180;

// đường cong trên mặt phẳng (x, z) -> dãy điểm để đo khoảng cách
function samplePath(points, n) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  return curve.getSpacedPoints(n).map((p) => [p.x, p.z]);
}
function distToPath(path, x, z) {
  let best = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dx = path[i][0] - x;
    const dz = path[i][1] - z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

const RIVER = samplePath([[-290, -60], [-190, -20], [-110, 30], [-40, 18], [20, -12], [80, -40], [160, -20], [290, 40]], 260);
const ROAD = samplePath([[-230, 150], [-120, 90], [-55, 55], [-20, -10], [30, -80], [70, -150], [120, -250]], 220);
const VILLAGES = [
  { x: -70, z: 58, r: 18, n: 14 },
  { x: 38, z: -82, r: 16, n: 12 },
  { x: -150, z: 5, r: 14, n: 9 },
  { x: 110, z: 10, r: 13, n: 8 },
];
const RIVER_W = 7; // nửa bề rộng lòng sông
const RIVER_BED = -4.6; // đáy sông (khoét sâu)
// Dãy đồi phủ kín cây hoa anh đào: dãy đồi phía sau hòn đảo (hướng -z, phía mặt trăng).
// angle: hướng tính từ tâm đảo (0 = phải, PI = trái, -PI/2 = phía sau), spread: nửa góc toả;
// rMin..rMax: khoảng cách tới tâm; hMin..hMax: chỉ phủ phần đồi nhô lên, chừa núi cao.
const CHERRY_RIDGES = [
  // dãy đồi phía sau hòn đảo (nhìn từ góc camera lúc mở trang), trải từ sau-trái qua sau-phải
  { angle: -Math.PI / 2, spread: 1.2, rMin: 70, rMax: 175, hMin: 1.8, hMax: 16 },
];
const CHERRY_R_MAX = Math.max(...CHERRY_RIDGES.map((R) => R.rMax));
// 1 trong vùng dãy đồi, giảm dần ra mép (theo góc, khoảng cách và độ cao)
function cherryHillMask(x, z, h) {
  const r = Math.hypot(x, z);
  const hh = h === undefined ? naturalHeight(x, z) : h;
  let best = 0;
  CHERRY_RIDGES.forEach((R) => {
    let da = Math.abs(Math.atan2(z, x) - R.angle);
    if (da > Math.PI) da = Math.PI * 2 - da;
    const kAngle = smooth01((R.spread - da) / 0.15);
    const kR = smooth01((r - R.rMin) / 10) * smooth01((R.rMax - r) / 10);
    const kH = smooth01((hh - R.hMin) / 1.2) * smooth01((R.hMax - hh) / 3);
    best = Math.max(best, kAngle * kR * kH);
  });
  return best;
}
const WATER_Y = -2.6; // mặt nước: thấp hẳn xuống dưới mép bờ
const ROAD_W = 2.2;

const smooth01 = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// độ cao tự nhiên: đồi thấp ở giữa, núi cao dần ra xa
function naturalHeight(x, z) {
  const hills =
    Math.sin(x * 0.03) * Math.cos(z * 0.027) * 3 +
    Math.sin((x + z) * 0.051) * 1.6 +
    Math.cos(x * 0.11 - z * 0.07) * 0.6;
  const r = Math.hypot(x, z);
  const ridge = 1 - Math.abs(Math.sin(x * 0.021 + Math.cos(z * 0.017) * 2) * Math.cos(z * 0.019 - x * 0.006));
  const peaks = Math.pow(ridge, 2) * 34 + Math.abs(Math.sin(x * 0.043) * Math.sin(z * 0.047)) * 14;
  return hills + smooth01((r - 115) / 90) * peaks;
}

function groundHeight(x, z) {
  let h = naturalHeight(x, z);
  // san phẳng làng và ruộng quanh làng
  VILLAGES.forEach((v) => {
    const k = smooth01(1 - (Math.hypot(x - v.x, z - v.z) - v.r) / 25);
    h += (0.4 - h) * k;
  });
  // đường đất hơi phẳng
  const dRoad = distToPath(ROAD, x, z);
  h += (Math.min(h, 1) - h) * smooth01(1 - (dRoad - ROAD_W) / 6);
  // bờ sông đắp cao hơn mặt nước (vùng trũng quanh sông không bị ngập)
  const dRiver = distToPath(RIVER, x, z);
  if (dRiver < RIVER_W + 45) {
    const levee = WATER_Y + 1.8;
    h += (Math.max(h, levee) - h) * smooth01(1 - (dRiver - RIVER_W - 25) / 20);
  }
  // lòng sông khoét xuống
  h += (RIVER_BED - h) * smooth01(1 - (dRiver - RIVER_W) / 10);
  return h;
}

// dùng chung để đặt nhà trên mặt đất
const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEG, GROUND_SEG);
groundGeo.rotateX(-Math.PI / 2);
{
  const p = groundGeo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const cGrass = new THREE.Color(0x24462a);
  const cGrass2 = new THREE.Color(0x2f5a2c);
  const cPaddy = new THREE.Color(0x5b7a2a);
  const cPaddy2 = new THREE.Color(0x3f6a3a);
  const cRock = new THREE.Color(0x3b3f4c);
  const cSnow = new THREE.Color(0x9aa3b5);
  const cRoad = new THREE.Color(0x7a5a38);
  const cBank = new THREE.Color(0x4a3b2a);
  const cCherryShade = new THREE.Color(0x4a2436);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const h = groundHeight(x, z);
    p.setY(i, h);

    // màu: cỏ -> đá núi -> đỉnh sáng dưới trăng
    c.copy(cGrass).lerp(cGrass2, 0.5 + 0.5 * Math.sin(x * 0.07) * Math.cos(z * 0.06));
    c.lerp(cRock, smooth01((h - 6) / 10));
    c.lerp(cSnow, smooth01((h - 24) / 10));
    // mặt đất dưới rừng hoa anh đào trên đồi: hồng sẫm (khe giữa các tán cây không lộ đất xanh)
    c.lerp(cCherryShade, 0.7 * cherryHillMask(x, z, h));
    // ruộng lúa ô bàn cờ quanh làng
    VILLAGES.forEach((v) => {
      const d = Math.hypot(x - v.x, z - v.z);
      if (d > v.r && d < v.r + 28) {
        const cell = (Math.floor(x / 7) + Math.floor(z / 7)) & 1;
        c.lerp(cell ? cPaddy : cPaddy2, 0.85 * smooth01((v.r + 28 - d) / 8));
      }
    });
    const dRoad = distToPath(ROAD, x, z);
    c.lerp(cRoad, smooth01(1 - (dRoad - ROAD_W) / 1.5));
    const dRiver = distToPath(RIVER, x, z);
    c.lerp(cBank, smooth01(1 - (dRiver - RIVER_W) / 4) * 0.7);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
}
const groundMesh = new THREE.Mesh(
  groundGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }),
);
groundMesh.position.y = GROUND_Y;
scene.add(groundMesh);

// CÔNG CỤ TẠM: nhấp đúp chuột lên mặt đất để xem toạ độ điểm đó (dùng để chọn đồi trồng hoa anh đào).
// Xoá khối này khi đã chọn xong.
{
  const toast = document.createElement("div");
  toast.style.cssText =
    "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:999;padding:10px 16px;" +
    "border-radius:12px;background:rgba(20,10,30,.85);color:#ffd700;font:600 16px Quicksand,sans-serif;" +
    "border:1px solid rgba(255,215,0,.5);pointer-events:none;display:none";
  document.body.appendChild(toast);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  window.addEventListener("dblclick", (e) => {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(groundMesh, false)[0];
    if (!hit) return;
    toast.textContent = `Toạ độ đồi: x = ${Math.round(hit.point.x)}, z = ${Math.round(hit.point.z)}`;
    toast.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toast.style.display = "none"), 8000);
  });
}

// Mặt sông: dải nước nằm thấp trong lòng sông, gợn sóng lăn tăn chạy theo dòng,
// ánh trăng lấp lánh trên sóng. Sóng tính trong shader nên không tốn công mỗi khung hình.
const WATER_TIME = { value: 0 };
{
  const ACROSS = 8; // số ô theo bề ngang sông (để sóng hiện rõ)
  const pts = [];
  const idx = [];
  for (let i = 0; i < RIVER.length; i++) {
    const [x, z] = RIVER[i];
    const [x2, z2] = RIVER[Math.min(i + 1, RIVER.length - 1)];
    const [x0, z0] = RIVER[Math.max(i - 1, 0)];
    let tx = x2 - x0;
    let tz = z2 - z0;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const w = RIVER_W + 7; // mép nước lấn vào bờ, bị bờ đất che (không lộ mép dải nước)
    for (let j = 0; j <= ACROSS; j++) {
      const s = (j / ACROSS) * 2 - 1;
      pts.push(x - tz * w * s, WATER_Y, z + tx * w * s);
    }
    if (i > 0) {
      const a = (i - 1) * (ACROSS + 1);
      const b = i * (ACROSS + 1);
      for (let j = 0; j < ACROSS; j++) idx.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1);
    }
  }
  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  riverGeo.setIndex(idx);
  riverGeo.computeVertexNormals();

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1d3a66,
    emissive: 0x0b1a33,
    roughness: 0.12,
    metalness: 0.45,
    side: THREE.DoubleSide,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = WATER_TIME;
    const waveFn = `
      uniform float uTime;
      float riverWave(vec2 p) {
        return 0.10 * sin(dot(p, vec2(0.55, 0.20)) + uTime * 1.6)
             + 0.07 * sin(dot(p, vec2(-0.30, 0.75)) + uTime * 2.1)
             + 0.04 * sin(dot(p, vec2(1.30, -0.90)) + uTime * 3.3);
      }`;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + waveFn)
      // pháp tuyến theo độ dốc của sóng -> ánh trăng lấp lánh trên gợn nước
      .replace(
        "#include <beginnormal_vertex>",
        `float e = 0.15;
        float dwx = (riverWave(position.xz + vec2(e, 0.0)) - riverWave(position.xz - vec2(e, 0.0))) / (2.0 * e);
        float dwz = (riverWave(position.xz + vec2(0.0, e)) - riverWave(position.xz - vec2(0.0, e))) / (2.0 * e);
        vec3 objectNormal = normalize(vec3(-dwx, 1.0, -dwz));`,
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += riverWave(position.xz);\nvRiverXZ = position.xz;")
      .replace("#include <common>", "#include <common>\nvarying vec2 vRiverXZ;");

    // Vân sóng nhỏ trên mặt nước (tính từng điểm ảnh): nghiêng pháp tuyến theo gợn sóng
    // + ngấn sóng sáng lấp lánh, nhìn từ xa vẫn thấy rõ vân nước chạy theo dòng.
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying vec2 vRiverXZ;")
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        vec2 rp = vRiverXZ;
        vec2 k1 = vec2(1.7, 0.6), k2 = vec2(-0.9, 1.9), k3 = vec2(2.6, -1.4), k4 = vec2(0.4, 3.2);
        float a1 = dot(rp, k1) + uTime * 2.4;
        float a2 = dot(rp, k2) + uTime * 3.1;
        float a3 = dot(rp, k3) + uTime * 4.0;
        float a4 = dot(rp, k4) + uTime * 2.7;
        vec2 grad = k1 * cos(a1) * 0.45 + k2 * cos(a2) * 0.35 + k3 * cos(a3) * 0.2 + k4 * cos(a4) * 0.15;
        normal = normalize(normal + (viewMatrix * vec4(-grad.x * 0.18, 0.0, -grad.y * 0.18, 0.0)).xyz);
        float ripple = (sin(a1) * 0.45 + sin(a2) * 0.35 + sin(a3) * 0.2 + sin(a4) * 0.15) / 1.15;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // ngấn sóng sáng xanh bạc
        totalEmissiveRadiance += vec3(0.10, 0.18, 0.32) * smoothstep(0.35, 0.95, ripple);`,
      );
  };

  const river = new THREE.Mesh(riverGeo, waterMat);
  river.position.y = GROUND_Y;
  scene.add(river);
}

// Làng: nhà vách đất, mái rơm hình chóp, cửa sổ sáng đèn vàng ấm
{
  const houses = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  VILLAGES.forEach((v) => {
    for (let k = 0, tries = 0; k < v.n && tries < 200; tries++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * v.r;
      const x = v.x + Math.cos(a) * r;
      const z = v.z + Math.sin(a) * r;
      if (distToPath(RIVER, x, z) < RIVER_W + 6) continue; // không xây trên sông
      if (distToPath(ROAD, x, z) < ROAD_W + 3) continue; // chừa đường đi
      if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 7)) continue; // không chồng lên nhau
      if (Math.hypot(x - v.x, z - v.z) < 9) continue; // chừa sân giữa làng cho hội lửa trại
      houses.push({ x, z, y: groundHeight(x, z), rot: rand() * Math.PI, s: 0.85 + rand() * 0.4 });
      k++;
    }
  });

  const wallGeo = new THREE.BoxGeometry(4, 2.2, 3);
  wallGeo.translate(0, 1.1, 0);
  const roofGeo = new THREE.ConeGeometry(3.3, 2.4, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.scale(1.25, 1, 0.95);
  roofGeo.translate(0, 2.2 + 1.2, 0);
  const walls = new THREE.InstancedMesh(
    wallGeo,
    new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.95 }),
    houses.length,
  );
  const roofs = new THREE.InstancedMesh(
    roofGeo,
    new THREE.MeshStandardMaterial({ color: 0xc9a45a, roughness: 1, flatShading: true }),
    houses.length,
  );
  const dummy = new THREE.Object3D();
  const lightPos = [];
  houses.forEach((h, i) => {
    dummy.position.set(h.x, GROUND_Y + h.y, h.z);
    dummy.rotation.set(0, h.rot, 0);
    dummy.scale.setScalar(h.s);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
    roofs.setMatrixAt(i, dummy.matrix);
    // ô cửa sáng đèn ở mặt trước nhà
    const fx = Math.sin(h.rot) * 1.55 * h.s;
    const fz = Math.cos(h.rot) * 1.55 * h.s;
    lightPos.push(h.x + fx, GROUND_Y + h.y + 1.1 * h.s, h.z + fz);
  });
  scene.add(walls);
  scene.add(roofs);

  const windowGlow = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lightPos, 3)),
    new THREE.PointsMaterial({
      size: 2.2,
      map: createParticleTexture(),
      color: 0xffc46b,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(windowGlow);
}

// Cầu gỗ cong vồng qua sông, đặt đúng chỗ đường đất cắt ngang dòng sông
{
  // chỗ đường gần sông nhất = chỗ đường băng qua sông
  let best = { d: Infinity, i: 0 };
  ROAD.forEach(([x, z], i) => {
    const d = distToPath(RIVER, x, z);
    if (d < best.d) best = { d, i };
  });
  const [cx, cz] = ROAD[best.i];
  const [ax, az] = ROAD[Math.max(0, best.i - 2)];
  const [bx, bz] = ROAD[Math.min(ROAD.length - 1, best.i + 2)];
  const dir = new THREE.Vector3(bx - ax, 0, bz - az).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);

  // Đi từ giữa sông ra hai phía tới chỗ đất khô hẳn (cao hơn mặt nước), rồi gác thêm vào bờ 3 đơn vị
  const groundAlong = (s) => groundHeight(cx + dir.x * s, cz + dir.z * s);
  const reachLand = (sign) => {
    let s = RIVER_W;
    while (s < 60 && (groundAlong(sign * s) < WATER_Y + 1.0 || s < RIVER_W + 4)) s += 0.5;
    return s + 3;
  };
  const dA = reachLand(-1);
  const dB = reachLand(1);
  const endA = groundAlong(-dA);
  const endB = groundAlong(dB);
  const DECK_T = 0.35;
  const sAt = (t) => -dA + (dA + dB) * t; // vị trí dọc cầu
  // hai đầu cầu nằm sát mặt đất; giữa cầu vồng lên đủ cao để cách mặt nước (kể cả khi có sóng)
  const linMid = (endA + endB) / 2;
  const arch = Math.max(2.5, WATER_Y + 2.2 - linMid);
  const deckY = (t) => {
    const lin = endA + (endB - endA) * t + DECK_T / 2;
    // không bao giờ chìm xuống đất ở đoạn trên bờ
    return Math.max(lin + arch * Math.sin(Math.PI * t), groundAlong(sAt(t)) + DECK_T / 2);
  };
  const at = (t) => new THREE.Vector3(cx + dir.x * sAt(t), GROUND_Y + deckY(t), cz + dir.z * sAt(t));

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 });
  const bridge = new THREE.Group();
  const SEG = 24;
  const plank = new THREE.BoxGeometry(1, DECK_T, 4.2);
  const post = new THREE.BoxGeometry(0.25, 1.3, 0.25);
  const rail = new THREE.BoxGeometry(1, 0.18, 0.18);
  for (let i = 0; i < SEG; i++) {
    const p0 = at(i / SEG);
    const p1 = at((i + 1) / SEG);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1);
    const yaw = Math.atan2(-dir.z, dir.x);
    const pitch = Math.atan2(p1.y - p0.y, Math.hypot(p1.x - p0.x, p1.z - p0.z));
    // mặt cầu
    const deck = new THREE.Mesh(plank, wood);
    deck.position.copy(mid);
    deck.rotation.set(0, yaw, pitch, "YZX");
    deck.scale.x = len + 0.05;
    bridge.add(deck);
    // lan can hai bên: cột + tay vịn
    [-1, 1].forEach((s) => {
      const off = side.clone().multiplyScalar(s * 1.95);
      const pp = new THREE.Mesh(post, wood);
      pp.position.copy(p0).add(off).add(new THREE.Vector3(0, 0.75, 0));
      bridge.add(pp);
      const rr = new THREE.Mesh(rail, wood);
      rr.position.copy(mid).add(off).add(new THREE.Vector3(0, 1.35, 0));
      rr.rotation.set(0, yaw, pitch, "YZX");
      rr.scale.x = len + 0.05;
      bridge.add(rr);
    });
  }
  // mố cầu bằng đá ở hai đầu: đỡ đầu cầu, cắm xuống đất nên không còn khe hở
  const stone = new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: 1, flatShading: true });
  [0, 1].forEach((t) => {
    const p = at(t);
    const gy = GROUND_Y + groundAlong(sAt(t));
    const hgt = p.y - gy + 1.2;
    const abut = new THREE.Mesh(new THREE.BoxGeometry(3.2, hgt, 5), stone);
    abut.position.set(p.x, gy - 1.2 + hgt / 2 - DECK_T / 2, p.z);
    abut.rotation.y = Math.atan2(-dir.z, dir.x);
    bridge.add(abut);
  });

  // chân cầu cắm xuống lòng sông (chỉ ở đoạn trên mặt nước)
  const waterT = (s) => (s + dA) / (dA + dB);
  [-0.6, 0, 0.6].map((k) => waterT(k * RIVER_W)).forEach((t) => {
    const p = at(t);
    [-1, 1].forEach((s) => {
      const bedY = GROUND_Y + RIVER_BED;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, p.y - bedY, 8), wood);
      leg.position.copy(p).add(side.clone().multiplyScalar(s * 1.6));
      leg.position.y = (p.y + bedY) / 2;
      bridge.add(leg);
    });
  });
  scene.add(mergeByMaterial(bridge)); // gộp ~90 mảnh gỗ thành 1 lần vẽ
}

// Cây cối trên mặt đất: rừng cây rải khắp thung lũng và chân núi,
// tránh sông, đường, làng, ruộng và đỉnh núi cao. Vẽ gộp (instanced) nên nhẹ.
{
  const TREE_COUNT = isMobile ? 280 : 750;
  let seed = 23;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Hoa anh đào: phủ kín đồi CHERRY_HILL (trồng riêng bên dưới), các nơi khác chỉ lác đác
  const PLAIN_CHERRY = 0.08; // tỉ lệ cây anh đào lẻ loi ở nơi khác
  const isCherryTree = () => rnd() < PLAIN_CHERRY;

  const spots = [];
  for (let tries = 0; spots.length < TREE_COUNT && tries < TREE_COUNT * 12; tries++) {
    const x = (rnd() - 0.5) * (GROUND_SIZE - 40);
    const z = (rnd() - 0.5) * (GROUND_SIZE - 40);
    if (Math.hypot(x, z) < 25) continue; // ngay dưới hòn đảo
    // rừng mọc thành từng mảng
    const forest = Math.sin(x * 0.02 + 1.3) * Math.cos(z * 0.024) + Math.sin((x - z) * 0.013) * 0.6;
    if (rnd() > 0.25 + 0.75 * smooth01(forest + 0.3)) continue;
    if (distToPath(RIVER, x, z) < RIVER_W + 5) continue;
    if (distToPath(ROAD, x, z) < ROAD_W + 2.5) continue;
    if (VILLAGES.some((v) => Math.hypot(x - v.x, z - v.z) < v.r + 26)) continue; // làng + ruộng
    if (cherryHillMask(x, z) > 0.1) continue; // đồi anh đào trồng riêng bên dưới
    const h = groundHeight(x, z);
    if (h > 20) continue; // đỉnh núi trọc
    spots.push({ x, z, h, s: 0.8 + rnd() * 0.9, rot: rnd() * Math.PI * 2, tone: rnd(), cherry: isCherryTree() });
  }

  // Rừng rậm phủ kín vài ngọn đồi thấp: tìm các đỉnh đồi nổi lên giữa thung lũng
  // (tránh sông, đường, làng), rồi trồng cây dày đặc phủ kín cả đồi.
  const blocked = (x, z) =>
    distToPath(RIVER, x, z) < RIVER_W + 5 ||
    distToPath(ROAD, x, z) < ROAD_W + 2.5 ||
    VILLAGES.some((v) => Math.hypot(x - v.x, z - v.z) < v.r + 20);
  const hillCandidates = [];
  for (let x = -150; x <= 150; x += 6) {
    for (let z = -150; z <= 150; z += 6) {
      const r = Math.hypot(x, z);
      if (r < 40 || r > 140 || blocked(x, z)) continue;
      const h = groundHeight(x, z);
      if (h < 1.5 || h > 9) continue; // đồi thấp, không phải núi
      // đỉnh đồi: cao hơn xung quanh
      const around = [[12, 0], [-12, 0], [0, 12], [0, -12]].map(([dx, dz]) => groundHeight(x + dx, z + dz));
      if (around.every((a) => a < h)) hillCandidates.push({ x, z, h });
    }
  }
  hillCandidates.sort((a, b) => b.h - a.h);
  const hills = [];
  hillCandidates.forEach((c) => {
    if (cherryHillMask(c.x, c.z, c.h) > 0.05) return; // nằm trong dãy đồi anh đào
    if (hills.length < (isMobile ? 3 : 6) && hills.every((o) => Math.hypot(o.x - c.x, o.z - c.z) > 45)) hills.push(c);
  });
  const PER_HILL = isMobile ? 70 : 150;
  hills.forEach((hill) => {
    const hillTrees = [];
    for (let tries = 0; hillTrees.length < PER_HILL && tries < PER_HILL * 20; tries++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 18;
      const x = hill.x + Math.cos(a) * r;
      const z = hill.z + Math.sin(a) * r;
      const h = groundHeight(x, z);
      if (h < hill.h - 4 || blocked(x, z)) continue; // chỉ phủ phần đồi nhô lên
      if (hillTrees.some((o) => Math.hypot(o.x - x, o.z - z) < 2.3)) continue; // dày nhưng không chồng
      const t = { x, z, h, s: 0.85 + rnd() * 0.45, rot: rnd() * Math.PI * 2, tone: rnd(), cherry: isCherryTree() };
      hillTrees.push(t);
      spots.push(t);
    }
  });

  // DÃY ĐỒI ANH ĐÀO: trồng dày đặc cây hoa anh đào (thân + chùm hoa) phủ kín dãy đồi phía sau đảo.
  // Trồng theo lưới có xê dịch ngẫu nhiên; tán to chồng lên nhau để không lộ đất.
  {
    const SP = isMobile ? 3.6 : 2.6; // khoảng cách giữa các cây
    for (let gx = -CHERRY_R_MAX; gx <= CHERRY_R_MAX; gx += SP) {
      for (let gz = -CHERRY_R_MAX; gz <= CHERRY_R_MAX; gz += SP) {
        if (Math.hypot(gx, gz) < 60) continue; // bỏ qua nhanh vùng giữa
        const x = gx + (rnd() - 0.5) * SP * 0.8;
        const z = gz + (rnd() - 0.5) * SP * 0.8;
        if (cherryHillMask(x, z) < 0.3) continue; // lọc nhanh bằng độ cao tự nhiên
        const h = groundHeight(x, z);
        if (rnd() > cherryHillMask(x, z, h)) continue; // mép dãy đồi thưa dần
        if (blocked(x, z)) continue;
        spots.push({ x, z, h, s: 1.0 + rnd() * 0.5, rot: rnd() * Math.PI * 2, tone: rnd(), cherry: true });
      }
    }
  }

  // Cây ở xa nhỏ dần (càng ra rìa núi xa càng nhỏ) -> có chiều sâu, đúng tỉ lệ với núi
  spots.forEach((t) => {
    t.s *= 1 - 0.55 * smooth01((Math.hypot(t.x, t.z) - 50) / 190);
  });

  const green = spots.filter((t) => !t.cherry);
  const cherry = spots.filter((t) => t.cherry);

  const trunkGeoG = new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6);
  trunkGeoG.translate(0, 1.1, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.7, 0);
  crownGeo.scale(1, 1.35, 1);
  crownGeo.translate(0, 2.2 + 1.6, 0);

  const trunks = new THREE.InstancedMesh(trunkGeoG, new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 1 }), spots.length);
  const crowns = new THREE.InstancedMesh(
    crownGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
    green.length,
  );

  const dummy = new THREE.Object3D();
  const greens = [0x1f4a26, 0x28582c, 0x2f6233, 0x1a3f24, 0x3a6b2e];
  const color = new THREE.Color();
  const place = (t) => {
    dummy.position.set(t.x, GROUND_Y + t.h - 0.2, t.z);
    dummy.rotation.set(0, t.rot, 0);
    dummy.scale.set(t.s, t.s * (0.9 + t.tone * 0.4), t.s);
    dummy.updateMatrix();
    return dummy.matrix;
  };
  spots.forEach((t, i) => trunks.setMatrixAt(i, place(t)));
  green.forEach((t, i) => {
    crowns.setMatrixAt(i, place(t));
    // cây ở trên cao (chân núi) tối và xanh lạnh hơn
    color.setHex(greens[Math.floor(t.tone * greens.length)]).multiplyScalar(1 - smooth01((t.h - 6) / 14) * 0.35);
    crowns.setColorAt(i, color);
  });
  crowns.instanceColor.needsUpdate = true;
  scene.add(trunks, crowns);

  // Tán hoa anh đào = chùm chấm hồng mềm (cùng kiểu, cùng màu với hoa trên cây lớn giữa đảo)
  const DOTS = isMobile ? 45 : 90; // số chấm mỗi cây (chùm dày)
  const cPos = new Float32Array(cherry.length * DOTS * 3);
  const cCol = new Float32Array(cherry.length * DOTS * 3);
  const palette = [colorDustyPink, colorSoftPink, colorPaleRose, colorSoftWhite];
  let k = 0;
  cherry.forEach((t) => {
    const cy = GROUND_Y + t.h - 0.2 + (2.2 + 1.3) * t.s; // tâm tán, trên ngọn thân
    for (let d = 0; d < DOTS; d++, k++) {
      // rải trong khối tán hình elip dẹt, dày ở giữa
      const r = Math.pow(Math.random(), 0.6) * 3.0 * t.s; // chùm to hơn
      const a = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      cPos[k * 3] = t.x + r * Math.sin(phi) * Math.cos(a) * 1.15;
      cPos[k * 3 + 1] = cy + r * Math.cos(phi) * 0.8;
      cPos[k * 3 + 2] = t.z + r * Math.sin(phi) * Math.sin(a) * 1.15;
      const c = palette[Math.floor(Math.random() * palette.length)];
      cCol[k * 3] = c.r;
      cCol[k * 3 + 1] = c.g;
      cCol[k * 3 + 2] = c.b;
    }
  });
  const cherryGeoDots = new THREE.BufferGeometry();
  cherryGeoDots.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
  cherryGeoDots.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
  const cherryDots = new THREE.Points(
    cherryGeoDots,
    new THREE.PointsMaterial({
      size: 1.6, // cây ở xa (dưới thung lũng) nên chấm to hơn chấm trên cây lớn
      vertexColors: true,
      map: blossomMat.map,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  scene.add(cherryDots);
}

// HỘI LỬA TRẠI Ở LÀNG: đống lửa giữa sân làng (củi, lửa bập bùng, tàn lửa bay),
// dân làng áo nhiều màu đội nón lá đứng vòng quanh, nhún nhảy và đi vòng theo điệu múa.
const festival = { fires: [], villagers: null, people: [], sparks: null, sparkData: [], light: null };
{
  const fireTex = createParticleTexture();
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 1 });
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff8a2a,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flameCoreMat = flameMat.clone();
  flameCoreMat.color.set(0xffe08a);

  const logs = new THREE.Group();
  VILLAGES.forEach((v, vi) => {
    const gy = GROUND_Y + groundHeight(v.x, v.z);
    // củi xếp chụm hình nón
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 6), logMat);
      log.position.set(v.x + Math.cos(a) * 0.45, gy + 0.55, v.z + Math.sin(a) * 0.45);
      log.rotation.set(-Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9); // ngọn củi chụm vào giữa
      logs.add(log);
    }
    // ngọn lửa: 2 lớp nón (ngoài cam, trong vàng) + quầng sáng
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 10, 1, true), flameMat);
    flame.position.set(v.x, gy + 1.5, v.z);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.7, 10, 1, true), flameCoreMat);
    core.position.set(v.x, gy + 1.1, v.z);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: fireTex, color: 0xff9a40, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.position.set(v.x, gy + 1.6, v.z);
    glow.scale.set(9, 9, 1);
    scene.add(flame, core, glow);
    festival.fires.push({ flame, core, glow, phase: vi * 1.7, x: v.x, z: v.z, gy });

    // dân làng đứng vòng quanh lửa
    const n = 8 + (vi === 0 ? 4 : 0);
    for (let k = 0; k < n; k++) {
      festival.people.push({
        cx: v.x,
        cz: v.z,
        gy,
        r: 4.2 + (k % 2) * 1.3,
        a0: (k / n) * Math.PI * 2,
        speed: 0.12 + (vi % 2) * 0.05,
        phase: Math.random() * Math.PI * 2,
        s: 0.85 + Math.random() * 0.3,
        hat: Math.random() < 0.7,
      });
    }
  });
  scene.add(mergeByMaterial(logs));

  // một đèn thật ở làng chính (máy tính) cho ánh lửa hắt lên nhà cửa, mặt đất
  if (!isMobile) {
    const f = festival.fires[0];
    festival.light = new THREE.PointLight(0xff8a3a, 2.2, 45, 1.6);
    festival.light.position.set(f.x, f.gy + 3, f.z);
    scene.add(festival.light);
  }

  // dân làng: thân (áo), đầu, nón lá — vẽ gộp theo kiểu instanced
  const N = festival.people.length;
  const bodyGeo = new THREE.CylinderGeometry(0.32, 0.48, 1.3, 8);
  bodyGeo.translate(0, 0.65, 0);
  const headGeo = new THREE.SphereGeometry(0.27, 10, 8);
  headGeo.translate(0, 1.58, 0);
  const hatGeo = new THREE.ConeGeometry(0.62, 0.36, 14);
  hatGeo.translate(0, 1.92, 0);
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), N);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xe0b48f, roughness: 0.8 }), N);
  const hats = new THREE.InstancedMesh(hatGeo, new THREE.MeshStandardMaterial({ color: 0xd9c08a, roughness: 1 }), N);
  const shirtColors = [0x7a4a2a, 0x2f4f7a, 0xe8e2d0, 0xa03a2c, 0x3f6b3a, 0x6b3a6b, 0xc98a2e];
  festival.people.forEach((p, i) => bodies.setColorAt(i, new THREE.Color(shirtColors[i % shirtColors.length])));
  bodies.instanceColor.needsUpdate = true;
  scene.add(bodies, heads, hats);
  festival.villagers = { bodies, heads, hats };

  // tàn lửa bay lên từ các đống lửa
  const SPARKS = isMobile ? 60 : 160;
  const sPos = new Float32Array(SPARKS * 3);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  festival.sparks = new THREE.Points(
    sGeo,
    new THREE.PointsMaterial({ size: 0.35, map: fireTex, color: 0xffb35a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  for (let i = 0; i < SPARKS; i++) festival.sparkData.push({ life: Math.random() });
  scene.add(festival.sparks);
}

// ĐÈN TRỜI: dân làng thả đèn bay lên khắp không gian, trôi nhẹ theo gió
const skyLanterns = { mesh: null, glow: null, data: [] };
{
  const COUNT = isMobile ? 120 : 320;
  const bodyGeo = new THREE.CylinderGeometry(0.55, 0.38, 1.15, 8, 1);
  const mesh = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff }), // màu cam lấy theo từng đèn (setColorAt)
    COUNT,
  );
  const gPos = new Float32Array(COUNT * 3);
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute("position", new THREE.BufferAttribute(gPos, 3));
  const glow = new THREE.Points(
    gGeo,
    new THREE.PointsMaterial({
      size: 3.2,
      map: createParticleTexture(),
      color: 0xffb050,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const tint = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const d = { pos: new THREE.Vector3(), vy: 0, phase: 0, s: 1 };
    resetSkyLantern(d, true);
    skyLanterns.data.push(d);
    tint.setHSL(0.07 + Math.random() * 0.05, 1, 0.55 + Math.random() * 0.1);
    mesh.setColorAt(i, tint);
  }
  mesh.instanceColor.needsUpdate = true;
  skyLanterns.mesh = mesh;
  skyLanterns.glow = glow;
  scene.add(mesh, glow);
}

// thả đèn từ một làng ngẫu nhiên (lúc mở trang: rải sẵn khắp không trung)
function resetSkyLantern(d, scatter) {
  const v = VILLAGES[Math.floor(Math.random() * VILLAGES.length)];
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * (v.r + 6);
  const gy = GROUND_Y + groundHeight(v.x + Math.cos(a) * r, v.z + Math.sin(a) * r);
  d.pos.set(v.x + Math.cos(a) * r, gy + 2, v.z + Math.sin(a) * r);
  if (scatter) {
    // đã bay lên được một đoạn, bị gió đẩy đi
    const k = Math.random();
    d.pos.y += k * 150;
    d.pos.x += k * 60 + (Math.random() - 0.5) * 120;
    d.pos.z += (Math.random() - 0.5) * 120;
  }
  d.vy = 0.03 + Math.random() * 0.04;
  d.phase = Math.random() * Math.PI * 2;
  d.s = 0.7 + Math.random() * 0.6;
}

const _festDummy = new THREE.Object3D();
function updateFestival(time) {
  // lửa bập bùng
  festival.fires.forEach((f) => {
    const flick = 1 + Math.sin(time * 9 + f.phase) * 0.12 + Math.sin(time * 23 + f.phase * 2) * 0.08;
    f.flame.scale.set(1 + Math.sin(time * 7 + f.phase) * 0.08, flick, 1);
    f.core.scale.set(1, 1 + Math.sin(time * 13 + f.phase) * 0.15, 1);
    f.glow.material.opacity = 0.65 + Math.sin(time * 11 + f.phase) * 0.15;
  });
  if (festival.light) festival.light.intensity = 2 + Math.sin(time * 10) * 0.35 + Math.sin(time * 27) * 0.2;

  // dân làng múa vòng quanh lửa, nhún nhảy
  const { bodies, heads, hats } = festival.villagers;
  festival.people.forEach((p, i) => {
    const a = p.a0 + time * p.speed;
    const hop = Math.abs(Math.sin(time * 3 + p.phase)) * 0.25;
    _festDummy.position.set(p.cx + Math.cos(a) * p.r, p.gy + hop, p.cz + Math.sin(a) * p.r);
    _festDummy.rotation.set(0, -a, Math.sin(time * 3 + p.phase) * 0.08); // quay mặt theo hướng đi, lắc lư
    _festDummy.scale.setScalar(p.s);
    _festDummy.updateMatrix();
    bodies.setMatrixAt(i, _festDummy.matrix);
    heads.setMatrixAt(i, _festDummy.matrix);
    if (!p.hat) _festDummy.scale.setScalar(0.0001); // người không đội nón
    _festDummy.updateMatrix();
    hats.setMatrixAt(i, _festDummy.matrix);
  });
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  hats.instanceMatrix.needsUpdate = true;

  // tàn lửa: bay lên, tắt dần rồi sinh lại ở một đống lửa
  const sp = festival.sparks.geometry.attributes.position.array;
  festival.sparkData.forEach((s, i) => {
    s.life += 0.012;
    if (s.life >= 1) {
      s.life = 0;
      s.fire = festival.fires[i % festival.fires.length];
      s.ox = (Math.random() - 0.5) * 1.2;
      s.oz = (Math.random() - 0.5) * 1.2;
    }
    const f = s.fire || festival.fires[i % festival.fires.length];
    sp[i * 3] = f.x + (s.ox || 0) + Math.sin(time * 2 + i) * 0.4 * s.life;
    sp[i * 3 + 1] = f.gy + 1.5 + s.life * 9;
    sp[i * 3 + 2] = f.z + (s.oz || 0) + Math.cos(time * 1.7 + i) * 0.4 * s.life;
  });
  festival.sparks.geometry.attributes.position.needsUpdate = true;

  // đèn trời bay lên, trôi theo gió (cùng hướng gió với tóc, cánh hoa)
  const gust = 0.6 + 0.4 * Math.sin(time * 0.35);
  const gp = skyLanterns.glow.geometry.attributes.position.array;
  skyLanterns.data.forEach((d, i) => {
    d.pos.y += d.vy;
    d.pos.x += (0.02 * gust + Math.sin(time * 0.5 + d.phase) * 0.01) * (d.pos.y > GROUND_Y + 20 ? 1 : 0.3);
    d.pos.z += Math.cos(time * 0.4 + d.phase) * 0.008;
    if (d.pos.y > 110 || d.pos.x > 260) resetSkyLantern(d, false);
    _festDummy.position.copy(d.pos);
    _festDummy.rotation.set(0, time * 0.2 + d.phase, Math.sin(time * 0.8 + d.phase) * 0.06);
    _festDummy.scale.setScalar(d.s);
    _festDummy.updateMatrix();
    skyLanterns.mesh.setMatrixAt(i, _festDummy.matrix);
    gp[i * 3] = d.pos.x;
    gp[i * 3 + 1] = d.pos.y;
    gp[i * 3 + 2] = d.pos.z;
  });
  skyLanterns.mesh.instanceMatrix.needsUpdate = true;
  skyLanterns.glow.geometry.attributes.position.needsUpdate = true;
}

// FIREWORKS
let fireworks = [];
function createFirework(pos) {
  const pCount = 50;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  const velocities = [];

  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = pos.x;
    pPositions[i * 3 + 1] = pos.y;
    pPositions[i * 3 + 2] = pos.z;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 0.08 + Math.random() * 0.12;

    velocities.push(
      new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi),
      ),
    );
  }

  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.35,
    color: 0xffd700,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });

  const pMesh = new THREE.Points(pGeo, pMat);
  scene.add(pMesh);

  fireworks.push({ mesh: pMesh, velocities: velocities, life: 1.0 });
}

// RAYCASTER & INTERACTION
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetCamPos = null;
let targetCamTarget = null;
let selectedLantern = null;

const wishModal = document.getElementById("wishModal");
const wishText = document.getElementById("wishText");
const wishImage = document.getElementById("wishImage");
const closeWishBtn = document.getElementById("closeWishBtn");

let pointerDownPos = { x: 0, y: 0 };

function onPointerDown(event) {
  pointerDownPos.x =
    event.clientX || (event.touches && event.touches[0].clientX) || 0;
  pointerDownPos.y =
    event.clientY || (event.touches && event.touches[0].clientY) || 0;
}

function onPointerUp(event) {
  if (event.target.closest(".top-bar") || event.target.closest(".wish-modal"))
    return;

  const clientX =
    event.clientX ||
    (event.changedTouches && event.changedTouches[0].clientX) ||
    0;
  const clientY =
    event.clientY ||
    (event.changedTouches && event.changedTouches[0].clientY) ||
    0;

  const distMoved = Math.hypot(
    clientX - pointerDownPos.x,
    clientY - pointerDownPos.y,
  );
  if (distMoved > 8) return;

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object;
    selectedLantern = hitMesh.userData.parentLantern || hitMesh.parent;
    const lPos = selectedLantern.position;

    createFirework(lPos);

    const offset = new THREE.Vector3()
      .subVectors(camera.position, lPos)
      .normalize()
      .multiplyScalar(5.5);
    targetCamPos = new THREE.Vector3().addVectors(lPos, offset);
    targetCamTarget = lPos.clone();

    wishText.textContent = `"${selectedLantern.userData.wish}"`;
    wishImage.src = selectedLantern.userData.imgUrl;

    setTimeout(() => {
      wishModal.classList.add("active");
    }, 300);
  }
}

window.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });

function resetCamera() {
  targetCamPos = DEFAULT_CAM_POS.clone();
  targetCamTarget = DEFAULT_CAM_TARGET.clone();
  selectedLantern = null;
}

function closeWishCard(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  wishModal.classList.remove("active");
  resetCamera();
}

closeWishBtn.addEventListener("click", closeWishCard);
closeWishBtn.addEventListener("touchend", closeWishCard);

wishModal.addEventListener("click", (e) => {
  if (e.target === wishModal) closeWishCard(e);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeWishCard();
});

// ANIMATION
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  lanterns.forEach((lantern) => {
    lantern.position.y += lantern.userData.speedY;
    lantern.position.x =
      lantern.userData.initialX +
      Math.sin(time * lantern.userData.swingSpeed + lantern.userData.id) * 0.4;
    lantern.position.z =
      lantern.userData.initialZ +
      Math.cos(time * lantern.userData.swingSpeed + lantern.userData.id) * 0.4;
    lantern.rotation.y += 0.005;

    if (lantern.position.y > 30) {
      lantern.position.y = -3;
    }
  });

  updatePetals(time);

  for (let i = fireworks.length - 1; i >= 0; i--) {
    const fw = fireworks[i];
    fw.life -= delta * 1.2;
    const posArr = fw.mesh.geometry.attributes.position.array;

    for (let j = 0; j < fw.velocities.length; j++) {
      posArr[j * 3] += fw.velocities[j].x;
      posArr[j * 3 + 1] += fw.velocities[j].y;
      posArr[j * 3 + 2] += fw.velocities[j].z;
    }
    fw.mesh.geometry.attributes.position.needsUpdate = true;
    fw.mesh.material.opacity = fw.life;

    if (fw.life <= 0) {
      scene.remove(fw.mesh);
      fireworks.splice(i, 1);
    }
  }

  islandGroup.rotation.y = Math.sin(time * 0.15) * 0.05;

  updateRabbits(time);
  HAIR_WIND_TIME.value = time; // tóc bay theo gió
  WATER_TIME.value = time; // sóng nước trên sông
  updateFestival(time); // lửa trại, dân làng múa, đèn trời bay
  updateClouds(time, delta); // mây trôi vòng tròn, đổi tốc độ ngẫu nhiên mỗi giây

  if (targetCamPos && targetCamTarget) {
    camera.position.lerp(targetCamPos, 0.04);
    controls.target.lerp(targetCamTarget, 0.04);

    if (camera.position.distanceTo(targetCamPos) < 0.1) {
      targetCamPos = null;
      targetCamTarget = null;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.fov = isPortrait() ? 60 : 45;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
  );

  // xoay điện thoại dọc <-> ngang: đổi sang góc nhìn hợp với khung mới
  updateDefaultView();
  if (!userMovedCamera && !targetCamPos) {
    camera.position.copy(DEFAULT_CAM_POS);
    controls.target.copy(DEFAULT_CAM_TARGET);
  }
});

// ÉP XOAY NGANG TRÊN ĐIỆN THOẠI
// Android: lần chạm đầu tiên -> vào toàn màn hình rồi khoá hướng ngang.
// iPhone (không cho khoá hướng): màn che "Xoay ngang điện thoại" hiện khi cầm dọc (xem css .rotate-hint).
function lockLandscape() {
  document.removeEventListener("touchend", lockLandscape, true);
  document.removeEventListener("click", lockLandscape, true);
  if (!isMobile || !screen.orientation || !screen.orientation.lock) return;
  const el = document.documentElement;
  const enterFs = el.requestFullscreen || el.webkitRequestFullscreen;
  Promise.resolve(enterFs && !document.fullscreenElement ? enterFs.call(el) : null)
    .then(() => screen.orientation.lock("landscape"))
    .catch(() => {}); // trình duyệt không cho khoá: dùng màn che nhắc xoay ngang
}
if (isMobile) {
  document.addEventListener("touchend", lockLandscape, true);
  document.addEventListener("click", lockLandscape, true);
}
