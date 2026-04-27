import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#solarCanvas");
const pauseButton = document.querySelector("#pauseButton");
const pauseIcon = document.querySelector("#pauseIcon");
const speedButtons = document.querySelectorAll("[data-speed]");
const scaleButtons = document.querySelectorAll("[data-scale-mode]");
const focusButtons = document.querySelectorAll("[data-focus-target]");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2600);
camera.position.set(0, 8, 19);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.35;
controls.maxDistance = Infinity;
controls.target.set(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const focusTarget = new THREE.Vector3();
const pointerDown = new THREE.Vector2();
const cameraDirection = new THREE.Vector3();
const worldScale = new THREE.Vector3();
let focusedObject = null;

let speed = 0.55;
let paused = false;
let orbitAngle = 0;
let moonOrbitAngle = 0;
let lastTime = performance.now();
let scaleMode = "diagram";
const earthOrbitRadius = 8;
const moonOrbitRadius = 1.35;
const realEarthOrbitRadius = 36;
const realEarthRadius = 0.07;
const earthBaseRadius = 0.72;
const moonBaseRadius = 0.2;
const sunBaseRadius = 2.2;
let currentEarthOrbitRadius = earthOrbitRadius;
let currentMoonOrbitRadius = moonOrbitRadius;
const earthSelfRotationSpeed = 3.85;
const earthRotationsPerOrbit = 365.25;
const moonOrbitDays = 27.32;
const moonOrbitsPerEarthOrbit = earthRotationsPerOrbit / moonOrbitDays;
const moonOrbitTilt = THREE.MathUtils.degToRad(5.1);
const planetConfigs = [
  {
    name: "Mercury",
    orbitRadius: 4.1,
    radius: 0.28,
    au: 0.387,
    radiusEarth: 0.383,
    yearDays: 88,
    rotationSpeed: 0.65,
    texture: { base: "#8a8983", light: "#b4b1a7", dark: "#55534f", bands: 8, spots: 26 },
  },
  {
    name: "Venus",
    orbitRadius: 5.8,
    radius: 0.48,
    au: 0.723,
    radiusEarth: 0.949,
    yearDays: 224.7,
    rotationSpeed: 0.25,
    texture: { base: "#d8b56c", light: "#f0d89b", dark: "#a76f37", bands: 16, spots: 18 },
  },
  {
    name: "Mars",
    orbitRadius: 10.3,
    radius: 0.38,
    au: 1.524,
    radiusEarth: 0.532,
    yearDays: 687,
    rotationSpeed: 3.7,
    texture: { base: "#b95732", light: "#df8a58", dark: "#6e2f22", bands: 7, spots: 30 },
  },
  {
    name: "Jupiter",
    orbitRadius: 14,
    radius: 1.25,
    au: 5.203,
    radiusEarth: 11.21,
    yearDays: 4332.6,
    rotationSpeed: 8.8,
    texture: { base: "#c99b6b", light: "#f1d2a5", dark: "#8d5b3d", bands: 26, spots: 12 },
  },
  {
    name: "Saturn",
    orbitRadius: 18.2,
    radius: 1.05,
    au: 9.537,
    radiusEarth: 9.45,
    yearDays: 10759,
    rotationSpeed: 8.1,
    texture: { base: "#d8bf7a", light: "#f4e3ad", dark: "#a98545", bands: 24, spots: 8 },
  },
  {
    name: "Uranus",
    orbitRadius: 22.1,
    radius: 0.78,
    au: 19.191,
    radiusEarth: 4.01,
    yearDays: 30687,
    rotationSpeed: 5.9,
    texture: { base: "#83d3d7", light: "#b9f1ef", dark: "#3f98a3", bands: 10, spots: 4 },
  },
  {
    name: "Neptune",
    orbitRadius: 25.4,
    radius: 0.76,
    au: 30.07,
    radiusEarth: 3.88,
    yearDays: 60190,
    rotationSpeed: 6.1,
    texture: { base: "#315cc6", light: "#6d96ff", dark: "#17347f", bands: 10, spots: 8 },
  },
  {
    name: "Pluto",
    orbitRadius: 28.4,
    radius: 0.32,
    au: 39.48,
    radiusEarth: 0.186,
    yearDays: 90560,
    rotationSpeed: 0.55,
    texture: { base: "#a98d75", light: "#d2bca4", dark: "#5f4d47", bands: 5, spots: 22 },
  },
];

const solarSystem = new THREE.Group();
scene.add(solarSystem);

const sun = createSun();
sun.userData.focusName = "Sun";
solarSystem.add(sun);

const earth = createEarth();
earth.position.set(earthOrbitRadius, 0, 0);
solarSystem.add(earth);

const moonSystem = new THREE.Group();
moonSystem.position.copy(earth.position);
moonSystem.rotation.x = moonOrbitTilt;
solarSystem.add(moonSystem);

const moon = createMoon();
moon.userData.focusName = "Moon";
moon.position.set(moonOrbitRadius, 0, 0);
moonSystem.add(moon);

const orbitPath = createOrbitPath(earthOrbitRadius);
solarSystem.add(orbitPath);

const moonOrbitPath = createOrbitPath(moonOrbitRadius, 0x9ca3af, 0.38);
moonSystem.add(moonOrbitPath);

const planets = planetConfigs.map((config) => {
  const planet = createPlanet(config);
  planet.position.set(config.orbitRadius, 0, 0);
  solarSystem.add(planet);
  const path = createOrbitPath(config.orbitRadius, 0x718096, config.name === "Pluto" ? 0.42 : 0.22);
  solarSystem.add(path);
  return {
    ...config,
    angle: Math.random() * Math.PI * 2,
    currentOrbitRadius: config.orbitRadius,
    mesh: planet,
    orbitPath: path,
    surface: planet.userData.surface,
  };
});

const focusableObjects = [sun, earth.userData.surface, moon, ...planets.map((planet) => planet.surface)];
const focusTargets = new Map(focusableObjects.map((object) => [object.userData.focusName, object]));

const sunlight = new THREE.PointLight(0xffffff, 13, 1700, 1.2);
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
  mesh.userData.focusName = "Earth";
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

  const mapPoint = ([longitude, latitude]) => [(longitude + 180) / 360, (90 - latitude) / 180];
  const land = (color, points) => drawContinent(ctx, color, points.map(mapPoint));

  land("#3aa260", [
    [-168, 71],
    [-142, 70],
    [-124, 55],
    [-124, 42],
    [-116, 31],
    [-103, 22],
    [-88, 16],
    [-80, 8],
    [-76, 18],
    [-82, 27],
    [-72, 42],
    [-58, 50],
    [-54, 60],
    [-78, 70],
    [-112, 74],
  ]);
  land("#43ad67", [
    [-82, 12],
    [-66, 9],
    [-50, -2],
    [-38, -16],
    [-45, -34],
    [-56, -53],
    [-70, -55],
    [-76, -34],
    [-81, -12],
  ]);
  land("#d8cfaa", [
    [-73, 82],
    [-28, 75],
    [-36, 60],
    [-58, 59],
    [-74, 70],
  ]);
  land("#3d9c61", [
    [-12, 72],
    [28, 70],
    [46, 56],
    [39, 42],
    [20, 36],
    [2, 43],
    [-10, 50],
    [-24, 61],
  ]);
  land("#45a866", [
    [-18, 36],
    [12, 35],
    [34, 31],
    [51, 11],
    [43, -12],
    [30, -34],
    [18, -35],
    [5, -20],
    [-10, -4],
    [-17, 15],
  ]);
  land("#3f9f61", [
    [32, 72],
    [92, 72],
    [150, 62],
    [170, 48],
    [143, 34],
    [121, 19],
    [105, 5],
    [79, 8],
    [60, 25],
    [40, 32],
    [32, 50],
  ]);
  land("#48a969", [
    [113, -12],
    [154, -20],
    [147, -39],
    [116, -35],
  ]);
  land("#3f9f61", [
    [96, 6],
    [120, 8],
    [126, -7],
    [106, -9],
  ]);
  land("#d7c79a", [
    [-18, 29],
    [14, 31],
    [31, 21],
    [24, 8],
    [-5, 12],
  ]);
  land("#d6bd86", [
    [35, 31],
    [58, 27],
    [56, 13],
    [42, 13],
  ]);
  land("#cda86f", [
    [121, -19],
    [143, -25],
    [134, -33],
    [118, -29],
  ]);

  ctx.fillStyle = "rgba(244, 249, 255, 0.9)";
  ctx.fillRect(0, 0, canvas.width, 24);
  land("rgba(244, 249, 255, 0.9)", [
    [-180, -66],
    [-120, -72],
    [-60, -68],
    [0, -74],
    [70, -68],
    [140, -72],
    [180, -66],
    [180, -90],
    [-180, -90],
  ]);

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

function createPlanet(config) {
  const root = new THREE.Group();
  const geometry = new THREE.SphereGeometry(config.radius, 48, 48);
  const material = new THREE.MeshStandardMaterial({
    map: createPlanetTexture(config.texture),
    roughness: 0.64,
    metalness: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.focusName = config.name;
  root.add(mesh);
  root.userData.surface = mesh;

  if (config.name === "Saturn") {
    root.add(createSaturnRing(config.radius));
  }

  return root;
}

function createPlanetTexture(options) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");

  const surface = ctx.createLinearGradient(0, 0, 0, canvas.height);
  surface.addColorStop(0, options.light);
  surface.addColorStop(0.5, options.base);
  surface.addColorStop(1, options.dark);
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < options.bands; i += 1) {
    const y = (i / options.bands) * canvas.height;
    const height = canvas.height / options.bands;
    ctx.fillStyle = i % 2 === 0 ? `${options.light}66` : `${options.dark}55`;
    ctx.fillRect(0, y + height * 0.2, canvas.width, height * 0.36);
  }

  for (let i = 0; i < options.spots; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 4 + Math.random() * 24;
    ctx.fillStyle = i % 3 === 0 ? `${options.light}88` : `${options.dark}77`;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * (0.8 + Math.random()), radius * (0.35 + Math.random() * 0.55), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createSaturnRing(planetRadius) {
  const geometry = new THREE.RingGeometry(planetRadius * 1.35, planetRadius * 2.05, 96);
  const material = new THREE.MeshBasicMaterial({
    color: 0xd8bf7a,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = THREE.MathUtils.degToRad(72);
  return ring;
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

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function focusObject(object, shouldFrame = false) {
  focusedObject = object;
  object.getWorldPosition(focusTarget);
  controls.target.copy(focusTarget);

  focusButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.focusTarget === object.userData.focusName);
  });

  if (shouldFrame) {
    frameFocusedObject(object);
  }
}

function updateFocusedTarget() {
  if (!focusedObject) {
    return;
  }

  focusedObject.getWorldPosition(focusTarget);
  controls.target.copy(focusTarget);
}

function getPointerPosition(event, target) {
  const rect = canvas.getBoundingClientRect();
  target.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

function pickFocusTarget(event) {
  getPointerPosition(event, pointer);
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(focusableObjects, false);
  if (hits.length > 0) {
    focusObject(hits[0].object, true);
  }
}

function getWorldRadius(object) {
  if (!object.geometry.boundingSphere) {
    object.geometry.computeBoundingSphere();
  }

  object.getWorldScale(worldScale);
  return object.geometry.boundingSphere.radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
}

function frameFocusedObject(object) {
  const radius = getWorldRadius(object);
  const distance = Math.max(0.9, radius * 7.5);

  cameraDirection.subVectors(camera.position, controls.target);
  if (cameraDirection.lengthSq() < 0.0001) {
    cameraDirection.set(0, 0.35, 1);
  }
  cameraDirection.normalize();

  camera.position.copy(focusTarget).addScaledVector(cameraDirection, distance);
  camera.near = Math.max(0.001, distance / 1500);
  camera.updateProjectionMatrix();
  controls.update();
}

function focusByName(name) {
  const target = focusTargets.get(name);
  if (target) {
    focusObject(target, true);
  }
}

function getBodyScale(config) {
  if (scaleMode === "diagram") {
    return {
      orbitRadius: config.orbitRadius,
      radius: config.radius,
    };
  }

  return {
    orbitRadius: config.au * realEarthOrbitRadius,
    radius: Math.max(config.radiusEarth * realEarthRadius, 0.008),
  };
}

function applyScaleMode(nextMode) {
  scaleMode = nextMode;

  currentEarthOrbitRadius = scaleMode === "diagram" ? earthOrbitRadius : realEarthOrbitRadius;
  currentMoonOrbitRadius = scaleMode === "diagram" ? moonOrbitRadius : realEarthOrbitRadius * 0.00257;

  const earthRadius = scaleMode === "diagram" ? earthBaseRadius : realEarthRadius;
  const moonRadius = scaleMode === "diagram" ? moonBaseRadius : realEarthRadius * 0.273;
  const sunRadius = scaleMode === "diagram" ? sunBaseRadius : realEarthRadius * 109;

  sun.scale.setScalar(sunRadius / sunBaseRadius);
  earth.scale.setScalar(earthRadius / earthBaseRadius);
  moon.scale.setScalar(moonRadius / moonBaseRadius);
  orbitPath.scale.setScalar(currentEarthOrbitRadius / earthOrbitRadius);
  moonOrbitPath.scale.setScalar(currentMoonOrbitRadius / moonOrbitRadius);

  planets.forEach((planet) => {
    const bodyScale = getBodyScale(planet);
    planet.currentOrbitRadius = bodyScale.orbitRadius;
    planet.mesh.scale.setScalar(bodyScale.radius / planet.radius);
    planet.orbitPath.scale.setScalar(bodyScale.orbitRadius / planet.orbitRadius);
  });

  updateOrbitPositions();
  updateFocusedTarget();

  scaleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scaleMode === scaleMode);
  });
}

function updateOrbitPositions() {
  earth.position.set(
    Math.cos(orbitAngle) * currentEarthOrbitRadius,
    0,
    Math.sin(orbitAngle) * currentEarthOrbitRadius,
  );
  moonSystem.position.copy(earth.position);
  moon.position.set(
    Math.cos(moonOrbitAngle) * currentMoonOrbitRadius,
    0,
    Math.sin(moonOrbitAngle) * currentMoonOrbitRadius,
  );

  planets.forEach((planet) => {
    planet.mesh.position.set(
      Math.cos(planet.angle) * planet.currentOrbitRadius,
      0,
      Math.sin(planet.angle) * planet.currentOrbitRadius,
    );
  });
}

function render(time) {
  const dt = Math.min(60, time - lastTime) / 1000;
  lastTime = time;

  resizeRenderer();

  if (!paused) {
    const earthOrbitStep = (dt * speed * earthSelfRotationSpeed) / earthRotationsPerOrbit;
    orbitAngle += earthOrbitStep;
    moonOrbitAngle += earthOrbitStep * moonOrbitsPerEarthOrbit;
    planets.forEach((planet) => {
      planet.angle += (dt * speed * earthSelfRotationSpeed) / planet.yearDays;
    });
    updateOrbitPositions();
    earth.userData.surface.rotation.y += dt * speed * earthSelfRotationSpeed;
    moon.rotation.y += dt * speed * earthSelfRotationSpeed * 0.12;
    planets.forEach((planet) => {
      planet.surface.rotation.y += dt * speed * planet.rotationSpeed;
    });
    sun.rotation.y += dt * speed * 0.7;
  }

  updateFocusedTarget();
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

scaleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyScaleMode(button.dataset.scaleMode);
  });
});

focusButtons.forEach((button) => {
  button.addEventListener("click", () => {
    focusByName(button.dataset.focusTarget);
  });
});

canvas.addEventListener("pointerdown", (event) => {
  pointerDown.set(event.clientX, event.clientY);
});

canvas.addEventListener("pointerup", (event) => {
  const movement = pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
  if (movement < 6) {
    pickFocusTarget(event);
  }
});

applyScaleMode("diagram");
requestAnimationFrame(render);
