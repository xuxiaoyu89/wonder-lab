import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#solarCanvas");
const pauseButton = document.querySelector("#pauseButton");
const pauseIcon = document.querySelector("#pauseIcon");
const speedButtons = document.querySelectorAll("[data-speed]");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 8, 19);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 9;
controls.maxDistance = 32;
controls.target.set(0, 0, 0);

let speed = 0.55;
let paused = false;
let orbitAngle = 0;
let moonOrbitAngle = 0;
let lastTime = performance.now();
const earthOrbitRadius = 8;
const moonOrbitRadius = 1.35;
const earthSelfRotationSpeed = 3.85;
const earthRotationsPerOrbit = 365.25;
const moonOrbitDays = 27.32;
const moonOrbitsPerEarthOrbit = earthRotationsPerOrbit / moonOrbitDays;
const moonOrbitTilt = THREE.MathUtils.degToRad(5.1);

const solarSystem = new THREE.Group();
scene.add(solarSystem);

const sun = createSun();
solarSystem.add(sun);

const earth = createEarth();
earth.position.set(earthOrbitRadius, 0, 0);
solarSystem.add(earth);

const moonSystem = new THREE.Group();
moonSystem.position.copy(earth.position);
moonSystem.rotation.x = moonOrbitTilt;
solarSystem.add(moonSystem);

const moon = createMoon();
moon.position.set(moonOrbitRadius, 0, 0);
moonSystem.add(moon);

const orbitPath = createOrbitPath(earthOrbitRadius);
solarSystem.add(orbitPath);

const moonOrbitPath = createOrbitPath(moonOrbitRadius, 0x9ca3af, 0.38);
moonSystem.add(moonOrbitPath);

const stars = createStars();
scene.add(stars);

const sunlight = new THREE.PointLight(0xffffff, 11, 80, 1.25);
sunlight.position.set(0, 0, 0);
scene.add(sunlight);

const ambient = new THREE.AmbientLight(0x7f9fd6, 0.055);
scene.add(ambient);

function createSun() {
  const geometry = new THREE.SphereGeometry(2.2, 64, 64);
  const material = new THREE.MeshBasicMaterial({ color: 0xffc83d });
  const mesh = new THREE.Mesh(geometry, material);

  const glowGeometry = new THREE.SphereGeometry(2.55, 64, 64);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffa629,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  mesh.add(glow);

  return mesh;
}

function createEarth() {
  const root = new THREE.Group();
  const axialTilt = new THREE.Group();
  axialTilt.rotation.z = THREE.MathUtils.degToRad(23.4);
  root.add(axialTilt);

  const geometry = new THREE.SphereGeometry(0.72, 48, 48);
  const material = new THREE.MeshStandardMaterial({
    map: createEarthTexture(),
    roughness: 0.48,
    metalness: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  axialTilt.add(mesh);

  root.userData.surface = mesh;

  return root;
}

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, "#1b68c8");
  ocean.addColorStop(0.48, "#1f8be8");
  ocean.addColorStop(1, "#103f92");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawContinent(ctx, "#2f9f64", [
    [0.16, 0.22],
    [0.22, 0.15],
    [0.3, 0.2],
    [0.33, 0.34],
    [0.29, 0.47],
    [0.21, 0.52],
    [0.14, 0.42],
    [0.11, 0.3],
  ]);
  drawContinent(ctx, "#43ad67", [
    [0.28, 0.52],
    [0.36, 0.57],
    [0.38, 0.72],
    [0.33, 0.88],
    [0.27, 0.75],
    [0.24, 0.63],
  ]);
  drawContinent(ctx, "#3aa260", [
    [0.48, 0.28],
    [0.58, 0.2],
    [0.69, 0.28],
    [0.72, 0.44],
    [0.64, 0.52],
    [0.54, 0.47],
    [0.45, 0.39],
  ]);
  drawContinent(ctx, "#55b66d", [
    [0.62, 0.5],
    [0.72, 0.54],
    [0.75, 0.7],
    [0.67, 0.78],
    [0.58, 0.68],
  ]);
  drawContinent(ctx, "#33985d", [
    [0.78, 0.32],
    [0.88, 0.28],
    [0.94, 0.39],
    [0.9, 0.52],
    [0.81, 0.5],
  ]);

  ctx.fillStyle = "rgba(244, 249, 255, 0.9)";
  ctx.fillRect(0, 0, canvas.width, 36);
  ctx.fillRect(0, canvas.height - 34, canvas.width, 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createMoon() {
  const geometry = new THREE.SphereGeometry(0.2, 40, 40);
  const material = new THREE.MeshStandardMaterial({
    map: createMoonTexture(),
    roughness: 0.68,
    metalness: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  return new THREE.Mesh(geometry, material);
}

function createMoonTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const surface = ctx.createLinearGradient(0, 0, 0, canvas.height);
  surface.addColorStop(0, "#c8c8c2");
  surface.addColorStop(0.5, "#8e908b");
  surface.addColorStop(1, "#5f625f");
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 46; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 5 + Math.random() * 22;

    ctx.fillStyle = "rgba(42, 43, 42, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * (0.45 + Math.random() * 0.35), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(230, 230, 220, 0.36)";
    ctx.lineWidth = Math.max(1, radius * 0.12);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawContinent(ctx, color, points) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(221, 190, 92, 0.45)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(points[0][0] * width, points[0][1] * height);

  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const previous = points[i - 1];
    const controlX = ((previous[0] + current[0]) / 2) * width;
    const controlY = ((previous[1] + current[1]) / 2) * height;
    ctx.quadraticCurveTo(previous[0] * width, previous[1] * height, controlX, controlY);
  }

  const last = points[points.length - 1];
  const first = points[0];
  ctx.quadraticCurveTo(last[0] * width, last[1] * height, first[0] * width, first[1] * height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function createOrbitPath(radius, color = 0xffffff, opacity = 0.32) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
  const points = curve.getPoints(160).map((point) => new THREE.Vector3(point.x, 0, point.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });

  return new THREE.LineLoop(geometry, material);
}

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < 420; i += 1) {
    const radius = 32 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    );
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.085,
      transparent: true,
      opacity: 0.76,
    }),
  );
}

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function render(time) {
  const dt = Math.min(60, time - lastTime) / 1000;
  lastTime = time;

  resizeRenderer();

  if (!paused) {
    const earthOrbitStep = (dt * speed * earthSelfRotationSpeed) / earthRotationsPerOrbit;
    orbitAngle += earthOrbitStep;
    moonOrbitAngle += earthOrbitStep * moonOrbitsPerEarthOrbit;
    earth.position.set(
      Math.cos(orbitAngle) * earthOrbitRadius,
      0,
      Math.sin(orbitAngle) * earthOrbitRadius,
    );
    moonSystem.position.copy(earth.position);
    moon.position.set(
      Math.cos(moonOrbitAngle) * moonOrbitRadius,
      0,
      Math.sin(moonOrbitAngle) * moonOrbitRadius,
    );
    earth.userData.surface.rotation.y += dt * speed * earthSelfRotationSpeed;
    moon.rotation.y += dt * speed * earthSelfRotationSpeed * 0.12;
    sun.rotation.y += dt * speed * 0.7;
    stars.rotation.y += dt * 0.006;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseIcon.textContent = paused ? ">" : "II";
  pauseButton.setAttribute("aria-label", paused ? "Resume orbit" : "Pause orbit");
});

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    speed = Number(button.dataset.speed);
    speedButtons.forEach((item) => item.classList.toggle("is-active", item === button));
  });
});

requestAnimationFrame(render);
