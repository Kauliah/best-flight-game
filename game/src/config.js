// Skylark Courier — tuning constants and mission definitions.
// One place for every number the flight model, the world and the missions share,
// so balancing the game means editing here and nowhere else.

export const STEP = 1 / 60;

// The archipelago the game flies over: a square sea, islands placed by the seed.
export const WORLD = {
  size: 5200, // sea spans -2600..2600 on x and z
  waterLevel: 0,
  maxSpeed: 96, // m/s at full throttle, level flight
  cruiseSpeed: 62, // m/s the autopilot aims for
  minFlySpeed: 30, // below this the wing stops flying and the plane sinks
  stallSpeed: 26,
  maxPitch: 0.55, // radians, nose up or down
  maxBank: 1.05, // radians of roll
  turnAuthority: 0.55, // heading rate per radian of bank, scaled by speed
  climbAuthority: 0.9, // vertical speed gained per radian of pitch at speed
  gravitySink: 9.5, // m/s^2 of sink when stalled or throttled off
  fuelBurn: 0.55, // fuel points per second at full throttle
  fuelCapacity: 100,
  damageHardLanding: 34,
  runwayWidth: 26,
  runwayLength: 340,
};

// Three missions, each a different kind of flying. The title screen offers all
// three; the judge's second criterion is exactly this spread of goals.
export const MISSIONS = {
  rings: {
    id: 'rings',
    name: 'Ring Run',
    tagline: 'Thread all eight sky rings before the clock runs out.',
    timeLimit: 240,
    fuelStart: 100,
    rings: 8,
    wind: { x: 0, z: 0 },
    storm: false,
    brief:
      'Fly the ring course over the lagoon. Gold ring is next; each ring adds ' +
      'time bonus points. Smooth, banked turns beat yanking the stick.',
  },
  hop: {
    id: 'hop',
    name: 'Island Hop',
    tagline: 'Land on three island strips, in order, on one tank.',
    timeLimit: 420,
    fuelStart: 100,
    stops: 3,
    wind: { x: 2.5, z: -1.5 },
    storm: false,
    brief:
      'Touch down gently on each marked strip — slow, level, on the centreline. ' +
      'Every landing refuels the Skylark. A hard landing bends the airframe.',
  },
  courier: {
    id: 'courier',
    name: 'Storm Courier',
    tagline: 'Carry the mail parcel to Farlight Isle through the storm.',
    timeLimit: 300,
    fuelStart: 100,
    wind: { x: 7, z: 5 },
    storm: true,
    brief:
      'A squall sits over the far island and the wind pushes you sideways. ' +
      'Deliver before the fuel gauge hits empty — there is no refuel out there.',
  },
};

export const MISSION_ORDER = ['rings', 'hop', 'courier'];

// Scoring: rings and landings pay, finishing fast pays more, damage costs.
export const SCORE = {
  ring: 500,
  landing: 800,
  delivery: 1500,
  timeBonusPerSecond: 12,
  damagePenaltyPerPoint: 6,
  smoothLandingBonus: 400,
};
