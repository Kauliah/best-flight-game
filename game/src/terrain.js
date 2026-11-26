// Skylark Courier — the archipelago: islands, airstrips and the ring course.
// Every height in the game comes from groundHeight(x, z), so the physics, the
// terrain mesh and the landing checks all agree about where the ground is.

import { createRandom } from './random.js';

const ISLAND_SPOTS = [
  { name: 'Skylark Field', x: -1000, z: 1000, radius: 380, peak: 55, strip: 0.0 },
  { name: 'Lagoon Isle', x: 100, z: 100, radius: 300, peak: 46, strip: null },
  { name: 'North Point', x: 350, z: -1450, radius: 420, peak: 92, strip: 0.45 },
  { name: 'East Reef', x: 1550, z: -350, radius: 320, peak: 68, strip: -0.55 },
  { name: 'Farlight Isle', x: 1750, z: 1550, radius: 380, peak: 112, strip: 0.9 },
  { name: 'West Cay', x: -1750, z: -650, radius: 280, peak: 58, strip: null },
  { name: 'South Holm', x: -250, z: 1850, radius: 340, peak: 78, strip: 0.2 },
];

function smoothFalloff(t) {
  // 1 at the centre, 0 at the edge, eased so the beach meets the sea gently.
  const clamped = Math.max(0, Math.min(1, t));
  const c = Math.cos((clamped * Math.PI) / 2);
  return c * c;
}

export function createTerrain(seed) {
  const random = createRandom(seed);
  const islands = ISLAND_SPOTS.map((spot) => ({
    name: spot.name,
    x: spot.x + random.range(-40, 40),
    z: spot.z + random.range(-40, 40),
    radius: spot.radius,
    peak: spot.peak,
    stripHeading: spot.strip,
    // Small seeded bumps so no two islands share a silhouette.
    bumps: [
      { dx: random.range(-0.4, 0.4), dz: random.range(-0.4, 0.4), amp: random.range(4, 12), scale: random.range(0.25, 0.45) },
      { dx: random.range(-0.5, 0.5), dz: random.range(-0.5, 0.5), amp: random.range(2, 6), scale: random.range(0.5, 0.7) },
    ],
  }));

  // One flattened strip per island that has one: the plateau the runway sits on.
  const runways = islands
    .filter((island) => island.stripHeading !== null)
    .map((island) => {
      const heading = island.stripHeading;
      const alongX = Math.sin(heading);
      const alongZ = -Math.cos(heading);
      return {
        name: island.name,
        island: island.name,
        x: island.x,
        z: island.z,
        heading,
        length: 340,
        width: 26,
        height: 14,
        alongX,
        alongZ,
      };
    });

  function islandHeight(island, x, z) {
    const dx = (x - island.x) / island.radius;
    const dz = (z - island.z) / island.radius;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= 1) return 0;
    let height = island.peak * smoothFalloff(dist);
    for (const bump of island.bumps) {
      const bx = dx - bump.dx;
      const bz = dz - bump.dz;
      const bd = Math.sqrt(bx * bx + bz * bz) / bump.scale;
      if (bd < 1) height += bump.amp * smoothFalloff(bd);
    }
    return height;
  }

  function stripBlend(runway, x, z) {
    const dx = x - runway.x;
    const dz = z - runway.z;
    const along = dx * runway.alongX + dz * runway.alongZ;
    const across = dx * runway.alongZ - dz * runway.alongX;
    const halfL = runway.length / 2 + 120;
    const halfW = runway.width / 2 + 120;
    if (Math.abs(along) > halfL || Math.abs(across) > halfW) return 0;
    const edge = Math.max(Math.abs(along) / halfL, Math.abs(across) / halfW);
    // A flat plateau over the strip itself, easing to the hillside beyond it,
    // so the tarmac a pilot aims at is genuinely level.
    if (edge < 0.6) return 1;
    return smoothFalloff((edge - 0.6) / 0.4);
  }

  function groundHeight(x, z) {
    let height = 0;
    for (const island of islands) height += islandHeight(island, x, z);
    for (const runway of runways) {
      const blend = stripBlend(runway, x, z);
      if (blend > 0) height = height * (1 - blend) + runway.height * blend;
    }
    return height;
  }

  // The strip a point sits over (within its tarmac), or null.
  function runwayAt(x, z) {
    for (const runway of runways) {
      const dx = x - runway.x;
      const dz = z - runway.z;
      const along = dx * runway.alongX + dz * runway.alongZ;
      const across = dx * runway.alongZ - dz * runway.alongX;
      if (Math.abs(along) <= runway.length / 2 && Math.abs(across) <= runway.width / 2) {
        return { runway, along, across };
      }
    }
    return null;
  }

  // The ring course: a loop out from Skylark Field, around Lagoon Isle and back.
  const courseWaypoints = [
    { x: -700, z: 500, y: 95 },
    { x: -200, z: -100, y: 120 },
    { x: 500, z: -500, y: 100 },
    { x: 900, z: -900, y: 140 },
    { x: 500, z: -1300, y: 110 },
    { x: -300, z: -900, y: 130 },
    { x: -900, z: -200, y: 90 },
    { x: -1100, z: 500, y: 105 },
  ];
  const rings = courseWaypoints.map((point, index) => ({
    index,
    x: point.x + random.range(-25, 25),
    z: point.z + random.range(-25, 25),
    y: point.y,
    radius: 20,
  }));

  // Cloud puffs drift slowly across the sky; the storm mission darkens them.
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({
      x: random.range(-2400, 2400),
      z: random.range(-2400, 2400),
      y: random.range(220, 380),
      scale: random.range(30, 70),
      drift: random.range(1.5, 4),
    });
  }

  const home = runways[0];
  return {
    islands,
    runways,
    rings,
    clouds,
    groundHeight,
    runwayAt,
    // Take-off pose: at the southern end of the home strip, facing down it.
    startPose() {
      const tail = home.length / 2 - 30;
      return {
        x: home.x - home.alongX * tail,
        z: home.z - home.alongZ * tail,
        y: home.height + 2.5,
        heading: home.heading,
      };
    },
    homeRunway: home,
  };
}
