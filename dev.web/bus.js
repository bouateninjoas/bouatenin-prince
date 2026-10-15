import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const world = document.querySelector("#world");
const ui = {
  speed: document.querySelector("#speed-value"),
  speedFill: document.querySelector("#speed-track-fill"),
  gear: document.querySelector("#gear-label"),
  rpm: document.querySelector("#rpm-value"),
  engineLight: document.querySelector("#engine-light"),
  engineLabel: document.querySelector("#engine-label"),
  service: document.querySelector("#service-label"),
  mission: document.querySelector("#mission-text"),
  detail: document.querySelector("#mission-detail"),
  passengers: document.querySelector("#passenger-count"),
  eco: document.querySelector("#eco-score"),
  onTime: document.querySelector("#on-time"),
  distance: document.querySelector("#distance-label"),
  progress: document.querySelector("#route-progress"),
  stopCount: document.querySelector("#stop-count"),
  nextStop: document.querySelector("#next-stop"),
  arrival: document.querySelector("#arrival-time"),
  door: document.querySelector("#door-button"),
  toast: document.querySelector("#toast"),
};

const routeStops = [
  { name: "République", distance: 620, passengers: 9 },
  { name: "Hôtel de Ville", distance: 740, passengers: 12 },
  { name: "Marché Saint-Paul", distance: 680, passengers: 7 },
  { name: "Parc des Rives", distance: 790, passengers: 0 },
];

const state = {
  running: false,
  paused: false,
  speed: 0,
  x: 0,
  steering: 0,
  passengers: 0,
  eco: 100,
  stopIndex: 0,
  stopDistance: routeStops[0].distance,
  travelled: 0,
  cameraMode: 0,
  headlights: false,
  elapsed: 0,
  keys: new Set(),
  controls: { left: false, right: false, brake: false, accelerate: false },
};

let scene;
let camera;
let renderer;
let bus;
let wheels = [];
let roadMarks = [];
let scenery = [];
let traffic = [];
let stopMarker;
let headlightLights = [];
let toastTimer;
let previousFrame = performance.now();

function material(color, roughness = 0.78, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function addBox(parent, size, position, surface, castShadow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeBus() {
  const group = new THREE.Group();
  const ivory = material(0xe4e2cb, 0.48);
  const green = material(0x165b4d, 0.55);
  const glass = material(0x203d3b, 0.18, { metalness: 0.22 });
  const rubber = material(0x161c1a, 0.92);
  const lamp = material(0xffedbd, 0.25, { emissive: 0xffd876, emissiveIntensity: 1.2 });
  addBox(group, [2.35, 2.25, 8.1], [0, 1.8, 0.4], ivory, true);
  addBox(group, [2.37, 0.66, 8.15], [0, 0.85, 0.43], green, true);
  addBox(group, [2.17, 0.13, 7.96], [0, 2.8, 0.4], material(0xf0edda), true);
  addBox(group, [2.11, 0.76, 0.06], [0, 2.37, -3.73], glass);
  addBox(group, [2.1, 0.74, 0.06], [0, 2.35, 4.54], glass);
  for (const side of [-1, 1]) {
    for (let index = 0; index < 5; index += 1) {
      const pane = addBox(group, [0.045, 0.8, 1.05], [side * 1.19, 2.12, -2.65 + index * 1.45], glass);
      pane.material = glass;
    }
    addBox(group, [0.06, 1.75, 1.08], [side * 1.2, 1.76, 3.05], material(0xd0d2c0, 0.6));
    addBox(group, [0.065, 0.08, 1.12], [side * 1.22, 1.23, 3.04], material(0x31534b));
  }
  addBox(group, [1.55, 0.14, 0.08], [0, 3.02, -3.76], material(0x242d29));
  addBox(group, [0.42, 0.18, 0.07], [-0.69, 1.02, -3.79], lamp);
  addBox(group, [0.42, 0.18, 0.07], [0.69, 1.02, -3.79], lamp);
  for (const x of [-0.69, 0.69]) {
    const beam = new THREE.SpotLight(0xffe7b3, 0, 46, Math.PI / 7, 0.55, 1.2);
    beam.position.set(x, 1.15, -3.85);
    beam.target.position.set(x, 0.1, -22);
    group.add(beam, beam.target);
    headlightLights.push(beam);
  }
  addBox(group, [0.3, 0.16, 0.07], [-0.89, 0.92, 4.49], material(0xd85643, 0.4, { emissive: 0x34110c }));
  addBox(group, [0.3, 0.16, 0.07], [0.89, 0.92, 4.49], material(0xd85643, 0.4, { emissive: 0x34110c }));
  addBox(group, [0.54, 0.48, 0.12], [0, 2.07, -3.83], material(0x21392e));
  addBox(group, [0.46, 0.1, 0.06], [0, 2.12, -3.91], material(0xc8f36b, 0.3, { emissive: 0x344d13, emissiveIntensity: 0.5 }));
  for (const side of [-1, 1]) {
    for (const z of [-2.65, 0.8, 3.55]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.25, 20), rubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.18, 0.55, z);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.27, 16), material(0xa5aaa0, 0.35, { metalness: 0.65 }));
      hub.rotation.z = Math.PI / 2;
      hub.position.set(side * 1.2, 0.55, z);
      group.add(hub);
    }
  }
  group.position.set(0, 0, 7);
  scene.add(group);
  return group;
}

function makeTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 1.25 * scale, 7), material(0x69513a));
  trunk.position.y = 0.62 * scale;
  group.add(trunk);
  const colors = [0x627d52, 0x718858, 0x87945f];
  for (let index = 0; index < 3; index += 1) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry((0.8 - index * 0.08) * scale, 1), material(colors[index]));
    crown.position.set((index - 1) * 0.24 * scale, (1.65 + index * 0.38) * scale, (index % 2) * 0.18 * scale);
    crown.scale.y = 0.87;
    crown.castShadow = true;
    group.add(crown);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  scenery.push(group);
}

function makeBuilding(x, z, index) {
  const height = 6 + ((index * 7) % 15);
  const width = 4.5 + ((index * 3) % 4);
  const depth = 5 + ((index * 5) % 5);
  const colors = [0xb5a995, 0xc4bba7, 0x89958c, 0xd0c6b1, 0x9baca4];
  const building = new THREE.Group();
  addBox(building, [width, height, depth], [0, height / 2, 0], material(colors[index % colors.length], 0.9), false);
  for (let floor = 1; floor < Math.floor(height / 2.4); floor += 1) {
    for (let window = 0; window < 3; window += 1) {
      addBox(building, [0.66, 0.78, 0.045], [-width * 0.3 + window * width * 0.3, floor * 2.25 + 0.5, -depth / 2 - 0.03], material(0x59706b, 0.28, { metalness: 0.12 }));
    }
  }
  addBox(building, [width * 0.68, 0.35, 0.08], [0, 1.5, -depth / 2 - 0.08], material(index % 3 === 0 ? 0x9d5a42 : 0x526b5c));
  building.position.set(x, 0, z);
  scene.add(building);
  scenery.push(building);
}

function makeCar(color, x, z, oncoming = false) {
  const group = new THREE.Group();
  const bodyMaterial = material(color, 0.38, { metalness: 0.16 });
  const windowMaterial = material(0x253b3a, 0.2, { metalness: 0.18 });
  addBox(group, [1.78, 0.66, 3.5], [0, 0.68, 0], bodyMaterial, true);
  addBox(group, [1.34, 0.64, 1.68], [0, 1.25, 0.04], windowMaterial, true);
  addBox(group, [0.38, 0.17, 0.06], [-0.57, 0.68, -1.77], material(0xffe5a6, 0.24, { emissive: 0x8c631c }));
  addBox(group, [0.38, 0.17, 0.06], [0.57, 0.68, -1.77], material(0xffe5a6, 0.24, { emissive: 0x8c631c }));
  addBox(group, [0.3, 0.14, 0.06], [-0.58, 0.65, 1.77], material(0xb83b32));
  addBox(group, [0.3, 0.14, 0.06], [0.58, 0.65, 1.77], material(0xb83b32));
  if (oncoming) group.rotation.y = Math.PI;
  group.position.set(x, 0, z);
  scene.add(group);
  traffic.push({ group, oncoming, speed: 9 + Math.random() * 7, baseX: x, seed: Math.random() * 10 });
}

function makeBusStop() {
  const group = new THREE.Group();
  addBox(group, [0.08, 2.6, 0.08], [0, 1.3, 0], material(0x202d27));
  addBox(group, [0.62, 0.74, 0.1], [0, 2.22, 0], material(0xe3e4d4));
  addBox(group, [0.5, 0.56, 0.12], [0, 2.22, -0.07], material(0x165b4d));
  addBox(group, [0.03, 1.85, 0.06], [1.3, 0.94, 0], material(0x485c4a));
  addBox(group, [2.5, 0.08, 0.08], [1.2, 1.9, 0], material(0x485c4a));
  const roof = addBox(group, [2.65, 0.16, 1.25], [1.2, 2.03, 0], material(0x263b34));
  roof.castShadow = true;
  group.position.set(8.6, 0, 7 - state.stopDistance * 0.12);
  scene.add(group);
  return group;
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8d0d0);
  scene.fog = new THREE.Fog(0xb8d0d0, 100, 270);
  camera = new THREE.PerspectiveCamera(61, 1, 0.1, 400);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  world.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe7f0e3, 0x4d5845, 2.0));
  const sun = new THREE.DirectionalLight(0xffe0aa, 3.4);
  sun.position.set(-34, 52, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  scene.add(sun);

  const grass = addBox(scene, [500, 0.3, 500], [0, -0.22, -100], material(0x637757));
  grass.receiveShadow = true;
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(14, 500), material(0x424946, 0.96));
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0, -100);
  asphalt.receiveShadow = true;
  scene.add(asphalt);
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 500), material(0xb3afa0));
    curb.rotation.x = -Math.PI / 2;
    curb.position.set(side * 7.6, 0.015, -100);
    scene.add(curb);
    const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 500), material(0x888b7c));
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(side * 9.65, 0.02, -100);
    scene.add(sidewalk);
  }
  for (const x of [-4.65, 4.65]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 500), material(0xd7d2bd));
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.035, -100);
    scene.add(edge);
  }
  for (const x of [-2.3, 2.3]) {
    for (let z = -235; z < 25; z += 11) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 5.2), material(0xe3dfc9));
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x, 0.038, z);
      scene.add(mark);
      roadMarks.push(mark);
    }
  }
  for (let index = 0; index < 17; index += 1) {
    const z = -index * 15 - 8;
    makeBuilding(-12.5 - (index % 3) * 1.5, z, index);
    makeBuilding(12.5 + (index % 2) * 2, z - 7, index + 21);
    if (index % 2 === 0) {
      makeTree(-8.8, z - 3, 0.8 + (index % 3) * 0.1);
      makeTree(8.8, z - 10, 0.85);
    }
  }
  makeCar(0x557b75, -3.35, -43);
  makeCar(0xc27450, 3.35, -84, true);
  makeCar(0x71839a, -3.35, -126);
  makeCar(0xd1b95d, 3.35, -168, true);
  bus = makeBus();
  stopMarker = makeBusStop();
  resizeScene();
  window.addEventListener("resize", resizeScene);
}

function resizeScene() {
  if (!renderer) return;
  const width = world.clientWidth;
  const height = world.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function notify(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 2300);
}

function updateMission(title, detail) {
  ui.mission.textContent = title;
  ui.detail.textContent = detail;
}

function updateUI() {
  const speed = Math.round(state.speed);
  ui.speed.textContent = String(speed);
  ui.speedFill.style.width = `${Math.min(100, speed / 90 * 100)}%`;
  ui.gear.textContent = !state.running ? "P" : speed < 1 ? "N" : speed < 18 ? "1" : speed < 34 ? "2" : speed < 53 ? "3" : speed < 72 ? "4" : "5";
  ui.rpm.textContent = state.running ? (0.72 + state.speed / 38 + (state.controls.accelerate ? 0.35 : 0)).toFixed(1) : "0.0";
  ui.engineLight.classList.toggle("active", state.running);
  ui.engineLabel.textContent = state.running ? "MOTEUR EN MARCHE" : "MOTEUR COUPÉ";
  ui.service.textContent = state.running ? (state.paused ? "SERVICE EN PAUSE" : "SERVICE EN COURS") : "SERVICE À L’ARRÊT";
  ui.passengers.textContent = String(state.passengers);
  ui.eco.textContent = String(state.eco);
  ui.onTime.textContent = state.speed > 0 ? "+0" : "−1";
  const totalDistance = routeStops.reduce((sum, stop) => sum + stop.distance, 0);
  ui.distance.textContent = `${(Math.max(0, state.stopDistance) / 1000).toFixed(1).replace(".", ",")} KM`;
  ui.stopCount.textContent = `ARRÊT ${Math.min(state.stopIndex + 1, 4)} SUR 4`;
  ui.progress.style.width = `${Math.max(2, Math.min(100, (state.travelled / totalDistance) * 100))}%`;
  const stop = routeStops[state.stopIndex];
  ui.nextStop.textContent = stop ? stop.name : "Terminus";
  ui.arrival.textContent = `${Math.max(1, Math.ceil(state.stopDistance / Math.max(4, state.speed * 0.28) / 60))} min`;
  ui.door.disabled = !state.running || state.stopDistance > 28 || state.stopDistance < -14 || state.speed > 2 || state.paused;
  document.querySelector("#clock").textContent = `14:${String(32 + Math.floor(state.elapsed / 60)).padStart(2, "0")}`;
}

function startService() {
  if (state.stopIndex >= routeStops.length) resetService();
  state.running = true;
  state.paused = false;
  document.querySelector("#start-screen").hidden = true;
  document.querySelector("#pause-screen").hidden = true;
  updateMission("Rejoignez République", "Gardez une conduite souple en ville.");
  notify("Moteur démarré · Ligne 42 en service");
  updateUI();
}

function togglePause() {
  if (!state.running || state.stopIndex >= routeStops.length) return;
  state.paused = !state.paused;
  document.querySelector("#pause-screen").hidden = !state.paused;
  if (state.paused) state.speed = 0;
  updateUI();
}

function resetService() {
  state.running = false;
  state.paused = false;
  state.speed = 0;
  state.x = 0;
  state.steering = 0;
  state.passengers = 0;
  state.eco = 100;
  state.stopIndex = 0;
  state.stopDistance = routeStops[0].distance;
  state.travelled = 0;
  state.elapsed = 0;
  bus.position.x = 0;
  stopMarker.position.z = 7 - state.stopDistance * 0.12;
  document.querySelector("#finish-screen").hidden = true;
  document.querySelector("#start-screen").hidden = false;
  updateMission("Démarrez le moteur", "Prenez le service, ligne 42.");
  updateUI();
}

function boardPassengers() {
  if (ui.door.disabled) {
    notify(state.speed > 2 ? "Immobilisez le bus avant d’ouvrir les portes." : "Aucun arrêt à desservir pour le moment.");
    return;
  }
  const stop = routeStops[state.stopIndex];
  if (!stop) return;
  state.passengers = Math.min(48, state.passengers + stop.passengers);
  state.speed = 0;
  state.stopIndex += 1;
  if (state.stopIndex >= routeStops.length) {
    state.running = false;
    ui.service.textContent = "SERVICE TERMINÉ";
    document.querySelector("#finish-summary").textContent = `${state.passengers} voyageurs transportés · Éco-conduite ${state.eco} %`;
    document.querySelector("#finish-screen").hidden = false;
    notify("Terminus atteint · Service terminé");
  } else {
    state.stopDistance = routeStops[state.stopIndex].distance;
    stopMarker.position.z = 7 - state.stopDistance * 0.12;
    updateMission(`Départ vers ${routeStops[state.stopIndex].name}`, "Refermez les portes et repartez en douceur.");
    notify(`Arrêt desservi · +${stop.passengers} voyageurs`);
  }
  updateUI();
}

function setControl(name, active) {
  state.controls[name] = active;
  document.querySelector(`[data-control="${name}"]`)?.classList.toggle("pressed", active);
}

function attachControls() {
  document.querySelectorAll("[data-control]").forEach((button) => {
    const name = button.dataset.control;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setControl(name, true);
    });
    for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
      button.addEventListener(eventName, () => setControl(name, false));
    }
  });
  window.addEventListener("keydown", (event) => {
    const keys = { ArrowLeft: "left", a: "left", q: "left", ArrowRight: "right", d: "right", ArrowUp: "accelerate", w: "accelerate", z: "accelerate", ArrowDown: "brake", s: "brake" };
    const control = keys[event.key];
    if (control) {
      event.preventDefault();
      state.keys.add(event.key);
      setControl(control, true);
    }
    if (event.key.toLowerCase() === "e" && !event.repeat) boardPassengers();
    if (event.key.toLowerCase() === "c" && !event.repeat) toggleCamera();
    if (event.key.toLowerCase() === "p" && !event.repeat) togglePause();
    if (event.key === "Escape" && !event.repeat) togglePause();
  });
  window.addEventListener("keyup", (event) => {
    const keys = { ArrowLeft: "left", a: "left", q: "left", ArrowRight: "right", d: "right", ArrowUp: "accelerate", w: "accelerate", z: "accelerate", ArrowDown: "brake", s: "brake" };
    const control = keys[event.key];
    if (control) {
      state.keys.delete(event.key);
      const stillHeld = [...state.keys].some((key) => keys[key] === control);
      setControl(control, stillHeld);
    }
  });
  document.querySelector("#start-button").addEventListener("click", startService);
  document.querySelector("#pause-button").addEventListener("click", togglePause);
  document.querySelector("#resume-button").addEventListener("click", togglePause);
  document.querySelector("#camera-button").addEventListener("click", toggleCamera);
  document.querySelector("#door-button").addEventListener("click", boardPassengers);
  document.querySelector("#restart-button").addEventListener("click", resetService);
  document.querySelector("#light-button").addEventListener("click", (event) => {
    state.headlights = !state.headlights;
    headlightLights.forEach((light) => { light.intensity = state.headlights ? 3.5 : 0; });
    event.currentTarget.setAttribute("aria-pressed", String(state.headlights));
    event.currentTarget.title = state.headlights ? "Éteindre les phares" : "Allumer les phares";
    notify(state.headlights ? "Phares allumés" : "Phares éteints");
  });
  document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Déconnexion impossible.");
      window.location.assign("/");
    } catch {
      notify("Déconnexion impossible · Réessayez");
    }
  });
}

function toggleCamera() {
  state.cameraMode = (state.cameraMode + 1) % 2;
  notify(state.cameraMode ? "Caméra cabine" : "Caméra extérieure");
}

function updateDriving(delta) {
  if (!state.running || state.paused) return;
  state.elapsed += delta;
  const accelerating = state.controls.accelerate;
  const braking = state.controls.brake;
  if (accelerating) state.speed += 15 * delta;
  else state.speed -= 2.1 * delta;
  if (braking) state.speed -= 34 * delta;
  state.speed = THREE.MathUtils.clamp(state.speed, 0, 88);

  const steer = Number(state.controls.right) - Number(state.controls.left);
  state.steering = THREE.MathUtils.damp(state.steering, steer, 7, delta);
  state.x += state.steering * (0.65 + state.speed * 0.012) * delta;
  state.x = THREE.MathUtils.clamp(state.x, -5.3, 5.3);
  bus.position.x = THREE.MathUtils.damp(bus.position.x, state.x, 8, delta);
  bus.rotation.z = -state.steering * Math.min(0.055, state.speed * 0.0011);
  for (const wheel of wheels) wheel.rotation.x -= (state.speed / 3.6) * delta * 0.85;

  if (accelerating && state.speed > 55) state.eco = Math.max(62, state.eco - delta * 0.7);
  if (braking && state.speed > 38) state.eco = Math.max(62, state.eco - delta * 1.8);
  if (Math.abs(state.x) > 4.2) {
    state.speed = Math.max(0, state.speed - 12 * delta);
    state.eco = Math.max(50, state.eco - delta * 3);
  }

  const metres = (state.speed / 3.6) * delta;
  const movement = metres * 0.12;
  state.stopDistance -= metres;
  state.travelled += metres;
  stopMarker.position.z += movement;
  for (const mark of roadMarks) {
    mark.position.z += movement;
    if (mark.position.z > 18) mark.position.z -= 260;
  }
  for (const object of scenery) {
    object.position.z += movement;
    if (object.position.z > 24) object.position.z -= 260;
  }
  for (const car of traffic) {
    const relativeSpeed = car.oncoming ? state.speed / 3.6 + car.speed : state.speed / 3.6 - car.speed;
    car.group.position.z += relativeSpeed * delta * 0.12;
    if (car.group.position.z > 22) car.group.position.z -= 220;
    if (car.group.position.z < -205) car.group.position.z += 220;
    car.group.position.x = car.baseX + Math.sin(state.elapsed * 0.18 + car.seed) * 0.08;
  }

  if (state.stopDistance > 0 && state.stopDistance < 115) {
    updateMission(`Arrêt dans ${Math.ceil(state.stopDistance)} m`, "Ralentissez et immobilisez le bus à quai.");
    ui.door.disabled = !(state.stopDistance < 28 && state.speed < 2);
  } else if (state.stopDistance <= 0 && state.stopDistance > -14) {
    state.speed = Math.min(state.speed, 20);
    updateMission(state.speed < 2 ? "Arrêt à quai" : "Arrêt manqué", state.speed < 2 ? "Ouvrez les portes pour prendre les voyageurs." : "Freinez pour vous arrêter avant le prochain arrêt.");
  } else if (state.stopDistance <= -14) {
    state.stopIndex += 1;
    state.eco = Math.max(50, state.eco - 8);
    if (state.stopIndex >= routeStops.length) {
      state.running = false;
      ui.service.textContent = "SERVICE TERMINÉ";
      document.querySelector("#finish-summary").textContent = `${state.passengers} voyageurs transportés · Arrêt final manqué`;
      document.querySelector("#finish-screen").hidden = false;
      notify("Terminus dépassé · Service terminé");
    } else {
      state.stopDistance = routeStops[state.stopIndex].distance;
      stopMarker.position.z = 7 - state.stopDistance * 0.12;
      updateMission(`Arrêt manqué · ${routeStops[state.stopIndex].name}`, "Reprenez la ligne vers le prochain arrêt.");
      notify("Arrêt manqué · Poursuivez jusqu’au prochain quai");
    }
  }

  if (state.x > 4.2 && !state.paused) updateMission("Restez dans votre voie", "La chaussée se termine au bord du trottoir.");
  if (state.stopDistance >= -14 && state.stopDistance < 28 && state.speed < 2) updateMission("Arrêt à quai", "Ouvrez les portes pour prendre les voyageurs.");
  updateUI();
}

function updateCamera(delta) {
  if (state.cameraMode === 0) {
    camera.position.x = THREE.MathUtils.damp(camera.position.x, bus.position.x * 0.72, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 4.2, 3, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 23, 3, delta);
    camera.lookAt(bus.position.x * 0.35, 2, -13);
  } else {
    camera.position.set(bus.position.x, 3.05, 2.25);
    camera.lookAt(bus.position.x + state.steering * 0.7, 2.2, -23);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - previousFrame) / 1000, 0.04);
  previousFrame = now;
  updateDriving(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
}

try {
  setupScene();
  attachControls();
  updateUI();
  requestAnimationFrame(animate);
} catch (error) {
  world.textContent = "La scène 3D n’a pas pu démarrer. Vérifiez la connexion puis rechargez la page.";
  world.style.cssText = "display:grid;place-items:center;padding:32px;color:white;text-align:center;font:16px sans-serif";
  console.error("Initialisation du simulateur impossible :", error);
}