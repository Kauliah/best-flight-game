// Skylark Courier — everything the eye sees, built with Three.js.
// One consistent low-poly style: a blue sea, green islands with sand rims,
// one teal-and-cream prop plane, glowing rings, white clouds. The camera
// chases from behind and above and never fights the pilot: it follows the
// plane's heading with a soft lag and lets a mouse drag orbit it.

import { WORLD } from './config.js';

const THREE = window.THREE;

function colorForHeight(height, x, z) {
  // Sand at the waterline, grass on the slopes, rock on the peaks, with a
  // little seeded speckle so the ground is not one flat tint.
  const speckle = 0.92 + 0.08 * Math.abs(Math.sin(x * 0.35 + z * 0.21));
  if (height < 4) return [0.86 * speckle, 0.78 * speckle, 0.55 * speckle];
  if (height < 55) {
    const t = height / 55;
    return [
      (0.24 + 0.14 * t) * speckle,
      (0.55 - 0.08 * t) * speckle,
      (0.22 + 0.06 * t) * speckle,
    ];
  }
  return [0.48 * speckle, 0.46 * speckle, 0.44 * speckle];
}

function buildPlaneMesh() {
  const cream = new THREE.MeshPhongMaterial({ color: 0xf3e6c8, shininess: 30 });
  const teal = new THREE.MeshPhongMaterial({ color: 0x0f7a6e, shininess: 40 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x22303c, shininess: 60 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x9fd4e8, shininess: 120 });
  const group = new THREE.Group();

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.62, 6.4, 14), cream);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = 0.4;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.8, 14), teal);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.7;
  group.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), glass);
  canopy.scale.set(1, 0.75, 1.7);
  canopy.position.set(0, 0.95, -0.9);
  group.add(canopy);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.28, 5.6), teal);
  stripe.position.set(0, 0.12, 0.6);
  group.add(stripe);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.32, 2.7), teal);
  wing.position.set(0, -0.1, -0.4);
  group.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 2.7), cream);
  wingTipL.position.set(-7.1, -0.1, -0.4);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 7.1;
  group.add(wingTipR);

  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), teal);
  tailplane.position.set(0, 0.25, 3.4);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.1, 1.7), teal);
  fin.position.set(0, 1.05, 3.4);
  group.add(fin);

  const prop = new THREE.Group();
  prop.position.z = -4.7;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), dark);
  prop.add(hub);
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.8, 0.14), dark);
  prop.add(bladeA);
  const bladeB = bladeA.clone();
  bladeB.rotation.z = Math.PI / 2;
  prop.add(bladeB);
  group.add(prop);

  const gearMat = dark;
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), gearMat);
    strut.position.set(side * 1.1, -1.15, -0.6);
    group.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), gearMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.1, -1.7, -0.6);
    group.add(wheel);
  }

  const navRed = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4444 }),
  );
  navRed.position.set(-7.35, -0.1, -0.4);
  group.add(navRed);
  const navGreen = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ff88 }),
  );
  navGreen.position.set(7.35, -0.1, -0.4);
  group.add(navGreen);

  return { group, prop };
}

export function createRenderer(canvas, terrain, mission) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const skyColor = mission.storm ? 0x5d6f82 : 0x8ec8ee;
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.Fog(skyColor, 500, 4200);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 9000);
  camera.position.set(0, 60, 80);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.25);
  sun.position.set(800, 1200, 400);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x2e5d3a, 0.85));

  // Sea.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size * 2.4, WORLD.size * 2.4),
    new THREE.MeshPhongMaterial({ color: 0x1b6ea8, shininess: 80 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -1.5;
  scene.add(sea);

  // Islands: one displaced plane, coloured by height.
  const segments = 170;
  const groundGeo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, segments, segments);
  groundGeo.rotateX(-Math.PI / 2);
  const positions = groundGeo.attributes.position;
  const colours = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = terrain.groundHeight(x, z);
    // Open sea is seabed, sunk below the ocean plane so the water shows;
    // only the beach band and the islands rise above it.
    positions.setY(i, height < 1 ? -3 : height);
    const [r, g, b] = colorForHeight(Math.max(height, 1), x, z);
    colours[i * 3] = r;
    colours[i * 3 + 1] = g;
    colours[i * 3 + 2] = b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 5 }),
  );
  scene.add(ground);

  // Airstrips: dark tarmac, white centreline dashes and threshold bars.
  const tarmac = new THREE.MeshPhongMaterial({ color: 0x3b4048, shininess: 10 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xf2f2e8 });
  for (const runway of terrain.runways) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(runway.width, runway.length), tarmac);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = -runway.heading;
    strip.position.set(runway.x, runway.height + 0.35, runway.z);
    scene.add(strip);
    for (let d = -runway.length / 2 + 30; d < runway.length / 2 - 20; d += 40) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 18), paint);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -runway.heading;
      dash.position.set(
        runway.x + runway.alongX * d,
        runway.height + 0.45,
        runway.z + runway.alongZ * d,
      );
      scene.add(dash);
    }
    // Windsock at the strip's edge: an orange cone on a pole.
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 9, 8),
      new THREE.MeshPhongMaterial({ color: 0xdddddd }),
    );
    pole.position.set(
      runway.x - runway.alongZ * (runway.width / 2 + 14),
      runway.height + 4.5,
      runway.z + runway.alongX * (runway.width / 2 + 14),
    );
    scene.add(pole);
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 3.6, 10),
      new THREE.MeshPhongMaterial({ color: 0xff7a1a }),
    );
    sock.rotation.z = Math.PI / 2;
    sock.position.set(pole.position.x + 1.8, runway.height + 8.6, pole.position.z);
    scene.add(sock);
  }

  // Rings: the next one glows gold, passed ones green, the rest pale cyan.
  const ringMeshes = terrain.rings.map((ring) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(ring.radius, 1.7, 12, 42),
      new THREE.MeshPhongMaterial({
        color: 0x66d9e8,
        emissive: 0x1899aa,
        shininess: 60,
      }),
    );
    mesh.position.set(ring.x, ring.y, ring.z);
    mesh.rotation.y = Math.atan2(ring.x, ring.z);
    scene.add(mesh);
    // A small floating number board would need a font; the HUD names the ring.
    return mesh;
  });
  const ringLights = terrain.rings.map((ring) => {
    const light = new THREE.PointLight(0xffc233, 0, 260);
    light.position.set(ring.x, ring.y, ring.z);
    scene.add(light);
    return light;
  });

  // Clouds: clusters of white spheres, drifting with the wind.
  const cloudMat = new THREE.MeshPhongMaterial({
    color: mission.storm ? 0x8a97a5 : 0xffffff,
    shininess: 0,
    transparent: true,
    opacity: 0.92,
  });
  const cloudGroups = terrain.clouds.map((cloud) => {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(cloud.scale / 25);
    for (let i = 0; i < puffs; i += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(cloud.scale * 0.45, 10, 8), cloudMat);
      puff.position.set((i - puffs / 2) * cloud.scale * 0.55, (i % 2) * 4, (i % 3) * 6 - 6);
      puff.scale.y = 0.55;
      group.add(puff);
    }
    group.position.set(cloud.x, cloud.y, cloud.z);
    scene.add(group);
    return { group, cloud };
  });

  // Storm rain: a sheet of points that follows the plane, only in the courier.
  let rain = null;
  let rainPositions = null;
  if (mission.storm) {
    const count = 1600;
    rainPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 320;
      rainPositions[i * 3 + 1] = Math.random() * 120;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 320;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rain = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0xbcd2e8, size: 1.6, transparent: true, opacity: 0.7 }),
    );
    scene.add(rain);
  }

  const { group: plane, prop } = buildPlaneMesh();
  scene.add(plane);

  const cameraState = { x: 0, y: 60, z: 80 };

  function chaseTarget(state, cameraOrbit) {
    const orbit = cameraOrbit || 0;
    const camHeading = state.heading + orbit;
    const back = 21 + state.speed * 0.05;
    return {
      x: state.x - Math.sin(camHeading) * back,
      y: state.y + 6.5 + state.speed * 0.02,
      z: state.z + Math.cos(camHeading) * back,
    };
  }

  // Jump the camera straight behind the plane: screenshots and mission
  // starts open on the chase view instead of sweeping in from far away.
  function snap(state, cameraOrbit) {
    const target = chaseTarget(state, cameraOrbit);
    cameraState.x = target.x;
    cameraState.y = target.y;
    cameraState.z = target.z;
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function draw(state, cameraOrbit, dt, elapsed) {
    // The plane itself.
    plane.position.set(state.x, state.y, state.z);
    plane.rotation.order = 'YXZ';
    plane.rotation.y = -state.heading;
    plane.rotation.x = state.pitch;
    plane.rotation.z = -state.bank;
    prop.rotation.z -= dt * (4 + state.throttle * 42 + state.speed * 0.25);

    // Rings: gold for the next one, green once flown, cyan beyond.
    for (let i = 0; i < ringMeshes.length; i += 1) {
      const mesh = ringMeshes[i];
      if (mission.id !== 'rings') {
        mesh.visible = false;
        ringLights[i].intensity = 0;
        continue;
      }
      mesh.visible = true;
      const passed = i < state.ringsPassed;
      const next = i === state.ringsPassed;
      mesh.material.emissive.setHex(passed ? 0x1d7a2e : next ? 0xcc8a00 : 0x1899aa);
      mesh.material.color.setHex(passed ? 0x59c96e : next ? 0xffc233 : 0x66d9e8);
      mesh.rotation.z = elapsed * 0.25;
      ringLights[i].intensity = next ? 1.6 + Math.sin(elapsed * 5) * 0.7 : 0;
    }

    // Clouds drift with the mission wind.
    for (const { group, cloud } of cloudGroups) {
      group.position.x += (mission.wind.x + cloud.drift) * dt;
      group.position.z += mission.wind.z * dt;
      if (group.position.x > 2600) group.position.x = -2600;
      if (group.position.z > 2600) group.position.z = -2600;
    }

    if (rain) {
      rain.position.set(state.x, state.y - 20, state.z);
      const positions = rain.geometry.attributes.position;
      for (let i = 0; i < positions.count; i += 1) {
        let y = positions.getY(i) - dt * 90;
        if (y < 0) y = 120;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }

    // Chase camera: behind and above the tail, eased so it never snaps, with
    // a mouse-drag orbit around the plane for looking around.
    const desired = chaseTarget(state, cameraOrbit);
    const lag = 1 - Math.exp(-dt * 3.5);
    cameraState.x += (desired.x - cameraState.x) * lag;
    cameraState.y += (desired.y - cameraState.y) * lag;
    cameraState.z += (desired.z - cameraState.z) * lag;
    camera.position.set(cameraState.x, cameraState.y, cameraState.z);
    camera.lookAt(
      state.x + Math.sin(state.heading) * 18,
      state.y + 1.5,
      state.z - Math.cos(state.heading) * 18,
    );

    renderer.render(scene, camera);
  }

  return { resize, draw, snap, renderer, scene, camera };
}
