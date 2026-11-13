# Design notes

Contested game-design and technical decisions. Each one can be revisited.

## Stage 1

- **The world moves toward the player.** The car always stays at `z = 0` and obstacles move toward it. That avoids float-precision problems on long runs and keeps collisions simple.
- **Oncoming cars.** In a pattern, `z` for `oncoming` is the meeting point with the player, not the spawn point. The actual distance is `patternD × (1 + v_car / v_player)`, so the car arrives exactly when the player reaches `z`. The pass validator in stage 2 can treat it as a static obstacle at `z`.
- **Swipes.** A swipe fires during the move once it covers 36 logical px at ≥ 0.35 px/ms (logical px = 720-wide frame). A single touch can chain different directions (left → up), but not the same one twice, so a long swipe never moves two lanes.
- **Double tap** is recognised on the second release, about 60–100 ms after the touch. That way it doesn't get confused with the start of a swipe.
- **Input buffer.** 150 ms over sim time. An action that isn't possible yet (jump in the air) is held and runs as soon as it becomes possible (on landing).
- **Light hit.** A side hit while changing lanes, or clipping the front corner with lateral overlap < 0.6 m. A centred front hit is a crash. Jumping up into the underside of an obstacle, e.g. out from under a sign, is also a crash.
- **Down in the air** slams the car down, and it ducks on landing. **Up while ducking** cancels the duck and jumps.
- **Boost.** 2.6 s at 4.4 m (truck roofs are at 3.2 m). Lane changes work during it; down does not. Then a smooth descent and 0.7 s of invulnerability after landing. If there is a truck underneath at that moment, the car lands on its roof.
- **Thrust meter.** Fills by itself in 30 s (`balance.thrust.chargeSec`). Coins will add charge from stage 3.
- **Drone.** When "near", it hovers above the car and slightly ahead, with its searchlight on the car. In the portrait camera behind the car, a drone placed behind would block the road. It stays near for 4 s.
- **Speed.** 15 → 32 m/s over 180 s, ease-out (`balance.speedCurve`).
- **Camera.** Keeps a 9:16 horizontal field of view on taller screens (up to 21:9) so all three lanes stay in frame.
- **Quitting to the menu from pause** sends `levelFail` because the run started with `levelStart`.
- **Garage.** The state machine has the state, but there is no button until stage 4. Shift (shield) does nothing until stage 3.
- **Debug.** `?debug=1` shows the overlay (fps, draw calls, triangles, quality level). The F key fills the thrust meter.
