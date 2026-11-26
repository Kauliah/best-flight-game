# best-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Kauliah/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Kauliah/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Skylark Courier — a 3D flight game over a procedural island archipelago: thread sky rings, land on island airstrips, and deliver a parcel through a storm. Keyboard flight controls, a live HUD with airspeed, altitude, heading and an artificial horizon, and fuel and damage that turn every sortie into decisions.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network: the game is plain static files under `game/`.

## How to fly

- **↑ / ↓** pitch (up is stick forward, nose down) · **← / →** bank and turn
- **W / S** throttle up / down · **Space** brake · **P** pause · **M** sound
- Drag the mouse to look around from the chase camera.

## Missions

1. **Ring Run** — thread all eight sky rings before the clock runs out.
2. **Island Hop** — land on three island strips, in order, on one tank. Every landing refuels.
3. **Storm Courier** — carry the mail parcel to Farlight Isle through wind and rain before the fuel runs out.

Land gently — slow, level, on the centreline — or the airframe takes damage. A hard arrival or a hillside ends the flight.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1807xzra&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
