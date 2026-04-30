import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js";

const canvas = document.querySelector("#jumpCanvas");
canvas.tabIndex = 0;
const pauseButton = document.querySelector("#pauseButton");
const pauseIcon = document.querySelector("#pauseIcon");
const worldButtons = document.querySelectorAll("[data-planet]");
const planetName = document.querySelector("#planetName");
const gravityValue = document.querySelector("#gravityValue");
const airTime = document.querySelector("#airTime");
const distanceValue = document.querySelector("#distanceValue");
const factCards = document.querySelectorAll(".fact-card");
const badgeCount = document.querySelector("#badgeCount");
const missionAnswer = document.querySelector("#missionAnswer");
const saveLog = document.querySelector("#saveLog");
const savedNote = document.querySelector("#savedNote");

const planets = {
  mercury: { name: "Mercury", gravity: 3.7, sky: 0x11141b, ground: 0x5c564d, accent: 0xb7aa99 },
  venus: { name: "Venus", gravity: 8.87, sky: 0x24170b, ground: 0x6f5127, accent: 0xe3b35c },
  earth: { name: "Earth", gravity: 9.81, sky: 0x071323, ground: 0x24483a, accent: 0x4f9bff },
  moon: { name: "Moon", gravity: 1.62, sky: 0x05070d, ground: 0x77736c, accent: 0xd8d5cd },
  mars: { name: "Mars", gravity: 3.71, sky: 0x21110d, ground: 0x9a4e2f, accent: 0xd96b41 },
  jupiter: { name: "Jupiter", gravity: 24.79, sky: 0x10121c, ground: 0x8b6a45, accent: 0xd6b17a },
  saturn: { name: "Saturn", gravity: 10.44, sky: 0x101420, ground: 0x8a7a55, accent: 0xd8c27a },
  uranus: { name: "Uranus", gravity: 8.69, sky: 0x061922, ground: 0x377b84, accent: 0x8de5ef },
  neptune: { name: "Neptune", gravity: 11.15, sky: 0x061027, ground: 0x244585, accent: 0x4d7dff },
};

const readCards = new Set();
const totalCards = factCards.length;
const storageKey = "wonderLabGravityJumpLog";
const planetRadiusMeters = 500;
const astronautSurfaceOffset = 0.82;
const planetCenter = new THREE.Vector3(0, -planetRadiusMeters, 0);
const startPosition = new THREE.Vector3(0, standingHeightAt(0, 0), 0);
const jumpStartPosition = new THREE.Vector3();
const jumpVelocity = { x: 2.15, y: 3.75, z: 0 };
const cameraTarget = new THREE.Vector3();
const cameraGoal = new THREE.Vector3();
const clock = new THREE.Clock();
const feetPerMeter = 3.28084;
const cameraOffset = new THREE.Vector3(-5.8, 2.8, 11);
const sunLightPosition = new THREE.Vector3(-70, 62, 44);
const sunTargetPosition = new THREE.Vector3(16, 0, 0);

let activePlanet = planets.earth;
let paused = false;
let world;
let astronautBody;
let astronautGroup;
let groundMesh;
let airStart = 0;
let airTimeSeconds = 0;
let distanceMeters = 0;
let jumping = false;
let landed = true;
let autoCamera = true;

await RAPIER.init();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(activePlanet.sky, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(activePlanet.sky, 900, 1800);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 4000);
camera.position.set(-6, 3.5, 9);
camera.lookAt(0, 1.1, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.minDistance = 4;
controls.maxDistance = Number.POSITIVE_INFINITY;
controls.target.set(0, 1, 0);
controls.addEventListener("start", () => {
  autoCamera = false;
});

const ambient = new THREE.HemisphereLight(0xeaf3ff, 0x31423a, 1.85);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff1bf, 4.8);
sun.position.copy(sunLightPosition);
sun.target.position.copy(sunTargetPosition);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 26;
sun.shadow.camera.bottom = -18;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 220;
sun.shadow.bias = -0.00025;
scene.add(sun);
scene.add(sun.target);

const sunVisual = createSunVisual();
scene.add(sunVisual);

const starField = createStarField();
scene.add(starField);

const groundMaterial = new THREE.MeshStandardMaterial({ color: activePlanet.ground, roughness: 0.86 });
const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x8e8b84, roughness: 0.92 });
const groundGeometry = new THREE.SphereGeometry(planetRadiusMeters, 128, 64);
groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.position.copy(planetCenter);
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const rockGroup = createRocks();
scene.add(rockGroup);

astronautGroup = createAstronaut();
scene.add(astronautGroup);

setupPhysics();
resetJump();
resizeRenderer();
requestAnimationFrame(render);

function setupPhysics() {
  world = new RAPIER.World({ x: 0, y: -activePlanet.gravity, z: 0 });
  world.integrationParameters.dt = 1 / 60;

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(planetCenter.x, planetCenter.y, planetCenter.z));
  world.createCollider(RAPIER.ColliderDesc.ball(planetRadiusMeters).setFriction(0.9), groundBody);

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(startPosition.x, startPosition.y, startPosition.z)
    .setLinearDamping(0)
    .setAngularDamping(5);
  astronautBody = world.createRigidBody(bodyDesc);
  astronautBody.setEnabledRotations(false, false, false, true);
  world.createCollider(RAPIER.ColliderDesc.capsule(0.46, 0.24).setFriction(0.75).setRestitution(0.02), astronautBody);
}

function resetPhysicsForPlanet() {
  setupPhysics();
}

function surfaceHeightAt(x, z) {
  const horizontalDistanceSquared = x * x + z * z;
  const radiusSquared = planetRadiusMeters * planetRadiusMeters;
  return planetCenter.y + Math.sqrt(Math.max(0, radiusSquared - horizontalDistanceSquared));
}

function standingHeightAt(x, z) {
  return surfaceHeightAt(x, z) + astronautSurfaceOffset;
}

function rockRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function createAstronaut() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.48 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x2f7ddd, roughness: 0.5 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x162238, roughness: 0.18, metalness: 0.35 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.35, 8, 16), white);
  torso.position.y = 0;
  torso.scale.set(1, 1.05, 0.74);
  group.add(torso);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 16), white);
  helmet.position.y = 0.55;
  group.add(helmet);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10), visor);
  face.position.set(0, 0.55, 0.22);
  face.scale.set(1, 0.55, 0.28);
  group.add(face);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.06), trim);
  chest.position.set(0, 0.08, 0.25);
  group.add(chest);

  addArm(group, white, -0.34, 0.15, 0.04, -0.55);
  addArm(group, white, 0.34, 0.15, 0.04, 0.55);
  addLeg(group, white, -0.13, -0.38, 0.02, -0.08);
  addLeg(group, white, 0.13, -0.38, 0.02, 0.08);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function addArm(group, material, x, y, z, angleZ) {
  const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 8, 12), material);
  limb.position.set(x, y, z);
  limb.rotation.z = angleZ;
  group.add(limb);
}

function addLeg(group, material, x, y, z, angleZ) {
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.48, 8, 12), material);
  leg.position.set(x, y, z);
  leg.rotation.z = angleZ;
  group.add(leg);

  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.22), material);
  boot.position.set(x + Math.sign(x) * 0.04, y - 0.22, z + 0.06);
  boot.rotation.z = angleZ * 0.7;
  group.add(boot);
}

function createRocks() {
  const group = new THREE.Group();
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockData = [];
  const globalRockCount = 1300;
  const localRockCount = 500;
  const playFieldRockCount = 500;
  const clearLaunchArea = 5.5;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < globalRockCount; index += 1) {
    const y = 1 - ((index + 0.5) / globalRockCount) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * goldenAngle + rockRandom(index + 3) * 0.65;
    const normal = new THREE.Vector3(Math.cos(angle) * ringRadius, y, Math.sin(angle) * ringRadius);
    addRockData(rockData, normal, index);
  }

  for (let index = 0; index < localRockCount; index += 1) {
    const distance = 8 + Math.sqrt(rockRandom(index + 211)) * 220;
    const angle = rockRandom(index + 223) * Math.PI * 2;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    if (Math.hypot(x, z) < clearLaunchArea) {
      continue;
    }
    const y = surfaceHeightAt(x, z);
    const normal = new THREE.Vector3(x, y - planetCenter.y, z).normalize();
    addRockData(rockData, normal, index + globalRockCount);
  }

  for (let index = 0; index < playFieldRockCount; index += 1) {
    const x = -28 + rockRandom(index + 401) * 210;
    const z = (rockRandom(index + 409) - 0.5) * 115;
    if (Math.hypot(x, z) < clearLaunchArea) {
      continue;
    }
    const y = surfaceHeightAt(x, z);
    const normal = new THREE.Vector3(x, y - planetCenter.y, z).normalize();
    addRockData(rockData, normal, index + globalRockCount + localRockCount);
  }

  const rockMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockData.length);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);

  rockData.forEach(({ normal, size, rotation, stretch, squat }, index) => {
    dummy.position.copy(planetCenter).addScaledVector(normal, planetRadiusMeters + size * 0.38);
    dummy.quaternion.setFromUnitVectors(up, normal);
    dummy.rotateY(rotation);
    dummy.rotateX(rotation * 0.25);
    dummy.scale.set(size * stretch, size * squat, size);
    dummy.updateMatrix();
    rockMesh.setMatrixAt(index, dummy.matrix);
  });

  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  rockMesh.instanceMatrix.needsUpdate = true;
  group.add(rockMesh);

  return group;
}

function addRockData(rockData, normal, seed) {
  const surfaceX = normal.x * planetRadiusMeters;
  const surfaceZ = normal.z * planetRadiusMeters;
  if (normal.y > 0.98 && Math.hypot(surfaceX, surfaceZ) < 5.5) {
    return;
  }
  const sizeNoise = rockRandom(seed + 19);
  const boulderBoost = rockRandom(seed + 43) > 0.92 ? 0.55 : 0;
  const size = 0.12 + Math.pow(sizeNoise, 1.8) * 0.78 + boulderBoost;
  const rotation = rockRandom(seed + 71) * Math.PI * 2;
  const stretch = 0.72 + rockRandom(seed + 101) * 1.25;
  const squat = 0.42 + rockRandom(seed + 131) * 0.5;
  rockData.push({ normal, size, rotation, stretch, squat });
}

function createSunVisual() {
  const group = new THREE.Group();
  group.position.copy(sunLightPosition);

  const sunDisk = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff0a8, fog: false })
  );
  group.add(sunDisk);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.22, depthWrite: false, fog: false })
  );
  group.add(glow);

  return group;
}

function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 220; i += 1) {
    positions.push((Math.random() - 0.5) * 95, Math.random() * 38 + 3, -Math.random() * 58 - 8);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.72 })
  );
}

function setPaused(nextPaused) {
  paused = nextPaused;
  pauseIcon.textContent = paused ? ">" : "II";
  pauseButton.setAttribute("aria-label", paused ? "Play simulation" : "Pause simulation");
  clock.getDelta();
}

function resetJump() {
  resetPhysicsForPlanet();
  jumping = false;
  landed = true;
  airStart = performance.now();
  airTimeSeconds = 0;
  distanceMeters = 0;
  jumpStartPosition.copy(startPosition);
  astronautBody.setTranslation(startPosition, true);
  astronautBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  astronautBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  syncAstronaut();
  updateReadout();
}

function startJump() {
  if (!landed) {
    return;
  }
  landed = false;
  jumping = true;
  autoCamera = true;
  airStart = performance.now();
  const currentPosition = astronautBody.translation();
  const launchPosition = {
    x: currentPosition.x,
    y: standingHeightAt(currentPosition.x, currentPosition.z),
    z: currentPosition.z,
  };
  jumpStartPosition.set(launchPosition.x, launchPosition.y, launchPosition.z);
  astronautBody.setTranslation(launchPosition, true);
  astronautBody.setLinvel(jumpVelocity, true);
  setPaused(false);
}

function switchPlanet(key) {
  activePlanet = planets[key];
  renderer.setClearColor(activePlanet.sky, 1);
  scene.fog.color.setHex(activePlanet.sky);
  groundMaterial.color.setHex(activePlanet.ground);
  rockMaterial.color.setHex(mixColor(activePlanet.ground, 0xffffff, 0.28));
  worldButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.planet === key));
  resetJump();
}

function mixColor(color, mixWith, amount) {
  const base = new THREE.Color(color);
  const target = new THREE.Color(mixWith);
  return base.lerp(target, amount).getHex();
}

function stepPhysics(dt) {
  if (paused) {
    return;
  }
  world.timestep = Math.min(dt, 1 / 30);
  world.step();
  syncAstronaut();

  if (jumping) {
    airTimeSeconds = (performance.now() - airStart) / 1000;
    distanceMeters = Math.max(0, astronautBody.translation().x - jumpStartPosition.x);
    const velocity = astronautBody.linvel();
    const translation = astronautBody.translation();
    const standingHeight = standingHeightAt(translation.x, translation.z);
    if (translation.y <= standingHeight + 0.03 && Math.abs(velocity.y) < 0.35 && airTimeSeconds > 0.18) {
      landed = true;
      jumping = false;
      astronautBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      astronautBody.setTranslation({ x: translation.x, y: standingHeight, z: 0 }, true);
    }
  }
}

function syncAstronaut() {
  const translation = astronautBody.translation();
  astronautGroup.position.set(translation.x, translation.y, translation.z);
  astronautGroup.rotation.z = jumping ? THREE.MathUtils.clamp(-astronautBody.linvel().y * 0.045, -0.42, 0.42) : 0;
}

function updateCamera(dt) {
  if (!autoCamera && !jumping) {
    controls.update();
    return;
  }

  const translation = astronautBody.translation();
  cameraTarget.set(translation.x + 1.2, Math.max(1.1, translation.y * 0.6 + 0.7), 0);
  cameraGoal.copy(cameraTarget).add(cameraOffset);
  camera.position.lerp(cameraGoal, 1 - Math.pow(0.003, dt));
  controls.target.lerp(cameraTarget, 1 - Math.pow(0.003, dt));
  controls.update();
}

function updateReadout() {
  planetName.textContent = activePlanet.name;
  gravityValue.textContent = `${activePlanet.gravity.toFixed(2)} m/s²`;
  airTime.textContent = `${airTimeSeconds.toFixed(1)} s`;
  distanceValue.textContent = `${(distanceMeters * feetPerMeter).toFixed(1)} ft`;
  missionAnswer.placeholder = `On ${activePlanet.name}, the astronaut...`;
}

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.05);
  stepPhysics(dt);
  updateCamera(dt);
  updateReadout();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

pauseButton.addEventListener("click", () => {
  setPaused(!paused);
});

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) {
    return;
  }
  const target = event.target;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    return;
  }
  event.preventDefault();
  startJump();
});

worldButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchPlanet(button.dataset.planet);
    button.blur();
    canvas.focus({ preventScroll: true });
  });
});

factCards.forEach((card) => {
  const title = card.querySelector(".card-title");
  title.addEventListener("click", () => {
    factCards.forEach((item) => item.classList.remove("is-open"));
    card.classList.add("is-open");
    card.classList.add("is-read");
    readCards.add(card.dataset.card);
    badgeCount.textContent = `${readCards.size}/${totalCards}`;
  });
});

saveLog.addEventListener("click", () => {
  const thought = missionAnswer.value.trim();
  if (!thought) {
    savedNote.textContent = "Try writing one thing you noticed.";
    return;
  }
  localStorage.setItem(storageKey, thought);
  savedNote.textContent = "Saved.";
});

window.addEventListener("resize", resizeRenderer);

const savedThought = localStorage.getItem(storageKey);
if (savedThought) {
  missionAnswer.value = savedThought;
}
