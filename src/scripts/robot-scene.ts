import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CYAN = 0x00f0ff;
const MAGENTA = 0xff2bd6;
const VIOLET = 0x8b5cf6;

export function initRobotScene(options?: { forceShow?: boolean }) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!options?.forceShow && window.innerWidth < 1024) return;

  const canvas = document.getElementById('robot-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || 1, canvas.clientHeight || 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050508, 0.028);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 3.2, 13.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  const ambient = new THREE.AmbientLight(0x1a1033, 0.7);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xbffcff, 2.4);
  keyLight.position.set(6, 10, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 40;
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(MAGENTA, 0.5);
  fillLight.position.set(-7, 3, -4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(VIOLET, 1.5);
  rimLight.position.set(-3, 7, -9);
  scene.add(rimLight);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x0d0d14,
    roughness: 0.35,
    metalness: 0.85,
    envMapIntensity: 1.2,
  });

  const darkMatte = new THREE.MeshStandardMaterial({
    color: 0x12121c,
    roughness: 0.6,
    metalness: 0.5,
    envMapIntensity: 0.8,
  });

  const cyanGlow = new THREE.MeshStandardMaterial({
    color: 0x003c47,
    emissive: CYAN,
    emissiveIntensity: 1.8,
    roughness: 0.3,
    metalness: 0.4,
  });

  const magentaGlow = new THREE.MeshStandardMaterial({
    color: 0x3d0a36,
    emissive: MAGENTA,
    emissiveIntensity: 2.0,
    roughness: 0.3,
    metalness: 0.4,
  });

  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  const baseGroup = new THREE.Group();
  modelGroup.add(baseGroup);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.22, 8), darkMetal);
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  baseGroup.add(plinth);

  const plinthEdge = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.02, 8), cyanGlow);
  plinthEdge.position.y = 0.235;
  baseGroup.add(plinthEdge);

  const tier = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.5, 8), darkMatte);
  tier.position.y = 0.47;
  tier.castShadow = true;
  baseGroup.add(tier);

  const tierGlow = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.06, 8), cyanGlow);
  tierGlow.position.y = 0.71;
  baseGroup.add(tierGlow);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), cyanGlow);
  core.position.y = 0.75;
  core.scale.set(1, 1.5, 1);
  baseGroup.add(core);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 1.55, 8), darkMetal);
  stem.position.y = 1.65;
  stem.castShadow = true;
  baseGroup.add(stem);

  for (let i = 0; i < 3; i++) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42 - i * 0.03, 0.46 - i * 0.03, 0.07, 8), cyanGlow);
    collar.position.y = 1.25 + i * 0.45;
    baseGroup.add(collar);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 1.1, 8), darkMetal);
  neck.position.y = 2.55;
  neck.rotation.x = 0.12;
  neck.castShadow = true;
  baseGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 3.0;
  modelGroup.add(headGroup);

  const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.52, 0.5), darkMetal);
  cranium.position.set(0, 0.28, 0);
  cranium.rotation.z = 0.04;
  cranium.castShadow = true;
  headGroup.add(cranium);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.42), darkMatte);
  crown.position.set(0, 0.56, 0.02);
  headGroup.add(crown);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.55), darkMatte);
  snout.position.set(0, 0.06, 0.42);
  snout.rotation.x = 0.38;
  snout.castShadow = true;
  headGroup.add(snout);

  const snoutTip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.12), cyanGlow);
  snoutTip.position.set(0, -0.08, 0.66);
  snoutTip.rotation.x = 0.38;
  headGroup.add(snoutTip);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.34), darkMatte);
  jaw.position.set(0, -0.18, 0.32);
  jaw.rotation.x = 0.14;
  headGroup.add(jaw);

  const jawGlow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.2), magentaGlow);
  jawGlow.position.set(0, -0.28, 0.32);
  headGroup.add(jawGlow);

  const eyeGeo = new THREE.BoxGeometry(0.13, 0.05, 0.03);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x330a2c,
    emissive: MAGENTA,
    emissiveIntensity: 3.0,
    roughness: 0.2,
    metalness: 0.2,
  });
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.17, 0.33, 0.24);
  eyeR.rotation.y = -0.3;
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.17, 0.33, 0.24);
  eyeL.rotation.y = 0.3;
  headGroup.add(eyeR);
  headGroup.add(eyeL);

  const eyeLight = new THREE.PointLight(MAGENTA, 2.0, 6);
  eyeLight.position.set(0, 0.33, 0.4);
  headGroup.add(eyeLight);

  const makeEar = (side: number) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.42, 4), darkMetal);
    ear.position.set(side * 0.18, 0.72, -0.22);
    ear.rotation.z = side * 0.38;
    ear.rotation.x = 0.55;
    ear.castShadow = true;
    return ear;
  };
  headGroup.add(makeEar(1));
  headGroup.add(makeEar(-1));

  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.24, 4),
      i % 2 === 0 ? cyanGlow : magentaGlow
    );
    spike.position.set(0, 0.42 - i * 0.08, -0.3 - i * 0.07);
    spike.rotation.x = 0.85 + i * 0.1;
    headGroup.add(spike);
  }

  const addEdges = (mesh: THREE.Mesh, color: number, opacity: number) => {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
    mesh.add(edges);
    return edges;
  };
  addEdges(plinth, CYAN, 0.35);
  addEdges(tier, CYAN, 0.3);
  addEdges(stem, CYAN, 0.25);
  addEdges(neck, VIOLET, 0.25);
  addEdges(cranium, CYAN, 0.35);
  addEdges(snout, VIOLET, 0.3);

  const shadowPlaneMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c10,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.6,
  });
  const planeMesh = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), shadowPlaneMat);
  planeMesh.rotation.x = -Math.PI / 2;
  planeMesh.position.y = -0.01;
  planeMesh.receiveShadow = true;
  scene.add(planeMesh);

  const floorRingMat = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.95, 64), floorRingMat);
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.03;
  scene.add(floorRing);

  const floorRingMat2 = new THREE.MeshBasicMaterial({
    color: VIOLET,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const floorRing2 = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.62, 64), floorRingMat2);
  floorRing2.rotation.x = -Math.PI / 2;
  floorRing2.position.y = 0.02;
  scene.add(floorRing2);

  const holoMat = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const midRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.02, 8, 48), holoMat);
  midRing.position.y = 1.55;
  midRing.rotation.x = 0.5;
  scene.add(midRing);

  const holoMat2 = new THREE.MeshBasicMaterial({
    color: MAGENTA,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const upperRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.016, 8, 48), holoMat2);
  upperRing.position.y = 2.35;
  upperRing.rotation.x = 1.0;
  scene.add(upperRing);

  const scanMat = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const scanPlane = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 3.2), scanMat);
  scene.add(scanPlane);

  const scanMat2 = new THREE.MeshBasicMaterial({
    color: MAGENTA,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const scanPlane2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.015, 2.8), scanMat2);
  scene.add(scanPlane2);

  const particleCount = 240;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const c1 = new THREE.Color(CYAN);
  const c2 = new THREE.Color(MAGENTA);
  const c3 = new THREE.Color(VIOLET);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 16;
    particlePositions[i * 3 + 1] = Math.random() * 9;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    const pick = Math.random();
    const col = pick < 0.45 ? c1 : pick < 0.8 ? c2 : c3;
    particleColors[i * 3] = col.r;
    particleColors[i * 3 + 1] = col.g;
    particleColors[i * 3 + 2] = col.b;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.05,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  const isDark = () => document.documentElement.classList.contains('dark');

  function applyTheme() {
    const dark = isDark();
    scene.fog.color.set(dark ? 0x050508 : 0xf1f5f9);
    planeMesh.material.color.set(dark ? 0x0c0c10 : 0x64748b);
    planeMesh.material.opacity = dark ? 0.6 : 0.25;
    cyanGlow.emissiveIntensity = dark ? 1.8 : 2.6;
    magentaGlow.emissiveIntensity = dark ? 2.0 : 2.8;
    eyeMat.emissiveIntensity = dark ? 3.0 : 3.6;
    floorRingMat.opacity = dark ? 0.45 : 0.7;
    floorRingMat2.opacity = dark ? 0.3 : 0.5;
    holoMat.opacity = dark ? 0.22 : 0.35;
    holoMat2.opacity = dark ? 0.2 : 0.32;
    scanMat.opacity = dark ? 0.09 : 0.14;
    scanMat2.opacity = dark ? 0.07 : 0.11;
    particleMat.opacity = dark ? 0.55 : 0.7;
    ambient.intensity = dark ? 0.7 : 0.5;
  }
  applyTheme();

  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    // Adjust scale based on screen width for mobile responsiveness
    if (window.innerWidth < 768) {
      modelGroup.scale.setScalar(0.65); // Make it larger to fill space
      camera.position.set(0, 3.0, 15); // Move camera closer
      // We'll set the Y position in animate to -1.5
    } else if (window.innerWidth < 1024) {
      modelGroup.scale.setScalar(0.50);
      camera.position.set(0, 3, 16);
      modelGroup.position.y = 0;
    } else {
      modelGroup.scale.setScalar(0.7);
      camera.position.set(0, 2.5, 12);
      modelGroup.position.y = 0;
    }
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let raf: number;

  function animate() {
    raf = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    const breathe = Math.sin(elapsed * 0.9) * 0.04;
    const baseOffset = window.innerWidth < 768 ? -1.8 : 0;
    modelGroup.position.y = baseOffset + breathe;

    floorRing.rotation.z = elapsed * 0.25;
    floorRing2.rotation.z = -elapsed * 0.16;

    midRing.rotation.z = elapsed * 0.8;
    midRing.rotation.x = 0.5 + Math.sin(elapsed * 0.4) * 0.15;
    upperRing.rotation.z = -elapsed * 1.1;
    upperRing.rotation.x = 1.0 + Math.cos(elapsed * 0.5) * 0.12;

    const scanY = 0.15 + ((elapsed * 0.55) % 4.4);
    scanPlane.position.y = scanY;
    scanPlane2.position.y = 4.45 - scanY;

    core.scale.set(1 + Math.sin(elapsed * 2.5) * 0.12, 1.5 + Math.sin(elapsed * 2.5) * 0.18, 1);
    core.material.emissiveIntensity = 1.8 + Math.sin(elapsed * 2.5) * 0.8;

    eyeLight.intensity = 2.0 + Math.sin(elapsed * 2.2) * 0.6;

    particles.rotation.y = elapsed * 0.02;

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  document.addEventListener('astro:before-swap', () => {
    cancelAnimationFrame(raf);
    themeObserver.disconnect();
    renderer.dispose();
  }, { once: true });
}
