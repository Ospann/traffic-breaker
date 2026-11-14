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
- **Breaker's look.** A low two-seat electric roadster: long nose with no grille, raked wraparound windshield, open cockpit with roll hoops, rear fender flares, thin headlights and a full-width taillight. Following the brief, it does not copy the body of any real car (including Tesla).
- **Wide screens (desktop).** The canvas fills the whole window. The camera keeps its vertical field of view and opens up horizontally, so you see more city on the sides. The UI stays a centred 9:16 column. Gameplay doesn't change: obstacles are still only on the 3 lanes.
- **Pixel budget.** The render is capped at 2.4M pixels (DPR drops on large monitors). On top of that, the governor lowers quality when fps falls.

## Stage 2

- **Ramp (tow truck).** A slope 7 m long rising to 3.2 m (truck roof height). If a truck stands right after it, the car drives onto the roof and keeps going along the chain. A roof "holds" the car 1.2 m beyond its edges, so gaps of up to about 2 m between trucks in a chain can be driven across. If there is no truck after the ramp, the car launches with an upward boost and glides at half gravity. You can change lanes in the air, and swiping down cancels the glide (that's the "controlled landing"). While on the ramp the car's nose is raised, so it doesn't catch the rear of the truck at the top.
- **Pass validator** (`src/game/patterns/validator.ts`). A search over the real `PlayerMotion` physics and `classifyHit` collisions, with no boost:
  - a decision every 0.1 s: nothing / left / right / up / down;
  - simulation step 1/120, the same as in the game;
  - a light hit counts as a failure: the path must be clean.
- **What exactly is checked:**
  - **Every pattern:** from each of the 3 lanes, at 15, 24 and 32 m/s.
  - **Every junction A→B:** for each start lane of A, at least one end state of A (including mid-air ones) must let B be passed.
  - **Speed during a check:** constant. In the game it grows, but by under 1% per pattern.
- **Authoring rules:**
  - an obstacle may not go past `length − 2 m`, so a junction never leans on the previous pattern's obstacles;
  - coins may not be inside solid obstacles (tested).
- **Generator** (`src/game/world/pattern-generator.ts`):
  - difficulty weights over time are in `balance.generator` and reach maximum by 200 s;
  - the last 4 patterns aren't repeated, so no back-to-back repeats are guaranteed;
  - after a difficulty-3 pattern there is always a pattern tagged `breather`;
  - the seed changes every run.
- **Oncoming cars in the validator** are simulated exactly as in the game (meeting point × (1 + v_car / v)).
- **Debug.** `?debug=1&pattern=<id>` loops one pattern; useful for testing ramps and roofs by hand.

## Stage 3

- **Coins.**
  - Come from pattern markup (lines, arcs, roof and air tracks); the whole field is one InstancedMesh with a pool of 320.
  - Each coin gives 10 points (× multiplier) and 2% thrust.
  - A streak counts coins with less than 1.2 s between them (the pitch of the coin sound will follow it in stage 5).
- **Bonuses on the track.**
  - They replace a random coin in a pattern's markup, so a bonus always stands where a coin is reachable.
  - The first one appears after ~260 m, then every 380–560 m.
  - Type weights: magnet 1.4, x2 1.2, super jump 1.0, full tank 0.8.
- **Full tank.**
  - Starts a long boost right away (6 s, up to 8 s with upgrades) and lays an air coin trail ahead along the lanes, switching lanes every ~30 m.
  - It also fills the thrust meter, so after landing you have one more ordinary boost ready. That's a choice: it can be changed to "empty meter after full tank".
- **Magnet.** Pulls coins from neighbouring lanes (±1.7 lanes) up to 22 m ahead, including coins in the air.
- **x2** doubles the score for distance and coins. It multiplies with the mission multiplier (stage 4).
- **Super jump.**
  - Jump height 4.6 m (trucks are 3.2), airtime 0.95 s: you can jump over a parked truck or land on its roof.
  - Physics switches only on the ground, so a jump that's already under way doesn't change its arc.
- **Shield.**
  - HUD button or Shift; lasts 12 s; absorbs one crash (including a second light hit while the drone is near).
  - After the save: 1.5 s of invulnerability, and the car passes through the obstacle.
  - Light hits don't consume the shield.
  - Until stage 4 the shield supply lives in memory (`App.inventory`); in debug the G key adds one.
- **Validator.** It still checks paths without bonuses, without boost and without the shield.
- **Debug keys:** 1 full tank, 2 magnet, 3 x2, 4 super jump.

## Stage 4

- **Missions** (`src/game/progression/missions.ts`):
  - 10 sets of 3 missions. After the 10th, the sets repeat with targets ×1.5, ×2, …
  - Two kinds: "in one run" (`run`) and "in total" (`total`), which accumulates across runs.
  - Progress and set completion are committed at the end of a run. During the run a toast shows when a mission is complete.
  - The multiplier rises by 1 for each completed set, capped at ×30, and takes effect from the next run.
  - "Jumped a barrier" means the car passed over a low or mid barrier while airborne. "Ducked under" means it passed under a sign or mid barrier while ducking. A ramp launch counts the moment the car leaves the ramp.
- **Economy** (`src/game/progression/economy.ts`, catalog in `catalog.ts`):
  - **Upgrades:** 5 kinds (boost charge plus the 4 bonuses), 5 levels each, prices 200 / 500 / 1000 / 2000 / 4000.
    - Boost charge: 30 → 15 s.
    - Full tank: 6 → 8 s.
    - Magnet, x2 and super jump: 10 → 20 s.
  - **Skins:**
    - neon colour: 6 options, 0–800;
    - body kit (stock / aero / blade / rally): 0–1200;
    - flame colour: 5 options, 0–700.
    - The neon tints the trim strips and the cruising exhaust; the flame tints the boost and jumps.
  - **Shields:** 350 coins each, stock up to 9.
  - A typical early run brings 20–100 coins, so the first upgrade comes after 2–5 runs. Worth checking against real play.
- **Save v3** (`src/game/save.ts`):
  - Fields: record, coins, shields, upgrades, skins, missions, multiplier, tutorialDone, plus the old fields (sound, language, run count).
  - Migration 2→3 keeps the old fields. It sets `tutorialDone` if the player has already played.
  - On load, `sanitizeSave` checks types and ranges: unknown skins are dropped, levels are clamped, a wrong language is reset.
- **Garage** — a separate state. The camera slowly circles the car, and every purchase or choice applies to the car straight away.
- **Debug:** the C key adds 1000 coins; G adds a shield (in a run it goes to the current session, outside a run it is saved).

## User decisions (after stage 4)

- **Thrusters run on compressed air instead of fire.** By the user's decision, the boost, jump, ramp and fast-drop thrusters let out white jets and vapour puffs (a separate particle system with normal blending). There is no fire. This replaces "огонь из сопел" and "цвет пламени" from the brief. The "Цвет струй" skin category only lightly tints the white jets (14%).
- **Car silhouette.** The body is now a smooth lofted surface instead of an extruded profile:
  - low nose with no grille, sculpted arches over the wheels, wider rear haunches;
  - a closed targa-style canopy with a dark roof panel;
  - slim headlights and a thin full-width taillight.
    The user asked for the car to look like a Tesla Roadster. The brief (`docs/TASK.md`, section 1) bans copying the body of real brands, especially Tesla, and an unlicensed recognisable silhouette risks rejection or takedown on the portals. So this is a generic modern electric roadster, with no badges and no exact copy of a specific model's lines. An exact copy needs a change to the brief by the user.

## Stage 5

- **"Continue?"**
  - Shown after the crash animation, at most 2 times per run.
  - A 6 s timer runs, paused while the ad plays.
  - If the rewarded ad isn't watched to the end or fails to load, a "not available" message appears and the timer gets 2.5 s added.
  - On continue: obstacles within the nearest 35 m are removed, the drone falls back, and the car gets 2.5 s of invulnerability on the ground of its current lane.
  - Coins, record and missions are written only after the final refusal. The platform gets `levelFail` once per run.
- **x2 coins** — once per run, on the results screen; adds the run's coins to the balance a second time.
- **"Start with shield + full boost"** — menu button. After the rewarded ad the run starts immediately: the shield is on for its full 12 s (the stock isn't touched) and the boost meter is full.
- **Interstitial.**
  - Shown only on the way from results to the menu, via `ads.showInterstitial()`: the AdsManager cooldown is respected, and nothing is shown before the first run finishes.
  - "Drive again" goes without an ad.
  - Quitting to the menu from pause also saves the run's result, with no ad.
- **Sound** (`src/game/audio/sfx.ts`): fully procedural in Web Audio, no files.
  - Electric motor: a sawtooth hum plus a whine, pitch follows speed.
  - Cold-gas jets: filtered noise (boost, jump, ramp), plus a continuous hiss during the boost.
  - Swipe: a noise "whoosh".
  - Coin: two tones, rising by a semitone per coin in the streak (up to +18).
  - Light hit and crash: a low thump plus crunch.
  - Bonuses: an arpeggio unique to each type.
  - Shield, mission, UI click.
  - Drone siren: square wave, two tones 700/960 Hz, while the drone is near.
  - Audio unlocks on the first tap/click/key, including iOS (`touchend`). MuteController suspends the context during ads, pause and when muted.
- **Localization.** All new strings are in en/ru/tr. A test checks that every mission, skin, upgrade and bonus has a key, and that the placeholders in ru/tr match en. `<html lang>` follows the active language.
